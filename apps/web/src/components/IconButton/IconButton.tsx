import type { ComponentProps } from 'react';
import { Button } from '../Button/Button';
import { Icon } from '../Icons/Icon';
import { Icons } from '../Icons/Icons';
import styles from './IconButton.module.scss';

type IconButtonProps = Omit<
  ComponentProps<typeof Button>,
  'children' | 'aria-label'
> & {
  icon: Icons;
  'aria-label': string;
};

export function IconButton({
  icon,
  className,
  type = 'button',
  ...props
}: IconButtonProps): React.JSX.Element {
  return (
    <Button
      {...props}
      type={type}
      className={[styles.iconButton, className].filter(Boolean).join(' ')}
    >
      <Icon name={icon} />
    </Button>
  );
}
