import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { MOCK_JOBS } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Briefcase, MapPin, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function JobDetail() {
  const jobId = window.location.pathname.split("/jobs/")[1];
  const { user } = useAuth();
  const [coverLetter, setCoverLetter] = useState("");
  const [applied, setApplied] = useState(false);

  const job = MOCK_JOBS.find((j) => j.id === jobId);

  const handleApply = () => {
    setApplied(true);
    toast.success("Application submitted! (Demo mode — not saved)");
  };

  if (!job)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Job not found.
      </div>
    );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <Link
        to="/jobs"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Jobs
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Briefcase className="h-7 w-7 text-accent" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">{job.title}</h1>
                  <p className="text-muted-foreground">{job.company_name}</p>
                  <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> {job.location}
                      </span>
                    )}
                    {job.salary_range && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" /> {job.salary_range}
                      </span>
                    )}
                    <Badge variant="outline">
                      {job.type?.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <p className="whitespace-pre-wrap text-sm">{job.description}</p>
              </div>
              {job.required_skills?.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">
                    Required Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {job.required_skills.map((s, i) => (
                      <Badge key={i} variant="secondary">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {!applied ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Apply Now</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Cover letter (optional)"
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={4}
                />
                <Button onClick={handleApply} className="w-full">
                  Submit Application
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-primary/20">
              <CardContent className="p-5 text-center">
                <Badge className="bg-emerald-100 text-emerald-700">
                  Application Submitted
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  You applied for this position.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
