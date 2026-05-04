import { softDeleteFilter, softDeleteData, withSoftDeleteFilter } from './soft-delete.utils';

describe('Soft Delete Utilities', () => {
    describe('softDeleteFilter', () => {
        it('should be an object with deleted_at: null', () => {
            expect(softDeleteFilter).toEqual({ deleted_at: null });
        });

        it('should be usable in a where clause via spread', () => {
            const where = { id: '123', ...softDeleteFilter };
            expect(where).toEqual({ id: '123', deleted_at: null });
        });
    });

    describe('softDeleteData', () => {
        it('should return an object with deleted_at as a Date', () => {
            const before = new Date();
            const result = softDeleteData();
            const after = new Date();

            expect(result.deleted_at).toBeInstanceOf(Date);
            expect(result.deleted_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(result.deleted_at.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        it('should return a new Date each time it is called', () => {
            const first = softDeleteData();
            const second = softDeleteData();
            // They should be different object references
            expect(first).not.toBe(second);
        });
    });

    describe('withSoftDeleteFilter', () => {
        it('should inject deleted_at: null when where is undefined', () => {
            const result = withSoftDeleteFilter(undefined);
            expect(result).toEqual({ deleted_at: null });
        });

        it('should inject deleted_at: null when where does not contain deleted_at', () => {
            const result = withSoftDeleteFilter({ id: '123', is_active: true });
            expect(result).toEqual({ id: '123', is_active: true, deleted_at: null });
        });

        it('should NOT inject deleted_at when where already contains deleted_at: null', () => {
            const where = { id: '123', deleted_at: null };
            const result = withSoftDeleteFilter(where);
            expect(result).toEqual({ id: '123', deleted_at: null });
        });

        it('should NOT inject deleted_at when where contains deleted_at with a filter (bypass)', () => {
            const where = { id: '123', deleted_at: { not: null } };
            const result = withSoftDeleteFilter(where);
            expect(result).toEqual({ id: '123', deleted_at: { not: null } });
        });

        it('should NOT inject deleted_at when where contains deleted_at set to undefined (bypass)', () => {
            const where = { id: '123', deleted_at: undefined };
            const result = withSoftDeleteFilter(where);
            expect(result).toEqual({ id: '123', deleted_at: undefined });
        });

        it('should NOT inject deleted_at when where contains deleted_at set to a specific date (bypass)', () => {
            const specificDate = new Date('2024-01-01');
            const where = { deleted_at: specificDate };
            const result = withSoftDeleteFilter(where);
            expect(result).toEqual({ deleted_at: specificDate });
        });

        it('should not mutate the original where object', () => {
            const where = { id: '123', is_active: true };
            const original = { ...where };
            withSoftDeleteFilter(where);
            expect(where).toEqual(original);
        });

        it('should handle empty object by injecting deleted_at: null', () => {
            const result = withSoftDeleteFilter({});
            expect(result).toEqual({ deleted_at: null });
        });
    });
});
