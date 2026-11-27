import type { Meta, StoryObj } from '@storybook/react-vite';
import { AuthLayout } from './AuthLayout';

const meta = {
  title: 'Components/AuthLayout',
  component: AuthLayout,
  args: {
    title: 'Sign in',
    titleId: 'sign-in-title',
    switchPrompt: 'Already playing?',
    switchHref: '#',
    switchLabel: 'Sign in',
    children: <div>Auth layout content</div>
  },
} satisfies Meta<typeof AuthLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Sign in',
    titleId: 'sign-in-title',
    switchPrompt: 'Already playing?',
    switchHref: '#',
    switchLabel: 'Sign in',
    children: <div>Auth layout content</div>
  },
};
