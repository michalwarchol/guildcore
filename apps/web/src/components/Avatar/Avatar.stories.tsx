import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Avatar } from './Avatar';

const portrait = `https://i.pravatar.cc/150?img=12`;

const meta = {
  title: 'Components/Avatar',
  component: Avatar,
  args: {
    name: 'Rowan Ash',
    size: 'md',
    onClick: fn(),
  },
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Initials: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Avatar {...args} size="sm" />
      <Avatar {...args} size="md" />
      <Avatar {...args} size="lg" />
    </div>
  ),
};

export const Photo: Story = {
  args: {
    src: portrait,
  },
};

export const Online: Story = {
  args: {
    online: true,
  },
};

export const Decorative: Story = {
  args: {
    decorative: true,
    size: 'sm',
  },
};
