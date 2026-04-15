export interface INotificationAuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface INotificationAuditLogger {
  log(entry: INotificationAuditLogEntry): void;
}
