import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Header, type HeaderGuild } from './Header';

const portrait = `https://i.pravatar.cc/150?img=12`;

const guilds: HeaderGuild[] = [
  { id: 'ashen', name: 'Ashen Keep', iconUrl: portrait },
  { id: 'north', name: 'Northwatch', iconUrl: null },
];

const meta = {
  title: 'Components/Header',
  component: Header,
  args: {
    guilds,
    selectedGuildId: 'ashen',
    onGuildChange: () => undefined,
    user: { displayName: 'Rowan Ash', avatarUrl: null },
  },
} satisfies Meta<typeof Header>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SignedIn: Story = {
  render: function SignedInStory(args) {
    const [selectedGuildId, setSelectedGuildId] = useState(
      args.selectedGuildId,
    );
    return (
      <Header
        {...args}
        selectedGuildId={selectedGuildId}
        onGuildChange={setSelectedGuildId}
      />
    );
  },
};
