import type { ReactNode } from "react";

const iconClass = "h-5 w-5";

const Icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 13h7V3H3z" />
      <path d="M14 21h7V11h-7z" />
      <path d="M14 3h7v5h-7z" />
      <path d="M3 18h7v3H3z" />
    </svg>
  ),
  documents: (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 2h9l5 5v15H6z" />
      <path d="M15 2v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
      <path d="M9 9h2" />
    </svg>
  ),
  departments: (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 11a4 4 0 1 0-8 0" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  editRequests: (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 21h16" />
      <path d="M6 17l10-10 3 3-10 10H6v-3z" />
    </svg>
  ),
  addDocument: (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 2h9l5 5v15H6z" />
      <path d="M15 2v6h6" />
      <path d="M12 11v6" />
      <path d="M9 14h6" />
    </svg>
  ),
  myDocuments: (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 2h9l5 5v15H6z" />
      <path d="M15 2v6h6" />
      <path d="M9 13h6" />
    </svg>
  ),
  pending: (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 2h8l4 4v16H4V2z" />
      <path d="M8 6h8" />
      <path d="M8 10h8" />
      <path d="M8 14h5" />
    </svg>
  ),
  help: (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 18h.01" />
      <path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
};

export type MenuItem = {
  name: string;
  href: string;
  icon: ReactNode;
  description: string;
  roles: ("Admin" | "Encoder" | "Viewer")[];
};

// Admin Menu - Full system access
export const adminMenuItems: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Icons.dashboard,
    description: "View system overview and statistics",
    roles: ["Admin"],
  },
  {
    name: "Documents",
    href: "/documents",
    icon: Icons.documents,
    description: "View and manage all documents",
    roles: ["Admin"],
  },
  {
    name: "Departments",
    href: "/departments",
    icon: Icons.departments,
    description: "Manage departments and codes",
    roles: ["Admin"],
  },
  {
    name: "Users",
    href: "/users",
    icon: Icons.users,
    description: "Manage system users and roles",
    roles: ["Admin"],
  },
  {
    name: "Edit Requests",
    href: "/edit-requests",
    icon: Icons.editRequests,
    description: "Review and approve edit requests",
    roles: ["Admin"],
  },
];

// Encoder Menu - Focused on data entry
export const encoderMenuItems: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Icons.dashboard,
    description: "View today's tasks and summary",
    roles: ["Encoder"],
  },
  {
    name: "All Documents",
    href: "/documents",
    icon: Icons.documents,
    description: "View all documents in the system",
    roles: ["Encoder"],
  },
  {
    name: "Edit Requests",
    href: "/edit-requests",
    icon: Icons.editRequests,
    description: "Manage edit requests for your documents",
    roles: ["Encoder"],
  },
  {
    name: "Encode Document",
    href: "/documents/new",
    icon: Icons.addDocument,
    description: "Create a new document",
    roles: ["Encoder"],
  },
  {
    name: "My Documents",
    href: "/documents/my",
    icon: Icons.myDocuments,
    description: "View documents I encoded",
    roles: ["Encoder"],
  },
  {
    name: "Help",
    href: "/help",
    icon: Icons.help,
    description: "Get help and guidance",
    roles: ["Encoder"],
  },
];

// Viewer Menu - Read-only access
export const viewerMenuItems: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Icons.dashboard,
    description: "View system overview",
    roles: ["Viewer"],
  },
  {
    name: "Documents",
    href: "/documents",
    icon: Icons.documents,
    description: "View all documents (read-only)",
    roles: ["Viewer"],
  },
];

// Get menu items based on user role
export function getMenuItemsForRole(
  role: "Admin" | "Encoder" | "Viewer"
): MenuItem[] {
  switch (role) {
    case "Admin":
      return adminMenuItems;
    case "Encoder":
      return encoderMenuItems;
    case "Viewer":
      return viewerMenuItems;
    default:
      return [];
  }
}
