import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { sanitizeText } from '@src/shared/text/sanitize-text.utils';

/**
 * Fields that should be capitalized on output for backward compatibility.
 * Ensures old data stored without capitalization is displayed properly.
 */
const CAPITALIZE_FIELDS = new Set([
    'title',
    'name',
    'description',
    'propertyName',
    'fullName',
    'firstName',
    'lastName',
    'preferredName',
    'businessName',
    'conditions',
    'unitName',
    'landlordName',
]);

function sanitizeResponseValue(value: unknown, key?: string): unknown {
    if (typeof value === 'string') {
        if (key && CAPITALIZE_FIELDS.has(key) && value.length > 0) {
            return sanitizeText(value) ?? value;
        }
        return value;
    }

    if (Array.isArray(value)) {
        return value.map((item) => sanitizeResponseValue(item));
    }

    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        const result: Record<string, unknown> = {};
        for (const [k, val] of Object.entries(value as Record<string, unknown>)) {
            result[k] = sanitizeResponseValue(val, k);
        }
        return result;
    }

    return value;
}

/**
 * Response interceptor that sanitizes text fields (title, name, description, etc.)
 * for backward compatibility with old data stored without proper capitalization.
 *
 * Applied globally in main.ts alongside the ValidationInterceptor.
 */
@Injectable()
export class TextSanitizeResponseInterceptor implements NestInterceptor {
    intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
        return next.handle().pipe(
            map((data) => sanitizeResponseValue(data)),
        );
    }
}
