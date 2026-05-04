/**
 * Soft delete utilities for Prisma queries.
 *
 * Since Prisma 6+ (prisma-client generator) does not support the `$use` middleware API,
 * soft delete is implemented as query helpers that repositories and services use
 * when constructing their queries.
 *
 * RAW tables (`UsersRaw`, `PortfolioRaw`, etc.) do NOT have a `deleted_at` column
 * and should never use these helpers — they use the `processed` flag instead.
 *
 * Behavior:
 * - `softDeleteFilter`: Returns `{ deleted_at: null }` to filter out soft-deleted records.
 *   Merge this into your `where` clause on read operations.
 *
 * - `softDeleteData`: Returns `{ deleted_at: new Date() }` to mark a record as deleted.
 *   Use this as the `data` payload when converting a delete to an update.
 *
 * Bypass:
 *   To include soft-deleted records in a query, simply do NOT include `softDeleteFilter`
 *   in the where clause (or explicitly pass `deleted_at: { not: null }` to find only deleted records).
 */

/**
 * Returns the where clause filter to exclude soft-deleted records.
 * Merge into your Prisma `where` object for read operations.
 *
 * @example
 * const users = await prisma.user.findMany({
 *   where: { ...softDeleteFilter, is_active: true },
 * });
 */
export const softDeleteFilter = { deleted_at: null } as const;

/**
 * Returns the data payload to soft-delete a record (set deleted_at to current timestamp).
 * Use with `update` or `updateMany` instead of `delete`/`deleteMany`.
 *
 * @example
 * // Instead of: await prisma.user.delete({ where: { id } })
 * await prisma.user.update({ where: { id }, data: softDeleteData() });
 */
export function softDeleteData(): { deleted_at: Date } {
    return { deleted_at: new Date() };
}

/**
 * Injects `deleted_at: null` into a where clause object if `deleted_at` is not already
 * explicitly set. Returns a new object (does not mutate the input).
 *
 * @param where - The existing where clause (may be undefined)
 * @returns A new where clause with `deleted_at: null` injected if not already present
 *
 * @example
 * const where = withSoftDeleteFilter({ is_active: true });
 * // => { is_active: true, deleted_at: null }
 *
 * const bypass = withSoftDeleteFilter({ deleted_at: { not: null } });
 * // => { deleted_at: { not: null } } — filter NOT injected (bypass)
 */
export function withSoftDeleteFilter<T extends Record<string, unknown>>(
    where?: T,
): T & { deleted_at: null } | T {
    if (!where) {
        return { deleted_at: null } as any;
    }
    if ('deleted_at' in where) {
        return where;
    }
    return { ...where, deleted_at: null } as any;
}
