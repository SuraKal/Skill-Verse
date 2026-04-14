import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  published: "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  accepted: "bg-emerald-100 text-emerald-700 border-emerald-200",
  upcoming: "bg-blue-100 text-blue-700 border-blue-200",
  draft: "bg-amber-100 text-amber-700 border-amber-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  reviewing: "bg-amber-100 text-amber-700 border-amber-200",
  suggested: "bg-amber-100 text-amber-700 border-amber-200",
  suspended: "bg-red-100 text-red-700 border-red-200",
  closed: "bg-gray-100 text-gray-700 border-gray-200",
  archived: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  declined: "bg-red-100 text-red-700 border-red-200",
  revoked: "bg-red-100 text-red-700 border-red-200",
  shortlisted: "bg-purple-100 text-purple-700 border-purple-200",
  public: "bg-blue-100 text-blue-700 border-blue-200",
  private: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function StatusBadge({ status }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[11px] font-semibold capitalize border",
        statusStyles[status] || "bg-muted text-muted-foreground",
      )}
    >
      {status?.replace(/_/g, " ")}
    </Badge>
  );
}
