export interface PaymentRequest {
  scheduledPaymentId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  tenantUserId: string;
}

export interface PaymentGatewayResult {
  externalTransactionId: string;
  status: 'APPROVED' | 'REJECTED' | 'PENDING';
  redirectUrl?: string;
}

export interface IPaymentGateway {
  initiatePayment(request: PaymentRequest): Promise<PaymentGatewayResult>;
}
