export interface AppConfig {
  databaseUrl: string;
  redisUrl: string;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  objectStorage: {
    bucket: string;
    endpoint: string;
  };
}

export default (): AppConfig => ({
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? '',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'changeme',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
  objectStorage: {
    bucket: process.env.OBJECT_STORAGE_BUCKET ?? '',
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT ?? '',
  },
});
