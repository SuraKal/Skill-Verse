import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  BookOpen,
  Users,
  Briefcase,
  Calendar,
  Award,
  BarChart3,
  MessageSquare,
  Shield,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/",
    roles: ["learner", "mentor", "admin", "company"],
  },
  {
    icon: ArrowLeftRight,
    label: "Skill Exchange",
    path: "/skills",
    roles: ["learner", "mentor", "admin"],
  },
  {
    icon: BookOpen,
    label: "Courses",
    path: "/courses",
    roles: ["learner", "mentor", "admin"],
  },
  {
    icon: GraduationCap,
    label: "Assessments",
    path: "/assessments",
    roles: ["learner", "mentor", "admin"],
  },
  {
    icon: Award,
    label: "Certificates",
    path: "/certificates",
    roles: ["learner", "mentor", "admin"],
  },
  {
    icon: Briefcase,
    label: "Jobs",
    path: "/jobs",
    roles: ["learner", "mentor", "admin", "company"],
  },
  {
    icon: Users,
    label: "Community",
    path: "/community",
    roles: ["learner", "mentor", "admin", "company"],
  },
  {
    icon: Calendar,
    label: "Events",
    path: "/events",
    roles: ["learner", "mentor", "admin", "company"],
  },
  {
    icon: MessageSquare,
    label: "Messages",
    path: "/messages",
    roles: ["learner", "mentor", "admin", "company"],
  },
  {
    icon: BarChart3,
    label: "Analytics",
    path: "/analytics",
    roles: ["admin", "mentor", "company"],
  },
  { icon: Shield, label: "Admin", path: "/admin", roles: ["admin"] },
];

export default function Sidebar({ user }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const userRole = user?.role || "learner";

  const filteredItems = navItems.filter((item) =>
    item.roles.includes(userRole),
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-6 border-b border-sidebar-border",
          collapsed && "justify-center px-2",
        )}
      >
        <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <GraduationCap className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-sidebar-foreground tracking-tight">
            SkillVerse
          </span>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
                collapsed && "justify-center px-2",
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "p-3 border-t border-sidebar-border",
          collapsed && "flex justify-center",
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex w-full justify-center text-muted-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden lg:flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0",
          collapsed ? "w-[68px]" : "w-64",
        )}
      >
        <SidebarContent />
      </div>
    </>
  );
}
