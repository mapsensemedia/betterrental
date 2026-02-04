/**
 * PanelShell - Automatically selects the correct shell based on route context
 * Uses OpsShell for /ops/* routes, AdminShell for /admin/* routes
 */

import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
import { OpsShell } from "@/components/ops/OpsShell";

interface PanelShellProps {
  children: ReactNode;
  hideNav?: boolean;
}

export function PanelShell({ children, hideNav = false }: PanelShellProps) {
  const location = useLocation();
  const isOpsContext = location.pathname.startsWith("/ops");
  
  if (isOpsContext) {
    return <OpsShell hideNav={hideNav}>{children}</OpsShell>;
  }
  
  return <AdminShell hideNav={hideNav}>{children}</AdminShell>;
}
