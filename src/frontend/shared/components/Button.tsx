interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  'aria-busy'?: boolean;
}

export function Button({
  variant = 'primary',
  children,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  'aria-busy': ariaBusy,
}: ButtonProps) {
  const base =
    'w-full h-[48px] rounded-[6px] min-w-[44px] min-h-[44px] px-4 inline-flex items-center justify-center text-body font-semibold shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors';

  const variants = {
    primary:
      'bg-[#1d4ed8] text-white hover:bg-primary-600 active:bg-primary-700',
    secondary:
      'bg-white border border-primary text-primary hover:bg-primary-50 active:bg-primary-50',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-busy={ariaBusy}
      className={`${base} ${variants[variant]} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}
