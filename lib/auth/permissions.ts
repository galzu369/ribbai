export type PermissionAction = "create" | "read" | "update" | "delete" | "approve" | "manage";

export type Permission = {
  domain: string;
  actions: PermissionAction[];
  conditions?: Record<string, unknown>;
};

export type PermissionSet = Permission[];

export function hasPermission(
  permissions: PermissionSet,
  domain: string,
  action: PermissionAction
) {
  return permissions.some(
    (permission) =>
      permission.domain === domain &&
      (permission.actions.includes(action) || permission.actions.includes("manage"))
  );
}
