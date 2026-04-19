export function validatePublishForm(data: {
    photos: unknown[];
    title: string;
    price: string;
}): Record<string, string> {
    const errors: Record<string, string> = {};
    if (data.photos.length < 3) errors.photos = 'Debes subir al menos 3 fotos';
    if (!data.title.trim()) errors.title = 'El título es obligatorio';
    const priceError = validatePublishPrice(data.price);
    if (priceError) errors.price = priceError;
    return errors;
}

export function validatePublishPrice(value: string): string | null {
    if (!value.trim()) return 'El canon de arrendamiento es obligatorio';
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return 'Ingresa un valor numérico válido';
    return null;
}
