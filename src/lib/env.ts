export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function getAdminPassword(): string | null {
  const value = process.env.ADMIN_WRITE_PASSWORD;
  return value && value.length > 0 ? value : null;
}

export function hasAdminPassword(): boolean {
  return getAdminPassword() !== null;
}
