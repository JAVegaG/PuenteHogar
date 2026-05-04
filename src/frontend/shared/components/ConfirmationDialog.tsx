'use client';

import { useEffect, useRef, useCallback } from 'react';

interface ConfirmationDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    variant?: 'destructive' | 'primary';
}

export function ConfirmationDialog({
    isOpen,
    title,
    message,
    confirmLabel,
    cancelLabel = 'Cancelar',
    onConfirm,
    onCancel,
    isLoading = false,
    variant = 'destructive',
}: ConfirmationDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isOpen && !dialog.open) {
            dialog.showModal();
            cancelButtonRef.current?.focus();
        } else if (!isOpen && dialog.open) {
            dialog.close();
        }
    }, [isOpen]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLDialogElement>) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (!isLoading) onCancel();
            }

            if (e.key === 'Tab') {
                const dialog = dialogRef.current;
                if (!dialog) return;

                const focusable = dialog.querySelectorAll<HTMLElement>(
                    'button:not([disabled])',
                );
                if (focusable.length === 0) return;

                const first = focusable[0];
                const last = focusable[focusable.length - 1];

                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        },
        [isLoading, onCancel],
    );

    const handleCancel = useCallback(
        (e: React.SyntheticEvent) => {
            e.preventDefault();
            if (!isLoading) onCancel();
        },
        [isLoading, onCancel],
    );

    if (!isOpen) return null;

    return (
        <dialog
            ref={dialogRef}
            role="alertdialog"
            aria-labelledby="confirmation-dialog-title"
            aria-describedby="confirmation-dialog-message"
            onKeyDown={handleKeyDown}
            onCancel={handleCancel}
            className="fixed inset-0 m-auto w-[calc(100%-32px)] max-w-[400px] rounded-card bg-white p-6 shadow-lg backdrop:bg-black/50"
        >
            <h2
                id="confirmation-dialog-title"
                className="text-h3 font-semibold text-neutral-900"
            >
                {title}
            </h2>

            <p
                id="confirmation-dialog-message"
                className="mt-2 text-body text-neutral-600"
            >
                {message}
            </p>

            <div className="mt-6 flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    ref={cancelButtonRef}
                    className="flex-1 min-h-[44px] min-w-[44px] rounded-[10px] border border-neutral-300 bg-white text-body text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {cancelLabel}
                </button>

                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isLoading}
                    aria-busy={isLoading}
                    className={`flex-1 min-h-[44px] min-w-[44px] rounded-[10px] text-body text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 ${variant === 'primary'
                            ? 'bg-[#1d4ed8] hover:bg-blue-800 active:bg-blue-900 focus-visible:ring-[#1d4ed8]'
                            : 'bg-red-600 hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-600'
                        }`}
                >
                    {isLoading && (
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
                    {confirmLabel}
                </button>
            </div>
        </dialog>
    );
}
