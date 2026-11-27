import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextInput } from './TextInput';

const meta = {
  title: 'Components/TextInput',
  component: TextInput,
  args: {
    id: 'call-sign',
    label: 'Call sign',
    name: 'callSign',
  },
} satisfies Meta<typeof TextInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHint: Story = {
  args: {
    hint: '3–32 lowercase letters, numbers, or underscores.',
  },
};

export const WithError: Story = {
  args: {
    error: 'Enter a valid email address.',
    defaultValue: 'not-an-email',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: 'offline',
  },
};
