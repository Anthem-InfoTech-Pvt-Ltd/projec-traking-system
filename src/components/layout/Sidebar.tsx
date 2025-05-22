import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  LayoutDashboard,
  Users,
  FileText,
  DollarSign,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();

  const isAdmin = user && user.role === "admin";

  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground flex flex-col fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out",
        isOpen ? "w-64" : "w-20",
        "md:relative"
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        <div
          className={cn(
            "flex items-center",
            isOpen ? "justify-start" : "justify-center w-full"
          )}
        >
          {isOpen ? (
            <div className="flex items-center">
              <img
                src="/images/6123bc56-fe6c-4d47-a531-d13782c5f5c0.png"
                alt="Anthem Infotech"
                className="h-10"
              />
            </div>
          ) : (
            <img
              src="/images/6123bc56-fe6c-4d47-a531-d13782c5f5c0.png"
              alt="Anthem Infotech"
              className="h-9 w-9 object-contain"
              style={{ objectPosition: "left" }}
            />
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn(
            "text-sidebar-foreground hover:bg-sidebar-accent",
            !isOpen && "hidden md:flex"
          )}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              !isOpen && "rotate-180"
            )}
          />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-2 space-y-1">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              cn(
                "flex items-center px-4 py-2 text-sm font-medium rounded-md",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                !isOpen && "justify-center"
              )
            }
          >
            <LayoutDashboard className="h-5 w-5" />
            {isOpen && <span className="ml-3">Dashboard</span>}
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/dashboard/clients"
              className={({ isActive }) =>
                cn(
                  "flex items-center px-4 py-2 text-sm font-medium rounded-md",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  !isOpen && "justify-center"
                )
              }
            >
              <Users className="h-5 w-5" />
              {isOpen && <span className="ml-3">Clients</span>}
            </NavLink>
          )}

          <NavLink
            to="/dashboard/tasks"
            className={({ isActive }) =>
              cn(
                "flex items-center px-4 py-2 text-sm font-medium rounded-md",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                !isOpen && "justify-center"
              )
            }
          >
            <FileText className="h-5 w-5" />
            {isOpen && <span className="ml-3">Tasks</span>}
          </NavLink>

          <NavLink
            to="/dashboard/payments"
            className={({ isActive }) =>
              cn(
                "flex items-center px-4 py-2 text-sm font-medium rounded-md",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                !isOpen && "justify-center"
              )
            }
          >
            <DollarSign className="h-5 w-5" />
            {isOpen && <span className="ml-3">Payments</span>}
          </NavLink>

          <NavLink
            to="/dashboard/notifications"
            className={({ isActive }) =>
              cn(
                "flex items-center px-4 py-2 text-sm font-medium rounded-md",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                !isOpen && "justify-center"
              )
            }
          >
            <Bell className="h-5 w-5" />
            {isOpen && <span className="ml-3">Notifications</span>}
          </NavLink>

          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) =>
              cn(
                "flex items-center px-4 py-2 text-sm font-medium rounded-md",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                !isOpen && "justify-center"
              )
            }
          >
            <Settings className="h-5 w-5" />
            {isOpen && <span className="ml-3">Settings</span>}
          </NavLink>
        </nav>
      </div>

      <div className="px-2 py-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={logout}
          className={cn(
            "flex items-center w-full px-4 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md",
            !isOpen && "justify-center"
          )}
        >
          <LogOut className="h-5 w-5" />
          {isOpen && <span className="ml-3">Logout</span>}
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
