import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color = "primary",
}) {
  const colorMap = {
    primary: "from-primary/10 to-primary/5 text-primary",
    accent: "from-accent/10 to-accent/5 text-accent",
    chart3: "from-orange-100 to-orange-50 text-orange-600",
    chart4: "from-red-100 to-red-50 text-red-500",
    chart5: "from-purple-100 to-purple-50 text-purple-600",
    blue: "from-blue-100 to-blue-50 text-blue-600",
    green: "from-emerald-100 to-emerald-50 text-emerald-600",
    pink: "from-pink-100 to-pink-50 text-pink-600",
  };

  return (
    <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {trend && (
              <p className="text-xs font-medium text-emerald-600">
                {trend}{" "}
                <span className="text-muted-foreground font-normal">
                  {trendLabel}
                </span>
              </p>
            )}
          </div>
          <div
            className={cn(
              "w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center",
              colorMap[color],
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </div>
    </Card>
  );
}
