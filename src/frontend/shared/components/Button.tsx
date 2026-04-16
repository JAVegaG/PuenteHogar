interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}

export function Button({
  variant = 'primary',
  children,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
}: ButtonProps) {
  const base = 'w-full rounded-card min-w-[44px] min-h-[44px] text-body font-semibold';

  const variants = {
    primary: 'bg-primary text-white h-[56px]',
    secondary: 'bg-white border border-neutral-300 text-neutral-900 h-[58px]',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}
