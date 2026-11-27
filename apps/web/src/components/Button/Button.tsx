import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.scss';

type ButtonVariant = 'primary' | 'outline';

type ButtonProps = {
  loading?: boolean;
  loadingLabel?: string;
  variant?: ButtonVariant;
} & ButtonHTMLAttributes<HTMLButtonElement>;


export function Button({
  children,
  className,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps): React.JSX.Element {
  const variantClass = styles[variant];

  return (
    <button
      {...props}
      type={type}
      className={[styles.button, variantClass, className].filter(Boolean).join(' ')}
    >
      {children}
    </button>
  );
}
