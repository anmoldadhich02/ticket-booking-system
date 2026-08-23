import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface SeatUpdatePayload {
  eventId: string;
  seatId: string;
  eventSeatId: string;
  seatNumber: string;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED' | 'OFFERED';
  heldByUserId?: string;
  expiresAt?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        const payload = this.jwtService.decode(token) as any;
        if (payload?.sub) {
          client.data.userId = payload.sub;
          client.data.role = payload.role;
          await client.join(`user:${payload.sub}`);
          if (payload.role === 'ADMIN') {
            await client.join('admin:dashboard');
          } else if (payload.role === 'ORGANISER') {
            await client.join(`organiser:${payload.sub}`);
          }
          this.logger.log(`Authenticated WS client connected: ${client.id} (User: ${payload.sub})`);
          return;
        }
      }
      this.logger.log(`Guest WS client connected: ${client.id}`);
    } catch (err: any) {
      this.logger.warn(`WS connection warning: ${err.message}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WS client disconnected: ${client.id}`);
  }

  @SubscribeMessage('event:join')
  async handleJoinEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ) {
    if (data?.eventId) {
      await client.join(`event:${data.eventId}`);
      return { status: 'OK', room: `event:${data.eventId}` };
    }
  }

  @SubscribeMessage('event:leave')
  async handleLeaveEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ) {
    if (data?.eventId) {
      await client.leave(`event:${data.eventId}`);
      return { status: 'OK' };
    }
  }

  // Domain broadcast helpers
  broadcastSeatHeld(payload: SeatUpdatePayload) {
    this.server.to(`event:${payload.eventId}`).emit('seat:held', payload);
  }

  broadcastSeatReleased(payload: SeatUpdatePayload) {
    this.server.to(`event:${payload.eventId}`).emit('seat:released', payload);
  }

  broadcastSeatBooked(payload: SeatUpdatePayload) {
    this.server.to(`event:${payload.eventId}`).emit('seat:booked', payload);
  }

  broadcastSeatOffered(payload: SeatUpdatePayload) {
    this.server.to(`event:${payload.eventId}`).emit('seat:offered', payload);
  }

  sendToUser(userId: string, event: string, payload: any) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  broadcastAdminStats(stats: any) {
    this.server.to('admin:dashboard').emit('admin:stats_updated', stats);
  }
}
