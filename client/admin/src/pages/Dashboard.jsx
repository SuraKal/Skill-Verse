import React from "react";
import {
  Users,
  BookOpen,
  GraduationCap,
  Briefcase,
  Globe,
  Calendar,
  ClipboardCheck,
  Award,
} from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import PageHeader from "@/components/shared/PageHeader";

const stats = [
  {
    title: "Total Users",
    value: "1,450",
    icon: Users,
    trend: "+12.5%",
    trendLabel: "vs last month",
    color: "primary",
  },
  {
    title: "Active Courses",
    value: "10",
    icon: BookOpen,
    trend: "+3",
    trendLabel: "this month",
    color: "accent",
  },
  {
    title: "Enrollments",
    value: "2,146",
    icon: GraduationCap,
    trend: "+18.2%",
    trendLabel: "vs last month",
    color: "green",
  },
  {
    title: "Jobs Posted",
    value: "7",
    icon: Briefcase,
    trend: "+2",
    trendLabel: "this week",
    color: "chart3",
  },
  { title: "Communities", value: "6", icon: Globe, color: "blue" },
  { title: "Events", value: "6", icon: Calendar, color: "pink" },
  { title: "Assessments", value: "6", icon: ClipboardCheck, color: "chart5" },
  {
    title: "Certificates",
    value: "8",
    icon: Award,
    trend: "+3",
    trendLabel: "this month",
    color: "chart3",
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Platform overview and key metrics"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <DashboardCharts />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
