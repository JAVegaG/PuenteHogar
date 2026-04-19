export interface PhotoFile {
    file: File;
    previewUrl: string;
}

export interface PublishFormData {
    title: string;
    description: string;
    price: string;
    photos: PhotoFile[];
}

export interface CreateListingRequest {
    portfolioUnitId: string;
    title: string;
    description?: string;
    price: number;
    currency: string;
}
