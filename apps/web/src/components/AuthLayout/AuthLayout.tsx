import type { ReactNode } from 'react';
import { Link } from 'react-router';
import styles from './AuthLayout.module.scss';

type AuthLayoutProps = {
  title: string;
  titleId: string;
  switchPrompt: string;
  switchHref: string;
  switchLabel: string;
  children: ReactNode;
};

export function AuthLayout({
  title,
  titleId,
  switchPrompt,
  switchHref,
  switchLabel,
  children,
}: AuthLayoutProps): React.JSX.Element {
  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        <section className={styles.card}>
          <p className={styles.brand}>
            <Link to="/">Guildcore</Link>
          </p>
          <h1 id={titleId} className={styles.title}>
            {title}
          </h1>
          {children}
          <p className={styles.switch}>
            {switchPrompt} <Link to={switchHref}>{switchLabel}</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
