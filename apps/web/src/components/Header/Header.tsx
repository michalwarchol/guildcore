import styles from './Header.module.scss';

export function Header(): React.JSX.Element {
  return (
    <header className={styles.header}>
      <p className={styles.brand}>Guildcore</p>
    </header>
  );
}
