// playwright/api/config/required.ts
// Shared validator for every env module in this runner.
// Written once when the first service is generated; never modified after.
//
// It has no per-service content, so it can never conflict between two branches
// adding different services.

export function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}
