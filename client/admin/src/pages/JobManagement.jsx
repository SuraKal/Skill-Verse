import React, { useState } from "react";
import { mockJobs, mockApplications } from "@/lib/mockData";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X, Trash2, Eye, MapPin, Building2, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function JobManagement() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState(mockJobs);
  const [applications, setApplications] = useState(mockApplications);
  const [viewJob, setViewJob] = useState(null);

  const approveJob = (id) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: "active" } : j)),
    );
    toast({ title: "Job approved" });
  };

  const rejectJob = (id) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: "closed" } : j)),
    );
    toast({ title: "Job rejected" });
  };

  const deleteJob = (id) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    toast({ title: "Job deleted" });
  };

  const updateAppStatus = (appId, status) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status } : a)),
    );
    toast({ title: "Application status updated" });
  };

  const jobApps = viewJob
    ? applications.filter((a) => a.jobId === viewJob.id)
    : [];

  const columns = [
    {
      key: "title",
      label: "Job",
      render: (row) => (
        <div>
          <p className="font-medium text-sm">{row.title}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {row.company}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (row) => (
        <Badge variant="outline" className="text-[11px]">
          {row.type}
        </Badge>
      ),
    },
    {
      key: "location",
      label: "Location",
      render: (row) => (
        <span className="flex items-center gap-1 text-sm">
          <MapPin className="w-3 h-3" />
          {row.location}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "applications",
      label: "Applications",
      render: (row) => (
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {row.applications}
        </span>
      ),
    },
    { key: "postedDate", label: "Posted" },
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
              setViewJob(row);
            }}
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          {row.status === "pending" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-emerald-600"
                onClick={(e) => {
                  e.stopPropagation();
                  approveJob(row.id);
                }}
              >
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  rejectJob(row.id);
                }}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              deleteJob(row.id);
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const appColumns = [
    {
      key: "applicant",
      label: "Applicant",
      render: (row) => <span className="font-medium">{row.applicant}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: "appliedDate", label: "Applied" },
    {
      key: "coverLetter",
      label: "Cover Letter",
      render: (row) => (
        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
          {row.coverLetter}
        </p>
      ),
    },
    {
      key: "actions",
      label: "Change Status",
      render: (row) => (
        <Select
          value={row.status}
          onValueChange={(val) => updateAppStatus(row.id, val)}
        >
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reviewing">Reviewing</SelectItem>
            <SelectItem value="shortlisted">Shortlisted</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Job Board Management"
        description="Manage job postings and applications"
      />
      <DataTable columns={columns} data={jobs} />

      <Dialog open={!!viewJob} onOpenChange={() => setViewJob(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewJob?.title} — Applications</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground mb-4">
            {viewJob?.company} · {viewJob?.location} · {viewJob?.type} ·{" "}
            {jobApps.length} applications
          </div>
          <DataTable columns={appColumns} data={jobApps} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
