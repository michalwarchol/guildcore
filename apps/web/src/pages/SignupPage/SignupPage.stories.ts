import type { Meta, StoryObj } from '@storybook/react-vite';
import { SignupPage } from './SignupPage';

const meta = {
  title: 'Pages/SignupPage',
  component: SignupPage,
} satisfies Meta<typeof SignupPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
