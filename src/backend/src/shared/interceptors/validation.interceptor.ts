import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { sanitizeTextStrict } from '@src/shared/text/sanitize-text.utils';

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

/**
 * Fields that should be capitalized (first char uppercase) on input.
 * These are user-facing text fields for titles, names, and descriptions.
 */
const CAPITALIZE_FIELDS = new Set([
  'title',
  'name',
  'description',
  'fullName',
  'firstName',
  'lastName',
  'preferredName',
  'businessName',
  'conditions',
]);

function sanitizeValue(value: unknown, key?: string): unknown {
  if (typeof value === 'string') {
    let sanitized = value;
    for (const pattern of XSS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }
    for (const pattern of SQL_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }
    // Apply capitalization to title/description/name fields
    if (key && CAPITALIZE_FIELDS.has(key) && sanitized.length > 0) {
      sanitized = sanitizeTextStrict(sanitized);
    }
    return sanitized;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(value as Record<string, unknown>)) {
      result[k] = sanitizeValue(val, k);
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
