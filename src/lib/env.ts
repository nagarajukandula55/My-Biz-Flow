/**
 * Central place for reading required environment variables. Reads are
 * lazy (checked when the value is actually used, not at import time) —
 * DATABASE_URL and CENTRAL_API_URL aren't wired to anything yet, so eager
 * validation at module load would crash every page before those features
 * even exist. Once a variable is actually consumed somewhere, its getter
 * here is the only place that should read `process.env` directly for it —
 * don't reach for `process.env.X` ad hoc elsewhere, so there's exactly one
 * place to update if a var is renamed or a default is added.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Copy .env.example to .env.local and set it.`
    );
  }
  return value;
}

export const env = {
  superAdminSecret: () => requireEnv("SUPER_ADMIN_SECRET"),
  databaseUrl: () => requireEnv("DATABASE_URL"),
  centralApiUrl: () => requireEnv("CENTRAL_API_URL"),
  centralApiKey: () => requireEnv("CENTRAL_API_KEY"),
};
