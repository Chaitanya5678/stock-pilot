import { LogoutButton } from "@/components/auth/LogoutButton";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  STORE_MANAGER: "Store Manager",
  STORE_OPERATOR: "Store Operator",
  MAINTENANCE_USER: "Maintenance User",
};

export function AppHeader({ displayName, role }: { displayName: string; role: string }) {
  return (
    <header className="topbar">
      <div className="brand">StockPilot</div>
      <div className="topbar-right">
        <span className="user-chip">
          {displayName} <span className="role-pill">{ROLE_LABEL[role] ?? role}</span>
        </span>
        <LogoutButton />
      </div>
    </header>
  );
}
