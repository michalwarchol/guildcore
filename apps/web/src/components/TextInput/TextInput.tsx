import type { InputHTMLAttributes } from 'react';
import styles from './TextInput.module.scss';

type TextInputProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  ref?: React.Ref<HTMLInputElement>;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'aria-invalid' | 'aria-describedby'>;

export function TextInput({
  id,
  label,
  hint,
  error,
  ref,
  className,
  ...inputProps
}: TextInputProps): React.JSX.Element {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        {...inputProps}
        ref={ref}
        id={id}
        className={[styles.input, error ? styles.invalid : '', className]
          .filter(Boolean)
          .join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} id={errorId}>
          <span className={styles.marker} aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
