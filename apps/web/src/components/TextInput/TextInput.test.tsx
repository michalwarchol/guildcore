import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TextInput } from './TextInput';

describe('TextInput', () => {
  it('connects the label, hint, and error to the field', () => {
    render(
      <TextInput
        id="email"
        label="Email"
        hint="Use the address you play with."
        error="Enter a valid email address."
      />,
    );

    const field = screen.getByLabelText('Email');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAttribute(
      'aria-describedby',
      'email-hint email-error',
    );
    expect(screen.getByText('Enter a valid email address.')).toHaveAttribute(
      'id',
      'email-error',
    );
  });
});
