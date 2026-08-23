import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiErrorResponse } from '../dto/api-response.dto';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected internal error occurred.';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        errorCode = this.statusToErrorCode(status);
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, any>;
        message = Array.isArray(obj.message) ? obj.message.join(', ') : obj.message || obj.error || message;
        errorCode = obj.code || this.statusToErrorCode(status);
        details = obj.details || (Array.isArray(obj.message) ? obj.message : undefined);
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      message = process.env.NODE_ENV === 'development' ? exception.message : message;
    }

    const errorPayload: ApiErrorResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        ...(details ? { details } : {}),
      },
    };

    response.status(status).json(errorPayload);
  }

  private statusToErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMIT_EXCEEDED';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
