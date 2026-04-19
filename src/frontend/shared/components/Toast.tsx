'use client';

import { useEffect } from 'react';

interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

export function Toast({ message, isVisible, onClose, duration = 3000 }: ToastProps) {
    useEffect(() => {
        if (!isVisible) return;

        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [isVisible, duration, onClose]);

    if (!isVisible) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-[16px] py-[12px] text-body text-white rounded-[6px] shadow-lg"
            style={{ backgroundColor: '#111827' }}
        >
            {message}
        </div>
    );
}
