import {
    generateObjectKey,
    parseObjectKey,
    buildObjectUrl,
    validateBuffer,
    validateFilename,
} from './object-key.utils';
import { ObjectStorageValidationException } from './object-storage.exceptions';

describe('object-key.utils', () => {
    describe('generateObjectKey', () => {
        it('should produce a key matching {prefix}/{timestamp}-{uuid}-{filename}', () => {
            const key = generateObjectKey('listings', 'photo.jpg');
            const pattern =
                /^listings\/\d+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-photo\.jpg$/;
            expect(key).toMatch(pattern);
        });

        it('should generate unique keys on successive calls', () => {
            const a = generateObjectKey('contracts', 'doc.pdf');
            const b = generateObjectKey('contracts', 'doc.pdf');
            expect(a).not.toBe(b);
        });
    });

    describe('parseObjectKey', () => {
        it('should round-trip with generateObjectKey', () => {
            const key = generateObjectKey('listings', 'my-photo.png');
            const parsed = parseObjectKey(key);

            expect(parsed.prefix).toBe('listings');
            expect(parsed.filename).toBe('my-photo.png');
            expect(Number(parsed.timestamp)).toBeGreaterThan(0);
            expect(parsed.uuid).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
            );

            const reconstructed = `${parsed.prefix}/${parsed.timestamp}-${parsed.uuid}-${parsed.filename}`;
            expect(reconstructed).toBe(key);
        });
    });

    describe('buildObjectUrl', () => {
        it('should return the correct S3 URL format', () => {
            const url = buildObjectUrl('my-bucket', 'us-east-1', 'listings/123-uuid-file.jpg');
            expect(url).toBe(
                'https://my-bucket.s3.us-east-1.amazonaws.com/listings/123-uuid-file.jpg',
            );
        });
    });

    describe('validateBuffer', () => {
        it('should throw ObjectStorageValidationException for empty buffer', () => {
            expect(() => validateBuffer(Buffer.alloc(0), 'file.jpg')).toThrow(
                ObjectStorageValidationException,
            );
            expect(() => validateBuffer(Buffer.alloc(0), 'file.jpg')).toThrow(
                'El archivo está vacío',
            );
        });

        it('should not throw for non-empty buffer', () => {
            expect(() =>
                validateBuffer(Buffer.from('data'), 'file.jpg'),
            ).not.toThrow();
        });
    });

    describe('validateFilename', () => {
        it('should throw ObjectStorageValidationException for empty string', () => {
            expect(() => validateFilename('')).toThrow(
                ObjectStorageValidationException,
            );
            expect(() => validateFilename('')).toThrow(
                'El nombre de archivo es inválido',
            );
        });

        it('should throw for whitespace-only string', () => {
            expect(() => validateFilename('   ')).toThrow(
                ObjectStorageValidationException,
            );
            expect(() => validateFilename('\t\n')).toThrow(
                ObjectStorageValidationException,
            );
        });

        it('should not throw for valid filename', () => {
            expect(() => validateFilename('photo.jpg')).not.toThrow();
        });
    });
});
