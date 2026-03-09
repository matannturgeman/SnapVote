import 'dotenv/config';
import { defineConfig } from 'prisma/config';

function isPostgresUrl(value: string): boolean {
  return value.startsWith('postgresql://') || value.startsWith('postgres://');
}

function fallbackPostgresUrl(): string {
  const host = process.env['DATABASE_HOST'] ?? 'localhost';
  const port = process.env['DATABASE_PORT'] ?? '5432';
  const user = process.env['DATABASE_USER'] ?? 'nxuser';
  const password = process.env['DATABASE_PASS'] ?? 'nxpass';
  const database = process.env['DATABASE_NAME'] ?? 'nxdb';

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

function resolveDatasourceUrl(): string {
  const configuredUrl = process.env['DATABASE_URL'];

  if (configuredUrl && isPostgresUrl(configuredUrl)) {
    return configuredUrl;
  }

  if (configuredUrl?.startsWith('prisma+postgres://')) {
    return fallbackPostgresUrl();
  }

  if (configuredUrl) {
    return configuredUrl;
  }

  return fallbackPostgresUrl();
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: resolveDatasourceUrl(),
  },
});
