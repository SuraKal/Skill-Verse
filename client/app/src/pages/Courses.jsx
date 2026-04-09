import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { MOCK_COURSES, MOCK_ENROLLMENTS } from "@/lib/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { BookOpen, Users, Search } from "lucide-react";
import { Link } from "react-router-dom";

const CATEGORIES = [
  "programming",
  "design",
  "business",
  "language",
  "music",
  "science",
  "math",
  "writing",
  "marketing",
  "other",
];

export default function Courses() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const courses = MOCK_COURSES.filter((c) => c.status === "published");
  const enrollments = MOCK_ENROLLMENTS.filter(
    (e) => e.user_email === user.email,
  );
  const enrolledIds = enrollments.map((e) => e.course_id);

  const filtered = courses.filter((c) => {
    const matchSearch =
      !search || c.title?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "all" || c.category === category;
    return matchSearch && matchCategory;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Courses"
        description="Browse and enroll in courses to learn new skills"
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses found"
          description="Try adjusting your search filters."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((course) => (
            <Card
              key={course.id}
              className="group hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <div className="h-36 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <BookOpen className="h-10 w-10 text-primary/40" />
              </div>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {course.category}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {course.difficulty}
                  </Badge>
                </div>
                <Link to={`/courses/${course.id}`}>
                  <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-1">
                    {course.title}
                  </h3>
                </Link>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {course.description}
                </p>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" /> {course.enrollment_count || 0}{" "}
                    enrolled
                  </div>
                  {enrolledIds.includes(course.id) ? (
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                      Enrolled
                    </Badge>
                  ) : (
                    <Link to={`/courses/${course.id}`}>
                      <Button size="sm">View Course</Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
