export interface IAuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface IAuditLogger {
  log(entry: IAuditLogEntry): void;
}
