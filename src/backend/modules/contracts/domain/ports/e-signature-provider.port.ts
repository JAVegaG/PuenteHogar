export interface SigningRequest {
  contractId: string;
  documentUrl: string;
  parties: { userId: string; role: string; email?: string }[];
}

export interface SigningResult {
  externalId: string;
  status: 'INITIATED' | 'COMPLETED' | 'FAILED';
  documentHash?: string;
  completedAt?: Date;
}

export interface IESignatureProvider {
  initiateSigningSession(request: SigningRequest): Promise<SigningResult>;
}
