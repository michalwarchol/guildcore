import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormAlert } from './FormAlert';

const meta = {
  title: 'Components/FormAlert',
  component: FormAlert,
  args: {
    message: 'Email or username is already registered',
    focus: false,
  },
} satisfies Meta<typeof FormAlert>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Focus: Story = {
  args: {
    focus: true,
  },
};
