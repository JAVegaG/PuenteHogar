/**
 * Bug Condition Exploration Test — Missing Scheduled Payment on Contract Signing
 *
 * This test encodes the EXPECTED (correct) behavior for bug #6.
 * On UNFIXED code, it will FAIL — confirming the bug exists.
 * After fixes are applied, it will PASS — confirming the bug is resolved.
 *
 * **Validates: Requirements 2.6**
 */
import { HandleSigningWebhookUseCase } from '../handle-signing-webhook.use-case';
import { ContractEntity } from '@modules/contracts/domain/entities/contract.entity';
import type { IContractRepository } from '@modules/contracts/domain/ports/contract-repository.port';
import type { INotificationPort } from '@modules/contracts/domain/ports/notification.port';
import type { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import type { SigningWebhookDto } from '../dtos/signing-webhook.dto';

describe('Bug Condition Exploration — Test 1g: HandleSigningWebhookUseCase schedules payment on COMPLETED', () => {
    it('should call IPaymentSchedulingPort.scheduleInitialPayment when webhook status is COMPLETED', async () => {
        /**
         * **Validates: Requirements 2.6**
         *
         * Bug: HandleSigningWebhookUseCase does NOT inject or call IPaymentSchedulingPort.
         * Expected: After a COMPLETED webhook, scheduleInitialPayment should be called
         * with the lease's monthly amount, currency 'COP', and contract startDate.
         */

        // Mock contract
        const mockContract = new ContractEntity(
            'contract-1',
            'lease-1',
            'SIGNATURE_PENDING',
            new Date('2025-03-01'),
            new Date('2026-03-01'),
            'https://example.com/contract.pdf',
            null,
            null,
        );

        // Mock repository
        const mockRepository: Partial<IContractRepository> = {
            findById: jest.fn().mockResolvedValue(mockContract),
            updateStatus: jest.fn().mockResolvedValue(mockContract),
            findContractParties: jest.fn().mockResolvedValue([
                { userId: 'landlord-1', roleInContract: 'LANDLORD' },
                { userId: 'tenant-1', roleInContract: 'TENANT' },
            ]),
            getLeaseMonthlyAmount: jest.fn().mockResolvedValue({ amount: 1200000, currency: 'COP' }),
        };

        // Mock notification port
        const mockNotificationPort: Partial<INotificationPort> = {
            notifyContractSigned: jest.fn().mockResolvedValue(undefined),
        };

        // Mock audit logger
        const mockAuditLogger = {
            log: jest.fn(),
        } as unknown as AuditLoggerService;

        // Mock payment scheduling port
        const mockPaymentSchedulingPort = {
            scheduleInitialPayment: jest.fn().mockResolvedValue(undefined),
        };

        // The use case constructor accepts: repository, notificationPort, paymentSchedulingPort, auditLogger
        const useCase = new HandleSigningWebhookUseCase(
            mockRepository as IContractRepository,
            mockNotificationPort as INotificationPort,
            mockPaymentSchedulingPort as any,
            mockAuditLogger,
        );

        const dto: SigningWebhookDto = {
            contractId: 'contract-1',
            externalSigningId: 'ext-signing-1',
            status: 'COMPLETED',
            completedAt: '2025-03-01T12:00:00.000Z',
        };

        await useCase.execute(dto);

        // Assert that scheduleInitialPayment was called
        expect(mockPaymentSchedulingPort.scheduleInitialPayment).toHaveBeenCalled();
        expect(mockPaymentSchedulingPort.scheduleInitialPayment).toHaveBeenCalledWith(
            'lease-1', // leaseId from contract
            expect.any(Number), // amount from lease lookup
            'COP', // currency
            expect.any(Date), // dueDate = contract.startDate
        );
    });
});
