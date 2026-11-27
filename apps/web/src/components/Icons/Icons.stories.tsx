import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from './Icon';
import { Icons } from './Icons';

const meta = {
  title: 'Components/Icons',
  component: Icon,
  args: {
    name: Icons.Plus,
  },
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Gallery: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {Object.values(Icons).map((name) => (
        <Icon key={name} name={name} />
      ))}
    </div>
  ),
};
