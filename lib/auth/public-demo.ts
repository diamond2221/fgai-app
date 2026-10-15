export const PUBLIC_DEMO_EMAIL = "test@beva.com";

export function isPublicDemo(email: string | null | undefined) {
  return email?.trim().toLowerCase() === PUBLIC_DEMO_EMAIL;
}

// The shared demo uses only the isolated sixth-module workspace. Legacy
// company workspaces, their APIs and private NAS media remain unavailable.
export function publicDemoMainPathAllowed(path: string) {
  return ["/api/auth/session", "/api/auth/signout", "/workspace"].includes(path);
}
