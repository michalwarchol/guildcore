import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useCurrentUser } from '../../api/auth';
import { ApiError } from '../../api/errors';
import { Header, type HeaderGuild } from '../../components/Header/Header';
import { routes } from '../../routes';
import styles from './AppHomePage.module.scss';

const sampleGuilds: HeaderGuild[] = [
  { id: 'ashen-keep', name: 'Ashen Keep', iconUrl: null },
  { id: 'northwatch', name: 'Northwatch', iconUrl: null },
];

export function AppHomePage(): React.JSX.Element {
  const navigate = useNavigate();
  const { data, error, isError } = useCurrentUser();
  const unauthorized = error instanceof ApiError && error.status === 401;
  const [selectedGuildId, setSelectedGuildId] = useState(
    sampleGuilds[0]?.id ?? '',
  );

  useEffect(() => {
    if (unauthorized) {
      void navigate(routes.login, { replace: true });
    }
  }, [navigate, unauthorized]);

  return (
    <div className={styles.page}>
      <Header
        guilds={sampleGuilds}
        selectedGuildId={selectedGuildId}
        onGuildChange={setSelectedGuildId}
        user={
          data
            ? { displayName: data.displayName, avatarUrl: data.avatarUrl }
            : undefined
        }
      />
      <main className={styles.content}>
        {isError && !unauthorized ? (
          <p role="alert">Guildcore could not be reached.</p>
        ) : (
          <h1>{data ? `Signed in as ${data.displayName}` : 'Signing in'}</h1>
        )}
      </main>
    </div>
  );
}
