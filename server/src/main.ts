import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

// Lightweight cookie parser middleware
function customCookieParser(req: Request, res: Response, next: NextFunction) {
  const cookieHeader = req.headers.cookie;
  (req as any).cookies = {};
  if (cookieHeader) {
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const [key, value] = pair.trim().split('=');
      if (key && value) {
        (req as any).cookies[key] = decodeURIComponent(value);
      }
    }
  }
  next();
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');

  // Enable CORS
  app.enableCors({
    origin: [corsOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Attach Cookie Parser
  app.use(customCookieParser);

  // Global Prefix
  app.setGlobalPrefix('api');

  // Strict Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Enable Graceful Shutdown Hooks
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`Ticket Booking API server is running on http://localhost:${port}/api`);
}

bootstrap();
