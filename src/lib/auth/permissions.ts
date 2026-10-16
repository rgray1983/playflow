export const accessRoles = ["OWNER", "MANAGER", "FRONT_DESK", "PARTY_HOST"] as const;
export type AccessRole = typeof accessRoles[number];
export type Permission = "read" | "settings.write" | "parties.write" | "payments.write" | "guests.write" | "incidents.write" | "staff.manage";

const permissions: Record<AccessRole, readonly Permission[]> = {
  OWNER: ["read", "settings.write", "parties.write", "payments.write", "guests.write", "incidents.write", "staff.manage"],
  MANAGER: ["read", "settings.write", "parties.write", "payments.write", "guests.write", "incidents.write"],
  FRONT_DESK: ["read", "parties.write", "payments.write", "guests.write", "incidents.write"],
  PARTY_HOST: ["read", "guests.write", "incidents.write"],
};

export function isAccessRole(value: unknown): value is AccessRole {
  return typeof value === "string" && accessRoles.some((role) => role === value);
}
export function hasPermission(role: string, permission: Permission) {
  return isAccessRole(role) && permissions[role].includes(permission);
}
export function getPermissions(role: string) { return isAccessRole(role) ? permissions[role] : []; }
