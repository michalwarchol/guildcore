import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useCurrentUser } from '../../api/auth';
import { ApiError } from '../../api/errors';
import { routes } from '../../routes';
import styles from './AppHomePage.module.scss';

export function AppHomePage(): React.JSX.Element {
  const navigate = useNavigate();
  const { data, error, isError } = useCurrentUser();
  const unauthorized = error instanceof ApiError && error.status === 401;

  useEffect(() => {
    if (unauthorized) {
      void navigate(routes.login, { replace: true });
    }
  }, [navigate, unauthorized]);

  return (
    <main className={styles.page}>
      {isError && !unauthorized ? (
        <p role="alert">Guildcore could not be reached.</p>
      ) : (
        <h1>{data ? `Signed in as ${data.displayName}` : 'Signing in'}</h1>
      )}
    </main>
  );
}
