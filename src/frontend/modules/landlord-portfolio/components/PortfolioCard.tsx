'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { PortfolioSummary } from '../types';
import { ConfirmationDialog } from '@/shared/components/ConfirmationDialog';
import { portfolioService } from '@/shared/services/portfolio';

interface PortfolioCardProps {
  portfolio: PortfolioSummary;
  token: string;
  onUpdate: (updated: PortfolioSummary) => void;
  onDelete: (id: string) => void;
}

export default function PortfolioCard({ portfolio, token, onUpdate, onDelete }: PortfolioCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(portfolio.name);
  const [editDescription, setEditDescription] = useState(portfolio.description ?? '');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const hasDescription =
    portfolio.description !== null && portfolio.description.trim() !== '';

  const handleEditToggle = () => {
    setIsEditing(true);
    setEditName(portfolio.name);
    setEditDescription(portfolio.description ?? '');
    setEditError(null);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditError(null);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (editName.trim() === '') {
      setEditError('El nombre del portafolio es obligatorio');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await portfolioService.updatePortfolio(
        portfolio.id,
        {
          name: editName.trim(),
          description: editDescription.trim() || undefined,
        },
        token,
      );
      onUpdate(updated);
      setIsEditing(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado';
      setEditError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await portfolioService.deletePortfolio(portfolio.id, token);
      setShowDeleteDialog(false);
      onDelete(portfolio.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado';
      setDeleteError(message);
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isEditing) {
    return (
      <article className="border border-neutral-300 rounded-[6px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] bg-white p-4">
        <form onSubmit={handleEditSave} className="flex flex-col gap-3">
          {editError && (
            <div
              role="alert"
              className="rounded-md bg-red-50 border border-red-200 p-3 text-caption text-red-700"
            >
              {editError}
            </div>
          )}
          <div>
            <label
              htmlFor={`edit-name-${portfolio.id}`}
              className="block text-caption font-medium text-gray-700 mb-1"
            >
              Nombre del portafolio
            </label>
            <input
              id={`edit-name-${portfolio.id}`}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              className="w-full h-[48px] min-h-[44px] rounded-[10px] border border-gray-300 px-3 text-body focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            />
          </div>
          <div>
            <label
              htmlFor={`edit-desc-${portfolio.id}`}
              className="block text-caption font-medium text-gray-700 mb-1"
            >
              Descripción (opcional)
            </label>
            <textarea
              id={`edit-desc-${portfolio.id}`}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
              className="w-full min-h-[44px] rounded-[10px] border border-gray-300 px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              aria-busy={isSaving}
              className="flex-1 min-h-[44px] min-w-[44px] rounded-[10px] bg-primary text-body text-white font-medium hover:bg-primary/90 active:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={handleEditCancel}
              disabled={isSaving}
              className="flex-1 min-h-[44px] min-w-[44px] rounded-[10px] border border-neutral-300 bg-white text-body text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article className="border border-neutral-300 rounded-[6px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span aria-hidden="true">🏢</span>
          <h3 className="text-h3 font-semibold text-neutral-900">
            {portfolio.name}
          </h3>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleEditToggle}
            aria-label={`Editar portafolio ${portfolio.name}`}
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-[6px] text-neutral-600 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => { setDeleteError(null); setShowDeleteDialog(true); }}
            aria-label={`Eliminar portafolio ${portfolio.name}`}
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-[6px] text-neutral-600 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      </div>

      {hasDescription && (
        <p className="text-caption text-neutral-600 mt-1">
          {portfolio.description}
        </p>
      )}

      {deleteError && (
        <div
          role="alert"
          className="rounded-md bg-red-50 border border-red-200 p-3 text-caption text-red-700 mt-2"
        >
          {deleteError}
        </div>
      )}

      <div className="flex flex-col gap-1 mt-3 text-caption text-neutral-600">
        <p>Unidades totales: {portfolio.totalUnits}</p>
        <p>Arriendos activos: {portfolio.activeLeases}</p>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-caption text-neutral-600 mb-1">
          <span>Ocupación</span>
          <span>{portfolio.occupancyPercentage}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={portfolio.occupancyPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Ocupación del portafolio ${portfolio.name}: ${portfolio.occupancyPercentage}%`}
          className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${portfolio.occupancyPercentage}%` }}
          />
        </div>
      </div>

      <div className="mt-4">
        <Link
          href={`/mi-portafolio/${portfolio.id}/unidades`}
          className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-4 py-2 text-caption font-medium text-primary border border-primary rounded-[6px] hover:bg-primary/5 transition-colors"
        >
          Ver unidades
        </Link>
      </div>

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        title="Eliminar portafolio"
        message={`¿Estás seguro de que deseas eliminar el portafolio "${portfolio.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteDialog(false)}
        isLoading={isDeleting}
      />
    </article>
  );
}
