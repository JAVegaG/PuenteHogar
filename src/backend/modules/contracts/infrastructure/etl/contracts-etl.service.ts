import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@src/shared/prisma/prisma.service';

interface ContractPartyPayload {
  userId: string;
  roleInContract: string;
}

interface FilePayload {
  fileTypeId: string;
  fileStatusId: string;
  fileUrl: string;
}

interface SigningLogPayload {
  signingStatusId: string;
  platform?: string;
  data?: unknown;
}

interface SigningPayload {
  contractPartyIndex: number; // index into parties array
  signingStatusId: string;
  signingTimestamp?: string;
  documentHash?: string;
  logs?: SigningLogPayload[];
}

interface ContractsRawPayload {
  leaseId: string;
  contractStatusId: string;
  startDate: string;
  endDate?: string;
  parties: ContractPartyPayload[];
  files?: FilePayload[];
  signings?: SigningPayload[];
}

@Injectable()
export class ContractsEtlService {
  private readonly logger = new Logger(ContractsEtlService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processContractsRaw(): Promise<void> {
    const records = await this.prisma.contractsRaw.findMany({
      where: { processed: false },
      take: 100,
    });

    if (records.length === 0) return;

    this.logger.log(`ETL contracts: processing ${records.length} raw records`);

    for (const record of records) {
      try {
        const payload = record.payload as unknown as ContractsRawPayload;
        this.validatePayload(payload);

        await this.prisma.$transaction(async (tx) => {
          const contract = await tx.contract.create({
            data: {
              lease_id: payload.leaseId,
              contract_status_id: payload.contractStatusId,
              start_date: new Date(payload.startDate),
              end_date: payload.endDate ? new Date(payload.endDate) : undefined,
            },
          });

          const createdParties: { id: string }[] = [];
          for (const party of payload.parties) {
            const created = await tx.contractParty.create({
              data: {
                contract_id: contract.id,
                user_id: party.userId,
                role_in_contract: party.roleInContract,
              },
            });
            createdParties.push(created);
          }

          for (const file of payload.files ?? []) {
            await tx.file.create({
              data: {
                contract_id: contract.id,
                file_type_id: file.fileTypeId,
                file_status_id: file.fileStatusId,
                file_url: file.fileUrl,
              },
            });
          }

          for (const signing of payload.signings ?? []) {
            const party = createdParties[signing.contractPartyIndex];
            if (!party) continue;

            const createdSigning = await tx.signing.create({
              data: {
                contract_party_id: party.id,
                signing_status_id: signing.signingStatusId,
                signing_timestamp: signing.signingTimestamp ? new Date(signing.signingTimestamp) : undefined,
                document_hash: signing.documentHash,
              },
            });

            for (const log of signing.logs ?? []) {
              await tx.signingLog.create({
                data: {
                  signing_id: createdSigning.id,
                  signing_status_id: log.signingStatusId,
                  platform: log.platform,
                  data: log.data as any,
                },
              });
            }
          }

          await tx.contractsRaw.update({
            where: { id: record.id },
            data: { processed: true },
          });
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        this.logger.error(`ETL contracts: error on record ${record.id}: ${reason}`);
        await this.prisma.contractsRaw.update({
          where: { id: record.id },
          data: { processed: true },
        });
      }
    }

    this.logger.log(`ETL contracts: finished processing batch`);
  }

  private validatePayload(payload: ContractsRawPayload): void {
    if (!payload.leaseId) throw new Error('Missing field: leaseId');
    if (!payload.contractStatusId) throw new Error('Missing field: contractStatusId');
    if (!payload.startDate) throw new Error('Missing field: startDate');
    if (!payload.parties || payload.parties.length === 0) throw new Error('Missing field: parties');
  }
}
