import { parsePayload } from '../parse-payload';

describe('parsePayload', () => {
    it('returns the object as-is when input is already a JSON object', () => {
        const input = { name: 'test', value: 42, nested: { key: 'val' } };
        const result = parsePayload<typeof input>(input);
        expect(result).toBe(input);
    });

    it('parses a stringified JSON string into an object', () => {
        const original = { name: 'test', value: 42, nested: { key: 'val' } };
        const stringified = JSON.stringify(original);
        const result = parsePayload<typeof original>(stringified);
        expect(result).toEqual(original);
    });

    it('handles arrays stored as proper JSON', () => {
        const input = [1, 2, 3];
        const result = parsePayload<number[]>(input);
        expect(result).toBe(input);
    });

    it('handles arrays stored as stringified JSON', () => {
        const original = [1, 2, 3];
        const stringified = JSON.stringify(original);
        const result = parsePayload<number[]>(stringified);
        expect(result).toEqual(original);
    });

    it('handles null values as-is', () => {
        const result = parsePayload<null>(null);
        expect(result).toBeNull();
    });

    it('handles numeric values as-is', () => {
        const result = parsePayload<number>(123);
        expect(result).toBe(123);
    });

    it('handles boolean values as-is', () => {
        const result = parsePayload<boolean>(true);
        expect(result).toBe(true);
    });

    it('throws SyntaxError for invalid JSON strings', () => {
        expect(() => parsePayload<unknown>('not valid json')).toThrow(SyntaxError);
    });

    it('handles deeply nested objects stored as strings', () => {
        const original = {
            user: { name: 'John', roles: [{ id: '1', type: 'LANDLORD' }] },
            metadata: { createdAt: '2024-01-01' },
        };
        const stringified = JSON.stringify(original);
        const result = parsePayload<typeof original>(stringified);
        expect(result).toEqual(original);
    });

    it('handles empty object as-is', () => {
        const input = {};
        const result = parsePayload<Record<string, unknown>>(input);
        expect(result).toBe(input);
    });

    it('handles empty string JSON object', () => {
        const result = parsePayload<Record<string, unknown>>('{}');
        expect(result).toEqual({});
    });
});
