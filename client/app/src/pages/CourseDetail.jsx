import React from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  MOCK_COURSES,
  MOCK_COURSE_MATERIALS,
  MOCK_ENROLLMENTS,
} from "@/lib/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  FileText,
  Video,
  HelpCircle,
  Link as LinkIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function CourseDetail() {
  const courseId = window.location.pathname.split("/courses/")[1];
  const { user } = useAuth();

  const course = MOCK_COURSES.find((c) => c.id === courseId);
  const materials = MOCK_COURSE_MATERIALS.filter(
    (m) => m.course_id === courseId,
  ).sort((a, b) => a.order - b.order);
  const enrollment = MOCK_ENROLLMENTS.find(
    (e) => e.course_id === courseId && e.user_email === user.email,
  );

  const typeIcons = {
    document: FileText,
    video: Video,
    quiz: HelpCircle,
    link: LinkIcon,
  };

  if (!course)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Course not found.
      </div>
    );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <Link
        to="/courses"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Courses
      </Link>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">{course.category}</Badge>
            <Badge variant="outline">{course.difficulty}</Badge>
          </div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-muted-foreground mt-2">{course.description}</p>
          <p className="text-sm text-muted-foreground mt-3">
            By{" "}
            <span className="font-medium text-foreground">
              {course.instructor_name}
            </span>
          </p>
          {enrollment && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Progress</span>
                <span className="font-medium">{enrollment.progress || 0}%</span>
              </div>
              <Progress value={enrollment.progress || 0} />
            </div>
          )}
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4">Course Materials</h2>
      {materials.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            No materials added yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {materials.map((m) => {
            const Icon = typeIcons[m.type] || FileText;
            return (
              <Card key={m.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{m.title}</p>
                    {m.content && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {m.content}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {m.type}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
