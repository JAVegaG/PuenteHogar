/**
 * Shared text sanitization utilities for titles, descriptions, and names.
 *
 * These utilities ensure consistent text formatting across the platform:
 * - Trim leading/trailing whitespace
 * - Collapse multiple consecutive spaces into one
 * - Capitalize the first character of the text
 *
 * Usage:
 * - On INPUT: Apply via `@Transform` decorator in DTOs or via the ValidationInterceptor
 * - On OUTPUT: Apply via `sanitizeDisplayText()` when returning data from the DB (backward compatibility)
 *
 * This does NOT replace the XSS/SQL injection sanitization in ValidationInterceptor —
 * it complements it with formatting normalization.
 */

/**
 * Sanitizes and normalizes a text string:
 * - Trims whitespace
 * - Collapses multiple spaces
 * - Capitalizes the first character
 *
 * Returns null/undefined unchanged. Returns empty string if input is only whitespace.
 *
 * @example
 * sanitizeText('  hello world  ') → 'Hello world'
 * sanitizeText('apartamento en el centro') → 'Apartamento en el centro'
 * sanitizeText('CASA NORTE') → 'CASA NORTE' (already capitalized)
 * sanitizeText('') → ''
 * sanitizeText(null) → null
 */
export function sanitizeText(value: string | null | undefined): string | null | undefined {
    if (value === null) return null;
    if (value === undefined) return undefined;

    const trimmed = value.trim().replace(/\s+/g, ' ');

    if (trimmed.length === 0) return '';

    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Same as sanitizeText but returns a string (never null/undefined).
 * Use when the field is guaranteed to be a non-null string (e.g., required DTO fields).
 *
 * @example
 * sanitizeTextStrict('  hello world  ') → 'Hello world'
 */
export function sanitizeTextStrict(value: string): string {
    const result = sanitizeText(value);
    return result ?? '';
}

/**
 * Sanitizes a text field for display output (backward compatibility with old data).
 * Safe to call on any string — returns the original if already properly formatted.
 *
 * Use this in use cases or response mappers when reading from the database
 * to ensure old uncapitalized data is displayed correctly.
 *
 * @example
 * sanitizeDisplayText('apartamento en el centro') → 'Apartamento en el centro'
 * sanitizeDisplayText(null) → null
 */
export function sanitizeDisplayText(value: string | null | undefined): string | null | undefined {
    return sanitizeText(value);
}
