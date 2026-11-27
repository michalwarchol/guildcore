import { useId } from 'react';
import { Avatar } from '../Avatar/Avatar';
import { IconButton } from '../IconButton/IconButton';
import { Icons } from '../Icons/Icons';
import { Select } from '../Select/Select';
import styles from './Header.module.scss';

export type HeaderGuild = {
  id: string;
  name: string;
  iconUrl: string | null;
};

export type HeaderUser = {
  displayName: string;
  avatarUrl: string | null;
};

type HeaderProps = {
  guilds: HeaderGuild[];
  selectedGuildId: string;
  onGuildChange: (guildId: string) => void;
  user?: HeaderUser;
  onCreateGuild?: () => void;
  onUserClick?: () => void;
};

export function Header({
  guilds,
  selectedGuildId,
  onGuildChange,
  user,
  onCreateGuild,
  onUserClick,
}: HeaderProps): React.JSX.Element {
  const guildSelectId = useId();

  return (
    <header className={styles.header}>
      <div className={styles.leading}>
        <p className={styles.brand}>Guildcore</p>
        <span className={styles.separator} aria-hidden="true" />
        <Select
          id={guildSelectId}
          label="Current guild"
          value={selectedGuildId}
          onChange={onGuildChange}
          options={guilds.map((guild) => ({
            value: guild.id,
            label: guild.name,
            icon: (
              <Avatar
                name={guild.name}
                src={guild.iconUrl}
                size="sm"
                decorative
              />
            ),
          }))}
        />
        <IconButton
          icon={Icons.Plus}
          variant="outline"
          aria-label="Create a guild"
          onClick={onCreateGuild}
        />
      </div>
      {user ? (
        <Avatar
          name={user.displayName}
          src={user.avatarUrl}
          size="md"
          onClick={onUserClick}
        />
      ) : null}
    </header>
  );
}
