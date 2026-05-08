import { ReactNode } from "react";
import { PublicHeader } from "./PublicHeader";
import { RolePanelSidebar } from "./RolePanelSidebar";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />
      <div className="flex flex-1 w-full">
        <RolePanelSidebar />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}