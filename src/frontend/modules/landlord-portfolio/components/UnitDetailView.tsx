'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/shared/utils/formatPrice';
import { ConfirmationDialog } from '@/shared/components/ConfirmationDialog';
import { portfolioService } from '@/shared/services/portfolio';
import type { PortfolioUnit } from '../types';

interface UnitDetailViewProps {
  unit: PortfolioUnit;
  token: string;
  onDelete?: () => void;
}

function formatSpanishDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function UnitDetailView({ unit, token, onDelete }: UnitDetailViewProps) {
  const router = useRouter();
  const hasConditions = unit.conditions !== null && unit.conditions.trim() !== '';
  const formattedPrice = formatPrice(unit.leaseBaseAmount);
  const hasActiveListing = unit.hasActiveListing ?? false;
  const unitStatus = unit.unitStatus ?? 'Disponible';
  const portfolioId = unit.portfolioId;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteClick = () => {
    setDeleteError(null);
    setIsDialogOpen(true);
  };

  const handleCancelDelete = () => {
    setIsDialogOpen(false);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await portfolioService.deleteUnit(portfolioId, unit.id, token);
      setIsDialogOpen(false);
      onDelete?.();
      router.push(`/mi-portafolio/${portfolioId}/unidades`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setIsDialogOpen(false);
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <section aria-label="Canon base de arrendamiento">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h2 className="text-[24px] font-bold text-[#1d4ed8]">
            {formattedPrice}/mes
          </h2>
          <span className="bg-[#f3f4f6] rounded-[4px] px-2 py-0.5 text-caption text-[#4b5563]">
            {unit.leaseBaseCurrency}
          </span>
        </div>
      </section>

      <section aria-label="Condiciones del arrendamiento" className="mt-6">
        <h3 className="text-h3 font-semibold">Condiciones</h3>
        {hasConditions ? (
          <p className="text-body text-[#4b5563] mt-2">{unit.conditions}</p>
        ) : (
          <p className="text-body text-[#4b5563] mt-2">Sin condiciones especiales</p>
        )}
      </section>

      <section aria-label="Información de la unidad" className="mt-6">
        <h3 className="text-h3 font-semibold">Información</h3>
        <dl className="mt-2 space-y-1 text-body text-[#4b5563]">
          <div className="flex gap-1">
            <dt>Fecha de creación:</dt>
            <dd>{formatSpanishDate(unit.createdAt)}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Última actualización:</dt>
            <dd>{formatSpanishDate(unit.updatedAt)}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-6 flex flex-col gap-3">
        <Link
          href={`/mi-portafolio/${unit.id}/editar`}
          className="block w-full h-[48px] rounded-[10px] min-w-[44px] min-h-[44px] text-body bg-primary text-white text-center leading-[48px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] hover:bg-primary-600 active:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors"
        >
          Editar unidad
        </Link>

        {hasActiveListing && (
          <Link
            href={`/mi-portafolio/${portfolioId}/unidades/${unit.id}/publicacion`}
            className="flex items-center justify-center w-full min-h-[44px] rounded-[10px] text-body font-medium border border-[#1d4ed8] text-[#1d4ed8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:ring-offset-2 transition-colors"
          >
            Gestionar publicación
          </Link>
        )}

        {unitStatus === 'Disponible' && !hasActiveListing && (
          <Link
            href={`/mi-portafolio/${portfolioId}/unidades/${unit.id}/publicar`}
            className="flex items-center justify-center w-full min-h-[44px] rounded-[10px] text-body font-medium border border-[#1d4ed8] text-[#1d4ed8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:ring-offset-2 transition-colors"
          >
            Publicar en arriendo
          </Link>
        )}

        <button
          type="button"
          onClick={handleDeleteClick}
          className="flex items-center justify-center w-full min-h-[44px] rounded-[10px] text-body font-medium border border-red-600 text-red-600 hover:bg-red-50 active:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 transition-colors"
        >
          Eliminar unidad
        </button>
      </div>

      {deleteError && (
        <p className="mt-3 text-caption text-red-600" role="alert">
          {deleteError}
        </p>
      )}

      <ConfirmationDialog
        isOpen={isDialogOpen}
        title="Eliminar unidad"
        message="¿Estás seguro de que deseas eliminar esta unidad?"
        confirmLabel="Eliminar"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
