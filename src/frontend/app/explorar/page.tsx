'use client';

import { lazy, Suspense, useState } from 'react';
import ActionBar from '@modules/property-listings/components/ActionBar';
import ListingGrid from '@modules/property-listings/components/ListingGrid';
import { ListingGridSkeleton } from '@/shared/components/ListingGridSkeleton';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Pagination } from '@/shared/components/Pagination';
import { Header } from '@/shared/components/Header';
import { useFilters } from '@modules/property-listings/hooks/useFilters';
import { useListings } from '@modules/property-listings/hooks/useListings';
import { useAuth } from '@modules/users/context/AuthContext';

const SideMenu = lazy(() =>
  import('@/shared/components/SideMenu').then((m) => ({ default: m.SideMenu }))
);

function translateRole(role: string): string {
  const map: Record<string, string> = {
    LANDLORD: 'Arrendador',
    TENANT: 'Arrendatario',
  };
  return map[role] || role;
}

function ExploreContent() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { filters, setFilters, clearFilters, setSort, setPage, setPageSize } = useFilters();
  const { data, isLoading, error, retry } = useListings(filters);
  const { user, logout } = useAuth();

  const sideMenuUser = user
    ? { name: user.displayName, role: translateRole(user.roles[0]) }
    : null;

  const currentSort = {
    sortBy: filters.sortBy ?? 'date',
    sortOrder: filters.sortOrder ?? 'desc',
  };

  return (
    <>
      <Header title="Explorar inmuebles" onMenuClick={() => setMenuOpen(true)} />

      <Suspense fallback={null}>
        {menuOpen && (
          <SideMenu
            isOpen={menuOpen}
            onClose={() => setMenuOpen(false)}
            user={sideMenuUser}
            onLogout={user ? logout : undefined}
          />
        )}
      </Suspense>

      <ActionBar
        currentFilters={filters}
        currentSort={currentSort}
        onApplyFilters={setFilters}
        onClearFilters={clearFilters}
        onApplySort={setSort}
      />

      <section
        className="px-mobile-margin md:px-desktop-margin py-section-gap"
        aria-live="polite"
        aria-busy={isLoading}
      >
        {isLoading ? (
          <ListingGridSkeleton />
        ) : error ? (
          <ErrorState onRetry={retry} />
        ) : data && data.data.length === 0 ? (
          <EmptyState />
        ) : data ? (
          <>
            <ListingGrid listings={data.data} />
            <div className="mt-section-gap">
              <Pagination
                total={data.total}
                page={data.page}
                pageSize={data.pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </>
        ) : null}
      </section>
    </>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <>
        <Header title="Explorar inmuebles" onMenuClick={() => {}} />
        <div className="px-mobile-margin md:px-desktop-margin py-section-gap">
          <ListingGridSkeleton />
        </div>
      </>
    }>
      <ExploreContent />
    </Suspense>
  );
}
