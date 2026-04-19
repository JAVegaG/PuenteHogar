interface PhotoThumbnailProps {
    src: string;
    onRemove: () => void;
}

export function PhotoThumbnail({ src, onRemove }: PhotoThumbnailProps) {
    return (
        <div className="relative flex-shrink-0 w-[80px] h-[80px]">
            <img
                src={src}
                alt="Foto de la propiedad"
                className="w-full h-full object-cover rounded-[6px]"
                style={{ aspectRatio: '1 / 1' }}
            />
            <button
                type="button"
                onClick={onRemove}
                aria-label="Eliminar foto"
                className="absolute top-[-12px] right-[-12px] w-[44px] h-[44px] min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-small leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
                <span className="w-[24px] h-[24px] rounded-full bg-[#111827] text-white flex items-center justify-center hover:bg-[#374151]">
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <line x1="2" y1="2" x2="10" y2="10" />
                        <line x1="10" y1="2" x2="2" y2="10" />
                    </svg>
                </span>
            </button>
        </div>
    );
}
