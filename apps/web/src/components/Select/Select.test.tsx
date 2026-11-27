import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Select } from './Select';

const options = [
  { value: 'ashen', label: 'Ashen Keep' },
  { value: 'north', label: 'Northwatch' },
];

function Harness(): React.JSX.Element {
  const [value, setValue] = useState('ashen');
  return (
    <Select
      id="guild"
      label="Current guild"
      options={options}
      value={value}
      onChange={setValue}
    />
  );
}

describe('Select', () => {
  it('chooses the next option from the keyboard', () => {
    render(<Harness />);

    const trigger = screen.getByRole('button', {
      name: 'Current guild: Ashen Keep',
    });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    const list = screen.getByRole('listbox');
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'Enter' });

    expect(
      screen.getByRole('button', { name: 'Current guild: Northwatch' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes on escape without changing the value', () => {
    render(<Harness />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Current guild: Ashen Keep' }),
    );
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });

    expect(
      screen.getByRole('button', { name: 'Current guild: Ashen Keep' }),
    ).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
