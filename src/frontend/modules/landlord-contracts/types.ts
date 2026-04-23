export interface ContractFormData {
    // Step 1 — Tenant
    firstName: string;
    lastName: string;
    documentTypeCode: string;
    documentNumber: string;
    email: string;
    phoneNumber: string;
    // Step 2 — Terms
    startDate: string;
    endDate: string;
    monthlyRent: string;
    // Step 3 — Document
    file: File | null;
}

export interface ContractParty {
    userId: string;
    role: string;
}

export interface ContractSummary {
    id: string;
    leaseId: string;
    status: 'PENDING' | 'SIGNATURE_PENDING' | 'SIGNED';
    startDate: string;
    endDate: string | null;
    fileUrl: string;
    signedAt: string | null;
    externalSigningId: string | null;
    parties: ContractParty[];
}

export interface LandlordContractListItem {
    id: string;
    unitName: string;
    tenantName: string;
    status: 'PENDING' | 'SIGNATURE_PENDING' | 'SIGNED';
    startDate: string;
    endDate: string | null;
}
