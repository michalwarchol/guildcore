import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Icons } from '../Icons/Icons';
import { IconButton } from './IconButton';

const meta = {
  title: 'Components/IconButton',
  component: IconButton,
  args: {
    icon: Icons.Plus,
    'aria-label': 'Create a guild',
    onClick: fn(),
    variant: 'primary',
  },
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EachIcon: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 12 }}>
      {Object.values(Icons).map((icon) => (
        <IconButton key={icon} {...args} icon={icon} aria-label={icon} />
      ))}
    </div>
  ),
};

export const Primary: Story = {};

export const Outline: Story = {
  args: {
    variant: 'outline',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
