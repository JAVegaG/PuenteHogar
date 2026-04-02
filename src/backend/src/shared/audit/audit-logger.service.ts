import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

export interface AuditEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

const PII_FIELDS = new Set([
  'password',
  'document_number',
  'phone_number',
  'hashed_password',
]);

function stripPII(metadata: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!PII_FIELDS.has(key)) {
      clean[key] = value;
    }
  }
  return clean;
}

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger(AuditLoggerService.name);

  log(entry: AuditEntry): void {
    const safeEntry: Record<string, unknown> = {
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      timestamp: entry.timestamp.toISOString(),
    };

    if (entry.resourceId !== undefined) {
      safeEntry['resourceId'] = entry.resourceId;
    }

    if (entry.metadata) {
      safeEntry['metadata'] = stripPII(entry.metadata);
    }

    this.logger.log(JSON.stringify(safeEntry));
  }

  logFailedLogin(entry: { userIdentifier: string; ip: string; timestamp: Date }): void {
    const anonymized = createHash('sha256')
      .update(entry.userIdentifier)
      .digest('hex')
      .substring(0, 8);

    this.logger.warn(
      JSON.stringify({
        action: 'FAILED_LOGIN',
        userIdentifier: anonymized,
        ip: entry.ip,
        timestamp: entry.timestamp.toISOString(),
      }),
    );
  }
}
