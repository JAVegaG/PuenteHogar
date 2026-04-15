import { Inject, Injectable } from '@nestjs/common';
import type { IPaymentRepository } from '@modules/payments/domain/ports/payment-repository.port';
import { PaymentResponseDto } from '@modules/payments/application/dtos/payment-response.dto';
import { PAYMENT_REPOSITORY } from '@modules/payments/application/use-cases/initiate-payment.use-case';

@Injectable()
export class GetPaymentHistoryUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly repository: IPaymentRepository,
  ) {}

  async execute(userId: string): Promise<PaymentResponseDto[]> {
    const history = await this.repository.getPaymentHistoryForUser(userId);

    const dtos: PaymentResponseDto[] = history.map(({ scheduledPayment, payment }) => {
      const dto = new PaymentResponseDto();
      dto.id = scheduledPayment.id;
      dto.scheduledPaymentId = scheduledPayment.id;
      dto.amount = scheduledPayment.amount;
      dto.currency = scheduledPayment.currency;
      dto.status = scheduledPayment.status;
      dto.dueDate = scheduledPayment.dueDate;
      dto.paymentDesc = payment?.paymentDesc ?? null;
      dto.createdAt = payment?.createdAt ?? null;
      return dto;
    });

    // Order by dueDate descending
    dtos.sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());

    return dtos;
  }
}
