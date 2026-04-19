'use client';

import type { PeriodOption, PeriodRequest } from '../types';
import { computePeriod } from '../utils';

interface PeriodFilterProps {
    selectedPeriod: PeriodOption;
    onPeriodChange: (period: PeriodRequest) => void;
}

const PERIOD_TABS: { key: PeriodOption; label: string }[] = [
    { key: '1m', label: 'Último mes' },
    { key: '3m', label: 'Últimos 3 meses' },
    { key: '6m', label: 'Últimos 6 meses' },
    { key: '12m', label: 'Último año' },
];

export function PeriodFilter({ selectedPeriod, onPeriodChange }: PeriodFilterProps) {
    const handleSelect = (option: PeriodOption) => {
        const period = computePeriod(option);
        onPeriodChange(period);
    };

    return (
        <div
            role="tablist"
            className="flex gap-[8px] overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
        >
            {PERIOD_TABS.map(({ key, label }) => {
                const isSelected = key === selectedPeriod;
                return (
                    <button
                        key={key}
                        role="tab"
                        aria-selected={isSelected}
                        onClick={() => handleSelect(key)}
                        className="text-caption font-medium whitespace-nowrap rounded-[6px] min-h-[44px] min-w-[44px] px-[16px] py-[10px] transition-colors shrink-0 cursor-pointer"
                        style={{
                            backgroundColor: isSelected ? '#1d4ed8' : '#f3f4f6',
                            color: isSelected ? '#ffffff' : '#4b5563',
                        }}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}
