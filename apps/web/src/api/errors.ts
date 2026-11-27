const FIELD_NAMES = ['displayName', 'email', 'username', 'password'] as const;

export type FieldName = (typeof FIELD_NAMES)[number];

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Partial<Record<FieldName, string>>;
  readonly formMessage: string | null;

  constructor(
    status: number,
    fieldErrors: Partial<Record<FieldName, string>>,
    formMessage: string | null,
  ) {
    super(formMessage ?? 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.formMessage = formMessage;
  }
}

export const FORM_MESSAGES = {
  invalidLogin: 'Invalid email or password',
  conflict: 'Email or username is already registered',
  forbidden: 'This app origin is not allowed to sign in.',
  throttled: 'Too many attempts. Wait a moment and try again.',
  unreachable: 'Guildcore could not be reached.',
} as const;

interface NestErrorBody {
  message?: unknown;
}

export function parseNestError(status: number, body: unknown): ApiError {
  const message = readMessage(body);

  if (status === 400) {
    return new ApiError(status, message.fieldErrors, message.formMessage);
  }
  if (status === 401) {
    return new ApiError(status, {}, FORM_MESSAGES.invalidLogin);
  }
  if (status === 409) {
    return new ApiError(status, {}, FORM_MESSAGES.conflict);
  }
  if (status === 403) {
    return new ApiError(status, {}, FORM_MESSAGES.forbidden);
  }
  if (status === 429) {
    return new ApiError(status, {}, FORM_MESSAGES.throttled);
  }

  return new ApiError(
    status,
    {},
    message.formMessage ?? FORM_MESSAGES.unreachable,
  );
}

function readMessage(body: unknown): {
  fieldErrors: Partial<Record<FieldName, string>>;
  formMessage: string | null;
} {
  const raw = isNestBody(body) ? body.message : undefined;
  const messages = Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === 'string')
    : typeof raw === 'string'
      ? [raw]
      : [];

  const fieldErrors: Partial<Record<FieldName, string>> = {};
  const formMessages: string[] = [];

  for (const item of messages) {
    const field = fieldFor(item);
    if (field && !fieldErrors[field]) {
      fieldErrors[field] = item;
    } else if (!field) {
      formMessages.push(item);
    }
  }

  return {
    fieldErrors,
    formMessage: formMessages.length > 0 ? formMessages.join(' ') : null,
  };
}

function fieldFor(message: string): FieldName | null {
  for (const field of FIELD_NAMES) {
    if (message.startsWith(`${field} `) || message.startsWith(`${field}:`)) {
      return field;
    }
  }
  return null;
}

function isNestBody(body: unknown): body is NestErrorBody {
  return typeof body === 'object' && body !== null;
}
