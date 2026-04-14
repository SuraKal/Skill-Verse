import React, { useState } from "react";
import { mockAssessments, mockAssessmentResults } from "@/lib/mockData";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2, Lock, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function AssessmentManagement() {
  const { toast } = useToast();
  const [assessments, setAssessments] = useState(mockAssessments);
  const [viewAssessment, setViewAssessment] = useState(null);
  const [showResults, setShowResults] = useState(null);

  const toggleProctoring = (id) => {
    setAssessments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, proctoring: !a.proctoring } : a)),
    );
    toast({ title: "Proctoring updated" });
  };

  const closeAssessment = (id) => {
    setAssessments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "closed" } : a)),
    );
    toast({ title: "Assessment closed" });
  };

  const deleteAssessment = (id) => {
    setAssessments((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Assessment deleted" });
  };

  const resultsForAssessment = showResults
    ? mockAssessmentResults.filter((r) => r.assessmentId === showResults.id)
    : [];

  const columns = [
    {
      key: "title",
      label: "Assessment",
      render: (row) => (
        <div>
          <p className="font-medium text-sm">{row.title}</p>
          <p className="text-xs text-muted-foreground">{row.course}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: "questions", label: "Questions" },
    {
      key: "passingScore",
      label: "Pass Score",
      render: (row) => `${row.passingScore}%`,
    },
    {
      key: "timeLimit",
      label: "Time",
      render: (row) => (
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {row.timeLimit}m
        </span>
      ),
    },
    {
      key: "proctoring",
      label: "Proctoring",
      render: (row) => (
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Switch
            checked={row.proctoring}
            onCheckedChange={() => toggleProctoring(row.id)}
          />
          {row.proctoring && <Lock className="w-3 h-3 text-primary" />}
        </div>
      ),
    },
    { key: "submissions", label: "Submissions" },
    {
      key: "passRate",
      label: "Pass Rate",
      render: (row) => (row.passRate ? `${row.passRate}%` : "—"),
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
              setShowResults(row);
            }}
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          {row.status === "published" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                closeAssessment(row.id);
              }}
            >
              <XCircle className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              deleteAssessment(row.id);
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const resultColumns = [
    { key: "student", label: "Student" },
    {
      key: "score",
      label: "Score",
      render: (row) => <span className="font-semibold">{row.score}%</span>,
    },
    {
      key: "passed",
      label: "Result",
      render: (row) => (
        <Badge
          className={
            row.passed
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"
          }
        >
          {row.passed ? (
            <>
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Passed
            </>
          ) : (
            <>
              <XCircle className="w-3 h-3 mr-1" />
              Failed
            </>
          )}
        </Badge>
      ),
    },
    { key: "submittedDate", label: "Submitted" },
  ];

  return (
    <div>
      <PageHeader
        title="Assessment Management"
        description="Manage quizzes, exams, and submissions"
      />
      <DataTable columns={columns} data={assessments} />

      <Dialog open={!!showResults} onOpenChange={() => setShowResults(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Results: {showResults?.title}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground mb-4">
            {resultsForAssessment.length} submissions · Pass rate:{" "}
            {showResults?.passRate}%
          </div>
          <DataTable columns={resultColumns} data={resultsForAssessment} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
