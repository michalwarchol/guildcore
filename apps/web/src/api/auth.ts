import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FORM_MESSAGES, parseNestError, type ApiError } from './errors';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const currentUserQueryKey = ['users', 'me'] as const;

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: () => request<UserProfile>('/api/v1/users/me'),
    staleTime: 30_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) =>
      request<UserProfile>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: normalizeEmail(input.email),
          password: input.password,
        }),
      }),
    onSuccess: (user) => {
      queryClient.setQueryData(currentUserQueryKey, user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => {
      const displayName = input.displayName?.trim();
      return request<UserProfile>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: normalizeEmail(input.email),
          username: normalizeUsername(input.username),
          password: input.password,
          ...(displayName ? { displayName } : {}),
        }),
      });
    },
    onSuccess: (user) => {
      queryClient.setQueryData(currentUserQueryKey, user);
    },
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  if (init?.body) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers,
    });
  } catch {
    throw unreachable();
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      throw unreachable(response.status);
    }
    throw parseNestError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function unreachable(status = 0): ApiError {
  return parseNestError(status, { message: FORM_MESSAGES.unreachable });
}
