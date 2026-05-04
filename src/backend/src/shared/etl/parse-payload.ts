/**
 * Parses a RAW table payload, handling both legacy stringified JSON
 * and proper JSON objects for backward compatibility during the
 * transition period.
 *
 * @param raw - The payload value from a RAW table record (may be a string or object)
 * @returns The parsed payload as type T
 */
export function parsePayload<T>(raw: unknown): T {
    if (typeof raw === 'string') {
        return JSON.parse(raw) as T;
    }
    return raw as T;
}
