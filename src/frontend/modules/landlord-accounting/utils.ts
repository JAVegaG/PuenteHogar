import type { PeriodRequest, PeriodOption } from './types';

const PERIOD_MONTHS: Record<PeriodOption, number> = {
    '1m': 1,
    '3m': 3,
    '6m': 6,
    '12m': 12,
};

export function computePeriod(option: PeriodOption, now: Date = new Date()): PeriodRequest {
    const months = PERIOD_MONTHS[option];
    const target = new Date(now.getFullYear(), now.getMonth() - months, 1);
    return {
        year: target.getFullYear(),
        month: target.getMonth() + 1, // 1-indexed
    };
}
