import { DEVELOPMENT_DATABASE_URL, validateEnv } from './validate-env';

const developmentEnv = {
  NODE_ENV: 'development',
  PORT: '3000',
  DATABASE_URL: DEVELOPMENT_DATABASE_URL,
  REDIS_URL: 'redis://localhost:6379',
  WEB_URL: 'http://localhost:5173',
  API_URL: 'http://localhost:3000',
  LIVEKIT_URL: 'ws://localhost:7880',
  LIVEKIT_API_KEY: 'devkey',
  LIVEKIT_API_SECRET: 'secret',
  STEAM_WEB_API_KEY: '',
};

describe('validateEnv', () => {
  it('accepts the local development configuration', () => {
    expect(validateEnv(developmentEnv)).toMatchObject({
      nodeEnv: 'development',
      port: 3000,
      databaseUrl: DEVELOPMENT_DATABASE_URL,
      livekitApiKey: 'devkey',
      steamWebApiKey: undefined,
    });
  });

  it('allows the foundation to boot without Steam or LiveKit', () => {
    const env: Record<string, string> = { ...developmentEnv };
    delete env.LIVEKIT_URL;
    delete env.LIVEKIT_API_KEY;
    delete env.LIVEKIT_API_SECRET;

    const config = validateEnv(env);

    expect(config.livekitUrl).toBeUndefined();
    expect(config.steamWebApiKey).toBeUndefined();
  });

  it('rejects a missing database URL', () => {
    const env: Record<string, string> = { ...developmentEnv };
    delete env.DATABASE_URL;

    expect(() => validateEnv(env)).toThrow('DATABASE_URL is required');
  });

  it('rejects a wildcard browser origin', () => {
    expect(() => validateEnv({ ...developmentEnv, WEB_URL: '*' })).toThrow(
      'WEB_URL must be an explicit origin',
    );
  });

  it('rejects a partial LiveKit configuration', () => {
    expect(() =>
      validateEnv({
        ...developmentEnv,
        LIVEKIT_API_SECRET: '',
      }),
    ).toThrow('must be set together');
  });

  it('rejects an invalid port', () => {
    expect(() => validateEnv({ ...developmentEnv, PORT: '65536' })).toThrow(
      'PORT must be an integer between 1 and 65535',
    );
  });

  it('rejects development defaults when running in production', () => {
    expect(() =>
      validateEnv({ ...developmentEnv, NODE_ENV: 'production' }),
    ).toThrow('DATABASE_URL must not use the development default');
  });

  it('accepts production configuration with real endpoints and no optional modules', () => {
    const env = {
      NODE_ENV: 'production',
      PORT: '3000',
      DATABASE_URL:
        'postgresql://guildcore:real-secret@db.internal:5432/guildcore',
      REDIS_URL: 'rediss://cache.internal:6379',
      WEB_URL: 'https://guildcore.gg',
      API_URL: 'https://api.guildcore.gg',
    };

    expect(validateEnv(env)).toMatchObject({
      nodeEnv: 'production',
      webUrl: 'https://guildcore.gg',
      livekitUrl: undefined,
    });
  });
});
