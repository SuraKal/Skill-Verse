import React from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  MOCK_ENROLLMENTS,
  MOCK_SKILL_PROFILES,
  MOCK_CERTIFICATES,
  MOCK_EVENTS,
  MOCK_JOBS,
} from "@/lib/mockData";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import StatCard from "@/components/shared/StatCard";
import {
  BookOpen,
  ArrowLeftRight,
  Briefcase,
  Award,
  Calendar,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();

  const enrollments = MOCK_ENROLLMENTS.filter(
    (e) => e.user_email === user.email,
  );
  const skillProfiles = MOCK_SKILL_PROFILES.filter(
    (s) => s.user_email === user.email,
  );
  const certificates = MOCK_CERTIFICATES.filter(
    (c) => c.user_email === user.email,
  );
  const events = MOCK_EVENTS.filter((e) => e.status === "upcoming").slice(0, 4);
  const jobs = MOCK_JOBS.filter((j) => j.status === "open").slice(0, 4);
  const activeEnrollments = enrollments.filter(
    (e) => e.status !== "completed" && e.status !== "dropped",
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.full_name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's your learning progress and recommendations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Courses Enrolled"
          value={enrollments.length}
          icon={BookOpen}
        />
        <StatCard
          title="Skills Listed"
          value={skillProfiles.length}
          icon={ArrowLeftRight}
        />
        <StatCard
          title="Certificates"
          value={certificates.length}
          icon={Award}
        />
        <StatCard
          title="Reputation"
          value={user?.reputation_score?.toFixed(1) || "0.0"}
          icon={TrendingUp}
          subtitle={`${user?.total_ratings || 0} ratings`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Active Courses</CardTitle>
            <Link to="/courses">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeEnrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No active courses. Browse and enroll to get started!
              </p>
            ) : (
              activeEnrollments.map((e) => (
                <div key={e.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {e.course_title}
                    </p>
                    <Progress value={e.progress || 0} className="h-1.5 mt-1" />
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {e.progress || 0}%
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Upcoming Events</CardTitle>
            <Link to="/events">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ev.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(ev.date).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {ev.type}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Latest Jobs</CardTitle>
            <Link to="/jobs">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobs.map((job) => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="flex items-center gap-3 hover:bg-muted/50 rounded-lg p-1 -mx-1 transition-colors"
              >
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Briefcase className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{job.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {job.company_name}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {job.type?.replace("_", " ")}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">My Skills</CardTitle>
            <Link to="/skills">
              <Button variant="ghost" size="sm">
                Manage <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {skillProfiles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No skills listed yet.
              </p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Teaching
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {skillProfiles
                      .filter((s) => s.skill_type === "teaching")
                      .map((s) => (
                        <Badge
                          key={s.id}
                          className="bg-emerald-100 text-emerald-700 text-xs"
                        >
                          {s.skill_name}
                        </Badge>
                      ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Learning
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {skillProfiles
                      .filter((s) => s.skill_type === "learning")
                      .map((s) => (
                        <Badge
                          key={s.id}
                          className="bg-blue-100 text-blue-700 text-xs"
                        >
                          {s.skill_name}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
