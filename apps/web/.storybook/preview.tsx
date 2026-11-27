import type { Preview } from '@storybook/react-vite';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../src/styles/global.scss';

const preview: Preview = {
  decorators: [
    (Story) => (
      <div
        style={{
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
          minHeight: '100vh',
          padding: 'var(--space-24)',
        }}
      >
        <Story />
      </div>
    ),
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <BrowserRouter>
          <Story />
        </BrowserRouter>
      </QueryClientProvider>
    ),
  ],
};

export default preview;
