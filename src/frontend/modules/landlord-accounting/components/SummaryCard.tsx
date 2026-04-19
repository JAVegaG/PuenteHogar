interface SummaryCardProps {
    label: string;
    value: string;
    valueColor?: string;
}

export function SummaryCard({ label, value, valueColor = '#111827' }: SummaryCardProps) {
    return (
        <div
            className="rounded-[6px] p-[16px]"
            style={{ border: '1px solid #d1d5db' }}
        >
            <p className="text-caption" style={{ color: '#4b5563' }}>
                {label}
            </p>
            <p className="text-h3 font-semibold mt-[4px]" style={{ color: valueColor }}>
                {value}
            </p>
        </div>
    );
}
