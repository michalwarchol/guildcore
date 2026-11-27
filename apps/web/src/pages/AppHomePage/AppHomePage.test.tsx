import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppHomePage } from './AppHomePage';

const user = {
  id: 'user-1',
  username: 'rowan',
  email: 'rowan@example.com',
  displayName: 'Rowan Ash',
  avatarUrl: null,
};

function renderPage(): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, networkMode: 'always' } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AppHomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AppHomePage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(user, {
          status: 200,
        }),
      ),
    );
  });

  it('shows the guild header for the signed-in user', async () => {
    renderPage();

    expect(await screen.findByRole('banner')).toHaveTextContent('Guildcore');
    expect(
      screen.getByRole('button', { name: 'Current guild: Ashen Keep' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Rowan Ash' })).toBeInTheDocument();
  });
});
