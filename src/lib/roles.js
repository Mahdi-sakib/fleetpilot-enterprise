// 'admin' is the legacy role name kept for accounts created before the
// driver/admin_officer/user split — it has the same full access as
// 'admin_officer' going forward, it's just not offered when creating new
// accounts anymore.
export const isAdminRole = (role) => role === "admin" || role === "admin_officer";

export const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "driver", label: "Driver" },
  { value: "admin_officer", label: "Admin Officer" },
];

const ROLE_LABELS = { admin: "Admin", admin_officer: "Admin Officer", driver: "Driver", user: "User" };

export const roleLabel = (role) => ROLE_LABELS[role] || role;
