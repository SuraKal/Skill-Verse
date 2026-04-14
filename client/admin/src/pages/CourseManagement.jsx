import React, { useState } from "react";
import { mockCourses } from "@/lib/mockData";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Star,
  Check,
  X,
  Trash2,
  Archive,
  Eye,
  BookOpen,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function CourseManagement() {
  const { toast } = useToast();
  const [courses, setCourses] = useState(mockCourses);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState([]);
  const [viewCourse, setViewCourse] = useState(null);

  const filtered = courses.filter((c) => {
    const matchSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.instructor.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const updateStatus = (id, status) => {
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    toast({ title: `Course ${status}` });
  };

  const deleteCourse = (id) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Course deleted" });
  };

  const bulkAction = (status) => {
    setCourses((prev) =>
      prev.map((c) => (selected.includes(c.id) ? { ...c, status } : c)),
    );
    setSelected([]);
    toast({ title: `${selected.length} courses ${status}` });
  };

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const columns = [
    {
      key: "select",
      label: "",
      render: (row) => (
        <Checkbox
          checked={selected.includes(row.id)}
          onCheckedChange={() => toggleSelect(row.id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: "title",
      label: "Course",
      render: (row) => (
        <div>
          <p className="font-medium text-sm">{row.title}</p>
          <p className="text-xs text-muted-foreground">{row.instructor}</p>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (row) => (
        <Badge variant="outline" className="text-[11px]">
          {row.category}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: "enrollments", label: "Enrollments" },
    {
      key: "rating",
      label: "Rating",
      render: (row) =>
        row.rating ? (
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-sm">{row.rating}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setViewCourse(row);
            }}
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          {row.status === "draft" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-emerald-600"
              onClick={(e) => {
                e.stopPropagation();
                updateStatus(row.id, "published");
              }}
            >
              <Check className="w-3.5 h-3.5" />
            </Button>
          )}
          {row.status === "published" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                updateStatus(row.id, "archived");
              }}
            >
              <Archive className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              deleteCourse(row.id);
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Course Management"
        description="Manage all platform courses"
      >
        {selected.length > 0 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => bulkAction("published")}
              className="gap-1"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Publish ({selected.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => bulkAction("archived")}
              className="gap-1"
            >
              <Archive className="w-3.5 h-3.5" />
              Archive ({selected.length})
            </Button>
          </>
        )}
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable columns={columns} data={filtered} />

      <Dialog open={!!viewCourse} onOpenChange={() => setViewCourse(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewCourse?.title}</DialogTitle>
          </DialogHeader>
          {viewCourse && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Instructor</p>
                  <p className="font-medium">{viewCourse.instructor}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium">{viewCourse.category}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <StatusBadge status={viewCourse.status} />
                </div>
                <div>
                  <p className="text-muted-foreground">Enrollments</p>
                  <p className="font-medium">{viewCourse.enrollments}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Materials</p>
                  <p className="font-medium">{viewCourse.materials} items</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Rating</p>
                  <p className="font-medium">{viewCourse.rating || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{viewCourse.createdDate}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
