'use client';

import type { UserProfile } from '../types';

function translateRole(role: string): string {
  const map: Record<string, string> = {
    LANDLORD: 'Arrendador',
    TENANT: 'Arrendatario',
  };
  return map[role] || role;
}

interface ProfileCardProps {
  profile: UserProfile;
  onLogout: () => void;
}

export default function ProfileCard({ profile, onLogout }: ProfileCardProps) {
  return (
    <div className="bg-white border border-[#d1d5db] rounded-[6px] p-6 flex flex-col items-center gap-4">
      {/* Avatar */}
      <div className="flex items-center justify-center w-[64px] h-[64px] rounded-full bg-[#f3f4f6]">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="text-neutral-600"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>

      {/* Email */}
      <p className="text-body text-neutral-900">{profile.mail}</p>

      {/* Roles */}
      <div className="flex flex-wrap gap-2 justify-center">
        {profile.roles.map((role) => (
          <span
            key={role}
            className="bg-[#f3f4f6] rounded-[4px] px-3 py-1 text-caption text-neutral-700"
          >
            {translateRole(role)}
          </span>
        ))}
      </div>

      {/* Status */}
      <p className="text-caption">
        Estado:{' '}
        <span className={profile.isActive ? 'text-green-600' : 'text-red-600'}>
          {profile.isActive ? 'Activo' : 'Inactivo'}
        </span>
      </p>

      {/* Logout button */}
      <button
        type="button"
        onClick={onLogout}
        className="mt-2 border border-neutral-300 text-neutral-900 rounded-card h-[44px] px-6 min-w-[44px] min-h-[44px] text-body hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
