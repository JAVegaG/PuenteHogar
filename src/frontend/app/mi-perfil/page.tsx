'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@modules/users/components/ProtectedRoute';
import { useAuth } from '@modules/users/context/AuthContext';
import { authService } from '@shared/services/auth';
import { notificationService } from '@shared/services/notification';
import { Header } from '@shared/components/Header';
import { SideMenu } from '@shared/components/SideMenu';
import { Skeleton } from '@shared/components/Skeleton';
import { ErrorState } from '@shared/components/ErrorState';
import ProfileCard from '@modules/users/components/ProfileCard';
import RoleManagementSection from '@modules/users/components/RoleManagementSection';
import QuickNavSection from '@modules/users/components/QuickNavSection';
import type { UserProfile } from '@modules/users/types';

function translateRole(role: string): string {
  const map: Record<string, string> = {
    LANDLORD: 'Arrendador',
    TENANT: 'Arrendatario',
  };
  return map[role] || role;
}

function ProfilePageContent() {
  const { user, logout, updateAuth } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchProfile = useCallback(async () => {
    const token = user?.accessToken;
    if (!token) return;
    setIsLoadingProfile(true);
    setProfileError(false);
    try {
      const data = await authService.getProfile(token);
      setProfile(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('Sesión expirada')) {
        logout();
        return;
      }
      setProfileError(true);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user?.accessToken, logout]);

  useEffect(() => {
    if (!profile) {
      fetchProfile();
    }
  }, [fetchProfile, profile]);

  useEffect(() => {
    const token = user?.accessToken;
    if (!token) return;
    notificationService.getNotificationCount(token)
      .then((data) => setUnreadCount(data.unreadCount))
      .catch(() => { /* silently ignore — badge just won't show */ });
  }, [user?.accessToken]);

  const sideMenuUser = user
    ? { name: profile?.displayName ?? user.displayName, role: translateRole(user.roles[0]), roles: user.roles }
    : null;

  return (
    <>
      <Header
        title="Mi perfil"
        onMenuClick={() => setIsSideMenuOpen(true)}
      />
      {isSideMenuOpen && (
        <SideMenu
          isOpen={isSideMenuOpen}
          onClose={() => setIsSideMenuOpen(false)}
          user={sideMenuUser}
          onLogout={logout}
          unreadNotificationCount={unreadCount}
        />
      )}

      <main className="px-mobile-margin md:px-desktop-margin py-section-gap">
        {isLoadingProfile && (
          <div
            className="bg-white border border-[#d1d5db] rounded-[6px] p-6 flex flex-col items-center gap-4"
            role="status"
            aria-busy="true"
            aria-label="Cargando perfil"
          >
            <Skeleton className="w-[64px] h-[64px] rounded-full" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-[44px] w-36 mt-2" />
          </div>
        )}

        {!isLoadingProfile && profileError && (
          <ErrorState onRetry={fetchProfile} />
        )}

        {!isLoadingProfile && !profileError && profile && (
          <>
            <ProfileCard profile={profile} onLogout={logout} />
            {user && (
              <>
                <RoleManagementSection
                  roles={user.roles}
                  accessToken={user.accessToken}
                  updateAuth={updateAuth}
                />
                <QuickNavSection roles={user.roles} />
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfilePageContent />
    </ProtectedRoute>
  );
}
