import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignupPage } from '../SignupPage/SignupPage';
import { LoginPage } from './LoginPage';

function renderAuth(path: '/login' | '/signup'): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('auth forms', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('keeps an invalid sign-in on the page and focuses email', async () => {
    renderAuth('/login');

    screen.getByRole('button', { name: 'Sign in' }).click();

    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toHaveFocus();
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps an invalid sign-up on the page and focuses email', async () => {
    renderAuth('/signup');

    screen.getByRole('button', { name: 'Create account' }).click();

    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toHaveFocus();
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('switches from sign-in to create account', async () => {
    renderAuth('/login');

    screen.getByRole('link', { name: 'Create account' }).click();

    expect(
      await screen.findByRole('heading', { name: 'Create account' }),
    ).toBeInTheDocument();
  });
});
