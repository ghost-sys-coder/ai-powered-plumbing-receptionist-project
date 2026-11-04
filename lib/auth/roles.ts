// Role helpers safe to import from client and server code (no server-only
// dependencies). The role is Clerk publicMetadata.role.

export type AppRole = "admin" | "agency" | "client";

// Platform admins and agency staff use the admin console.
export function isStaffRole(role: unknown): boolean {
  return role === "admin" || role === "agency";
}

// Where a signed-in user lands.
export function homeForRole(role: unknown): string {
  return isStaffRole(role) ? "/admin" : "/dashboard";
}
