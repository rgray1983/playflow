export const accessRoles = ["OWNER", "MANAGER", "FRONT_DESK", "PARTY_HOST"] as const;
export type AccessRole = typeof accessRoles[number];
export type Permission = "memberships.read" | "memberships.manage" | "families.read" | "families.write" | "families.manage" | "read" | "settings.write" | "parties.write" | "payments.write" | "payments.refund" | "guests.write" | "visits.write" | "incidents.write" | "staff.manage";

const permissions: Record<AccessRole, readonly Permission[]> = {
  OWNER: ["memberships.read", "memberships.manage", "families.read", "families.write", "families.manage", "payments.refund", "read", "settings.write", "parties.write", "payments.write", "guests.write", "visits.write", "incidents.write", "staff.manage"],
  MANAGER: ["memberships.read", "memberships.manage", "families.read", "families.write", "families.manage", "payments.refund", "read", "settings.write", "parties.write", "payments.write", "guests.write", "visits.write", "incidents.write"],
  FRONT_DESK: ["memberships.read", "families.read", "families.write", "read", "parties.write", "payments.write", "guests.write", "visits.write", "incidents.write"],
  PARTY_HOST: ["read", "guests.write", "incidents.write"],
};

export function isAccessRole(value: unknown): value is AccessRole {
  return typeof value === "string" && accessRoles.some((role) => role === value);
}
export function hasPermission(role: string, permission: Permission) {
  return isAccessRole(role) && permissions[role].includes(permission);
}
export function getPermissions(role: string) { return isAccessRole(role) ? permissions[role] : []; }
