import { type ButtonHTMLAttributes } from 'react';
import styles from './Avatar.module.scss';

type AvatarSize = 'sm' | 'md' | 'lg';

type AvatarProps = {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  online?: boolean;
  decorative?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'>;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}


export function Avatar({
  name,
  src,
  size = 'md',
  online = false,
  decorative = false,
  className,
  type = 'button',
  ...props
}: AvatarProps): React.JSX.Element {
  const classNames = [
    styles.avatar,
    styles[size],
    decorative ? styles.decorative : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const face = (
    <span className={styles.face}>
      {Boolean(src) ? (
        <img
          className={styles.image}
          src={src ?? undefined}
          alt=""
        />
      ) : (
        initials(name)
      )}
    </span>
  );
  const dot = online ? <span className={styles.dot} /> : null;

  if (decorative) {
    return (
      <span className={classNames} aria-hidden="true">
        {face}
        {dot}
      </span>
    );
  }

  const label = online ? `${name}, online` : name;

  return (
    <button {...props} type={type} className={classNames} aria-label={label}>
      {face}
      {dot}
    </button>
  );
}
