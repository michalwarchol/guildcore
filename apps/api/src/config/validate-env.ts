export type NodeEnv = 'development' | 'test' | 'production';

export interface AppConfig {
  nodeEnv: NodeEnv;
  port: number;
  databaseUrl: string;
  redisUrl: string;
  webUrl: string;
  apiUrl: string;
  livekitUrl?: string;
  livekitApiKey?: string;
  livekitApiSecret?: string;
  steamWebApiKey?: string;
}

export const DEVELOPMENT_DATABASE_URL =
  'postgresql://guildcore:guildcore_dev@localhost:5432/guildcore';

const DEVELOPMENT_DEFAULTS = {
  databaseUrl: DEVELOPMENT_DATABASE_URL,
  redisUrl: 'redis://localhost:6379',
  webUrl: 'http://localhost:5173',
  apiUrl: 'http://localhost:3000',
  livekitApiKey: 'devkey',
  livekitApiSecret: 'secret',
} as const;

const NODE_ENVS: readonly NodeEnv[] = ['development', 'test', 'production'];

export function validateEnv(env: Record<string, unknown>): AppConfig {
  const nodeEnv = readNodeEnv(env);
  const port = readPort(env);
  const databaseUrl = readUrl(env, 'DATABASE_URL', [
    'postgres:',
    'postgresql:',
  ]);
  const redisUrl = readUrl(env, 'REDIS_URL', ['redis:', 'rediss:']);
  const webUrl = readUrl(env, 'WEB_URL', ['http:', 'https:']);
  const apiUrl = readUrl(env, 'API_URL', ['http:', 'https:']);
  const livekitUrl = readOptionalUrl(env, 'LIVEKIT_URL', ['ws:', 'wss:']);
  const livekitApiKey = readOptionalString(env, 'LIVEKIT_API_KEY');
  const livekitApiSecret = readOptionalString(env, 'LIVEKIT_API_SECRET');
  const steamWebApiKey = readOptionalString(env, 'STEAM_WEB_API_KEY');

  assertLiveKitGroup(livekitUrl, livekitApiKey, livekitApiSecret);

  if (nodeEnv === 'production') {
    assertProductionIsNotDevelopmentDefault({
      databaseUrl,
      redisUrl,
      webUrl,
      apiUrl,
      livekitApiKey,
      livekitApiSecret,
    });
  }

  return {
    nodeEnv,
    port,
    databaseUrl,
    redisUrl,
    webUrl,
    apiUrl,
    livekitUrl,
    livekitApiKey,
    livekitApiSecret,
    steamWebApiKey,
  };
}

function readNodeEnv(env: Record<string, unknown>): NodeEnv {
  const value = readRequiredString(env, 'NODE_ENV');
  if (!NODE_ENVS.includes(value as NodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }
  return value as NodeEnv;
}

function readPort(env: Record<string, unknown>): number {
  const raw = readRequiredString(env, 'PORT');
  if (!/^\d+$/.test(raw)) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  const port = Number(raw);
  if (port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return port;
}

function readUrl(
  env: Record<string, unknown>,
  key: string,
  protocols: readonly string[],
): string {
  const value = readRequiredString(env, key);
  if (value === '*') {
    throw new Error(`${key} must be an explicit origin`);
  }
  assertUrl(key, value, protocols);
  return value;
}

function readOptionalUrl(
  env: Record<string, unknown>,
  key: string,
  protocols: readonly string[],
): string | undefined {
  const value = readOptionalString(env, key);
  if (value === undefined) {
    return undefined;
  }
  assertUrl(key, value, protocols);
  return value;
}

function assertUrl(
  key: string,
  value: string,
  protocols: readonly string[],
): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${key} must be a valid URL`);
  }
  if (!protocols.includes(url.protocol)) {
    throw new Error(
      `${key} must use one of these protocols: ${protocols.join(', ')}`,
    );
  }
}

function assertLiveKitGroup(
  livekitUrl: string | undefined,
  livekitApiKey: string | undefined,
  livekitApiSecret: string | undefined,
): void {
  const values = [livekitUrl, livekitApiKey, livekitApiSecret];
  const present = values.filter((value) => value !== undefined).length;
  if (present !== 0 && present !== values.length) {
    throw new Error(
      'LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET must be set together',
    );
  }
}

function assertProductionIsNotDevelopmentDefault(config: {
  databaseUrl: string;
  redisUrl: string;
  webUrl: string;
  apiUrl: string;
  livekitApiKey?: string;
  livekitApiSecret?: string;
}): void {
  if (
    config.databaseUrl === DEVELOPMENT_DEFAULTS.databaseUrl ||
    config.databaseUrl.includes('guildcore_dev')
  ) {
    throw new Error(
      'DATABASE_URL must not use the development default in production',
    );
  }
  if (config.redisUrl === DEVELOPMENT_DEFAULTS.redisUrl) {
    throw new Error(
      'REDIS_URL must not use the development default in production',
    );
  }
  if (config.webUrl === DEVELOPMENT_DEFAULTS.webUrl) {
    throw new Error(
      'WEB_URL must not use the development default in production',
    );
  }
  if (config.apiUrl === DEVELOPMENT_DEFAULTS.apiUrl) {
    throw new Error(
      'API_URL must not use the development default in production',
    );
  }
  if (
    config.livekitApiKey === DEVELOPMENT_DEFAULTS.livekitApiKey ||
    config.livekitApiSecret === DEVELOPMENT_DEFAULTS.livekitApiSecret
  ) {
    throw new Error(
      'LiveKit credentials must not use development defaults in production',
    );
  }
}

function readRequiredString(env: Record<string, unknown>, key: string): string {
  const value = readOptionalString(env, key);
  if (value === undefined) {
    throw new Error(`${key} is required`);
  }
  return value;
}

function readOptionalString(
  env: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = env[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
