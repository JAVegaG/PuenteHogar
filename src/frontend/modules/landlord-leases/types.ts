export interface LeaseListItem {
    id: string;
    tenantName: string;
    startDate: string;
    endDate: string | null;
    monthlyAmount: number;
    status: string;
    contractId: string | null;
    contractStatus: 'PENDING' | 'SIGNATURE_PENDING' | 'SIGNED' | null;
}

export interface LeaseDetail {
    id: string;
    portfolioUnitId: string;
    userId: string;
    startDate: string;
    endDate: string | null;
    status: string;
    monthlyAmount: number;
    contractId: string | null;
    contractStatus: string | null;
    tenant: {
        fullName: string;
        documentTypeCode: string;
        documentNumber: string;
        email: string;
        phoneNumber: string;
    };
    property: {
        propertyType: string;
        numberOfRooms: number;
        numberOfBathrooms: number;
        area: number | null;
        address: string;
    };
}

export interface UnitInfo {
    id: string;
    name: string;
    propertyType: string;
    address: string;
    numberOfRooms: number;
    numberOfBathrooms: number;
    area: number | null;
}

export interface CreateLeaseRequest {
    tenantEmail: string;
    startDate: string;
    endDate?: string;
}
