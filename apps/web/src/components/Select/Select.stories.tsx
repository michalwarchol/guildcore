import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Select, type SelectOption } from './Select';

const guilds: SelectOption[] = [
  {
    value: 'ashen',
    label: 'Ashen Keep',
    icon: <Mark letter="A" />,
  },
  {
    value: 'north',
    label: 'Northwatch',
    icon: <Mark letter="N" />,
  },
];

const plain: SelectOption[] = [
  { value: 'ashen', label: 'Ashen Keep' },
  { value: 'north', label: 'Northwatch' },
];

const meta = {
  title: 'Components/Select',
  component: Select,
  args: {
    id: 'guild',
    label: 'Current guild',
    options: guilds,
    value: 'ashen',
    onChange: () => undefined,
  },
} satisfies Meta<typeof Select>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithIcons: Story = {
  render: function WithIconsStory(args) {
    const [value, setValue] = useState(args.value);
    return (
      <Select {...args} options={guilds} value={value} onChange={setValue} />
    );
  },
};

export const WithoutIcons: Story = {
  args: {
    options: plain,
  },
  render: function WithoutIconsStory(args) {
    const [value, setValue] = useState(args.value);
    return (
      <Select {...args} options={plain} value={value} onChange={setValue} />
    );
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

function Mark({ letter }: { letter: string }): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: 'var(--color-primary-muted)',
        color: 'var(--color-primary)',
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {letter}
    </span>
  );
}
