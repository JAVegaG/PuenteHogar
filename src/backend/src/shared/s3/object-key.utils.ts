import crypto from 'crypto';
import { ObjectStorageValidationException } from './object-storage.exceptions';

/**
 * Genera un object key con formato: assets/{prefix}/{timestamp}-{uuid}-{filename}
 * The "assets/" prefix matches the CloudFront behavior pattern (/assets/*).
 */
export function generateObjectKey(prefix: string, filename: string): string {
    const timestamp = Date.now();
    const uuid = crypto.randomUUID();
    return `assets/${prefix}/${timestamp}-${uuid}-${filename}`;
}

/**
 * Parsea un object key en sus componentes.
 * Formato esperado: assets/{prefix}/{timestamp}-{uuid}-{filename}
 */
export function parseObjectKey(key: string): {
    prefix: string;
    timestamp: string;
    uuid: string;
    filename: string;
} {
    // Strip the "assets/" prefix if present
    const normalizedKey = key.startsWith('assets/') ? key.substring('assets/'.length) : key;

    const slashIndex = normalizedKey.indexOf('/');
    const prefix = normalizedKey.substring(0, slashIndex);
    const rest = normalizedKey.substring(slashIndex + 1);

    // rest = {timestamp}-{uuid}-{filename}
    // timestamp is digits, uuid is 36 chars (8-4-4-4-12), filename is the remainder
    const firstDash = rest.indexOf('-');
    const timestamp = rest.substring(0, firstDash);

    // UUID v4 is 36 characters: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const uuidStart = firstDash + 1;
    const uuid = rest.substring(uuidStart, uuidStart + 36);

    // filename starts after uuid + 1 dash separator
    const filename = rest.substring(uuidStart + 36 + 1);

    return { prefix, timestamp, uuid, filename };
}

/**
 * Construye la URL pública del objeto, usando el CDN si está configurado.
 * En producción/staging, devuelve una URL de CloudFront (key ya incluye "assets/" prefix).
 * En desarrollo local (sin CDN), devuelve la URL directa de S3.
 */
export function buildObjectUrl(
    bucket: string,
    region: string,
    key: string,
): string {
    const cdnDomain = process.env.CDN_DOMAIN;
    if (cdnDomain) {
        return `https://${cdnDomain}/${key}`;
    }
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Valida que el buffer no esté vacío.
 * @throws ObjectStorageValidationException si el buffer tiene longitud cero.
 */
export function validateBuffer(buffer: Buffer, filename: string): void {
    if (buffer.length === 0) {
        throw new ObjectStorageValidationException('El archivo está vacío');
    }
}

/**
 * Valida que el filename no esté vacío ni sea solo whitespace.
 * @throws ObjectStorageValidationException si el filename es inválido.
 */
export function validateFilename(filename: string): void {
    if (!filename || filename.trim().length === 0) {
        throw new ObjectStorageValidationException(
            'El nombre de archivo es inválido',
        );
    }
}
