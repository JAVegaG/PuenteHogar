'use client';

import { useState, useEffect, useCallback } from 'react';
import { roleService } from '@shared/services/role';
import { ConfirmationDialog } from '@shared/components/ConfirmationDialog';
import type { RemovableRole } from '@shared/services/role';

const ROLE_TRANSLATIONS: Record<string, string> = {
    LANDLORD: 'Arrendador',
    TENANT: 'Arrendatario',
};

const ALL_ROLES = ['LANDLORD', 'TENANT'] as const;

function translateRole(role: string): string {
    return ROLE_TRANSLATIONS[role] ?? role;
}

interface RoleManagementSectionProps {
    roles: string[];
    accessToken: string;
    updateAuth: (accessToken: string, roles: string[]) => void;
}

export default function RoleManagementSection({
    roles,
    accessToken,
    updateAuth,
}: RoleManagementSectionProps) {
    const [removableRoles, setRemovableRoles] = useState<RemovableRole[]>([]);
    const [isLoadingRemovable, setIsLoadingRemovable] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const [confirmDeleteRole, setConfirmDeleteRole] = useState<string | null>(null);

    const fetchRemovableRoles = useCallback(async () => {
        setIsLoadingRemovable(true);
        setError(null);
        try {
            const data = await roleService.getRemovableRoles(accessToken);
            setRemovableRoles(data);
        } catch {
            setError('No se pudo verificar la eliminabilidad de los roles.');
        } finally {
            setIsLoadingRemovable(false);
        }
    }, [accessToken]);

    useEffect(() => {
        fetchRemovableRoles();
    }, [fetchRemovableRoles]);

    const missingRole = ALL_ROLES.find((r) => !roles.includes(r)) ?? null;

    const handleAddRole = async () => {
        if (!missingRole) return;
        setIsAdding(true);
        setError(null);
        try {
            const result = await roleService.addRole(missingRole, accessToken);
            updateAuth(result.accessToken, result.roles);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error al agregar el rol.';
            setError(message);
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemoveRole = async () => {
        if (!confirmDeleteRole) return;
        setIsRemoving(true);
        setError(null);
        try {
            const result = await roleService.removeRole(confirmDeleteRole, accessToken);
            updateAuth(result.accessToken, result.roles);
            setConfirmDeleteRole(null);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error al eliminar el rol.';
            setError(message);
            setConfirmDeleteRole(null);
        } finally {
            setIsRemoving(false);
        }
    };

    const getRemovableInfo = (roleName: string): RemovableRole | undefined => {
        return removableRoles.find((r) => r.roleName === roleName);
    };

    return (
        <section aria-labelledby="role-management-title" className="mt-4">
            <h2
                id="role-management-title"
                className="text-h3 font-semibold text-neutral-900 mb-3"
            >
                Gestión de roles
            </h2>

            <div className="bg-white border border-[#d1d5db] rounded-[6px] p-4 flex flex-col gap-4">
                {/* Current roles */}
                <div className="flex flex-col gap-3">
                    {roles.map((role) => {
                        const info = getRemovableInfo(role);
                        const canRemove = info?.removable === true;
                        const reasons = info?.reasons ?? [];
                        const isDisabled = !canRemove || isLoadingRemovable;

                        return (
                            <div
                                key={role}
                                className="flex items-center justify-between gap-2 flex-wrap"
                            >
                                <span className="bg-[#f3f4f6] rounded-[4px] px-3 py-1 text-caption text-neutral-700">
                                    {translateRole(role)}
                                </span>

                                <div className="relative group">
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDeleteRole(role)}
                                        disabled={isDisabled}
                                        aria-label={`Eliminar rol ${translateRole(role)}`}
                                        className="min-h-[44px] min-w-[44px] px-3 rounded-[6px] border border-red-300 text-caption text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Eliminar rol
                                    </button>

                                    {isDisabled && reasons.length > 0 && (
                                        <div
                                            role="tooltip"
                                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[260px] bg-neutral-800 text-white text-small rounded-[6px] px-3 py-2 opacity-0 pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10"
                                        >
                                            <p className="font-medium mb-1">No se puede eliminar:</p>
                                            <ul className="list-disc list-inside">
                                                {reasons.map((reason) => (
                                                    <li key={reason}>{reason}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Add role button */}
                {roles.length === 1 && missingRole && (
                    <button
                        type="button"
                        onClick={handleAddRole}
                        disabled={isAdding}
                        aria-busy={isAdding}
                        className="min-h-[44px] min-w-[44px] w-full rounded-[6px] bg-primary text-white text-body hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {isAdding && (
                            <svg
                                className="animate-spin h-[18px] w-[18px]"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                            </svg>
                        )}
                        Agregar rol de {translateRole(missingRole).toLowerCase()}
                    </button>
                )}

                {/* Error message */}
                {error && (
                    <p className="text-caption text-red-600" role="alert">
                        {error}
                    </p>
                )}
            </div>

            {/* Confirmation dialog */}
            <ConfirmationDialog
                isOpen={confirmDeleteRole !== null}
                title="Eliminar rol"
                message={`¿Estás seguro de que deseas eliminar el rol de ${confirmDeleteRole ? translateRole(confirmDeleteRole).toLowerCase() : ''}? Esta acción se puede revertir agregando el rol nuevamente.`}
                confirmLabel="Eliminar"
                onConfirm={handleRemoveRole}
                onCancel={() => setConfirmDeleteRole(null)}
                isLoading={isRemoving}
            />
        </section>
    );
}
