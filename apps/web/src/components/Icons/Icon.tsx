import { Icons } from './Icons';
import styles from './Icon.module.scss';

const paths: Record<Icons, React.ReactNode> = {
  [Icons.Plus]: <path d="M12 5v14M5 12h14" />,
  [Icons.Pin]: (
    <>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
      <circle cx="12" cy="11" r="2" />
    </>
  ),
  [Icons.Hash]: <path d="M9 4 7 20M17 4l-2 16M4 9h16M5 15h16" />,
  [Icons.Search]: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  [Icons.UserWithPlus]: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.8-3 2.8-4.5 5.5-4.5s4.7 1.5 5.5 4.5" />
      <path d="M18 8v6M15 11h6" />
    </>
  ),
  [Icons.Microphone]: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M8 21h8" />
    </>
  ),
};

type IconProps = {
  name: Icons;
};

export function Icon({ name }: IconProps): React.JSX.Element {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
