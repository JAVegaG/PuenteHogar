export interface IPaymentAuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface IPaymentAuditLogger {
  log(entry: IPaymentAuditLogEntry): void;
}
