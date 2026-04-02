import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

const SQL_PATTERNS = [
  /--/g,
  /\/\*/g,
  /\*\//g,
  /xp_/gi,
  /UNION\s+SELECT/gi,
  /DROP\s+TABLE/gi,
  /INSERT\s+INTO/gi,
  /DELETE\s+FROM/gi,
  /UPDATE\s+\w+\s+SET/gi,
];

const XSS_PATTERNS = [/<script\b[^>]*>/gi, /<\/script>/gi];

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    let sanitized = value;
    for (const pattern of XSS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }
    for (const pattern of SQL_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }
    return sanitized;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = sanitizeValue(val);
    }
    return result;
  }

  return value;
}

@Injectable()
export class ValidationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();

    if (request.body && typeof request.body === 'object') {
      request.body = sanitizeValue(request.body) as Record<string, unknown>;
    }

    return next.handle();
  }
}
