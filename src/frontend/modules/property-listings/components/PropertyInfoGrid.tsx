interface PropertyInfoGridProps {
  rooms: number | null;
  bathrooms: number | null;
  area: number | null;
}

function InfoCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center bg-neutral-100 rounded-card p-3">
      {icon}
      <span className="text-body text-neutral-900 mt-1">{value}</span>
      <span className="text-small text-neutral-600">{label}</span>
    </div>
  );
}

export default function PropertyInfoGrid({
  rooms,
  bathrooms,
  area,
}: PropertyInfoGridProps) {
  return (
    <div className="grid grid-cols-3 gap-element-gap">
      <InfoCard
        icon={
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 14V8a2 2 0 012-2h14a2 2 0 012 2v6M3 14v4M3 14h18M21 14v4M2 14h20M7 10V9M17 10V9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
        value={rooms !== null ? String(rooms) : "-"}
        label="Habitaciones"
      />
      <InfoCard
        icon={
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 12h16a1 1 0 011 1v2a4 4 0 01-4 4H7a4 4 0 01-4-4v-2a1 1 0 011-1zM5 12V7a3 3 0 013-3h1a2 2 0 012 2v2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
        value={bathrooms !== null ? String(bathrooms) : "-"}
        label="Baños"
      />
      <InfoCard
        icon={
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 5v14M3 5h2M3 19h2M21 5v14M21 5h-2M21 19h-2M7 12h10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
        value={area != null ? `${area} m²` : "-"}
        label="Área"
      />
    </div>
  );
}
