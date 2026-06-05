import { Outlet } from "react-router-dom";
import { SidebarNav } from "./SidebarNav";

export function AppLayout() {
  return (
    <div className="flex h-screen bg-[#212121] overflow-hidden">
      <SidebarNav />
      <div className="flex-1 overflow-hidden min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
