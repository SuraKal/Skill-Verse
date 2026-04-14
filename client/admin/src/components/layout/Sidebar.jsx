import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardCheck,
  Award,
  Briefcase,
  Globe,
  Calendar,
  ArrowLeftRight,
  Settings,
  Shield,
  ShieldPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Users", icon: Users, path: "/users" },
  { label: "Admin Roles", icon: ShieldPlus, path: "/admins" },
  { label: "Courses", icon: BookOpen, path: "/courses" },
  { label: "Assessments", icon: ClipboardCheck, path: "/assessments" },
  { label: "Certificates", icon: Award, path: "/certificates" },
  { label: "Job Board", icon: Briefcase, path: "/jobs" },
  { label: "Communities", icon: Globe, path: "/communities" },
  { label: "Events", icon: Calendar, path: "/events" },
  { label: "Skill Exchange", icon: ArrowLeftRight, path: "/skill-exchange" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export default function Sidebar({ open, onClose }) {
  const location = useLocation();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-sidebar flex flex-col transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-6 h-16 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-sidebar-accent-foreground tracking-tight">
              SkillForge
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-sidebar-foreground"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50 mt-4 mb-1 ml-3">
          Management
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-accent-foreground">
              SA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
                Super Admin
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                admin@skillforge.io
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
