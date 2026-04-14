import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { recentActivity } from "@/lib/mockData";
import {
  UserPlus,
  BookOpen,
  Briefcase,
  Award,
  Calendar,
  Users,
  TrendingUp,
} from "lucide-react";

const iconMap = {
  user: UserPlus,
  book: BookOpen,
  briefcase: Briefcase,
  award: Award,
  calendar: Calendar,
  users: Users,
  trending: TrendingUp,
};

const colorMap = {
  signup: "bg-primary/10 text-primary",
  course: "bg-accent/10 text-accent",
  job: "bg-orange-100 text-orange-600",
  certificate: "bg-purple-100 text-purple-600",
  event: "bg-blue-100 text-blue-600",
  community: "bg-emerald-100 text-emerald-600",
};

export default function ActivityFeed() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 px-4 pb-4">
        {recentActivity.map((item) => {
          const Icon = iconMap[item.icon] || UserPlus;
          return (
            <div
              key={item.id}
              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[item.type] || "bg-muted text-muted-foreground"}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-snug">
                  {item.message}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.time}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
