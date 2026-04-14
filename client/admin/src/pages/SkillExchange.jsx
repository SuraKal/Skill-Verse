import React, { useState } from "react";
import { mockSkillProfiles, mockSkillMatches } from "@/lib/mockData";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Star, MessageSquare } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function SkillExchange() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState(mockSkillProfiles);
  const [matches, setMatches] = useState(mockSkillMatches);

  const removeProfile = (id) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Profile removed" });
  };

  const profileColumns = [
    {
      key: "user",
      label: "User",
      render: (row) => <span className="font-medium">{row.user}</span>,
    },
    {
      key: "teaching",
      label: "Teaching",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.teaching.map((s) => (
            <Badge
              key={s}
              variant="outline"
              className="text-[10px] bg-primary/5 text-primary border-primary/20"
            >
              {s}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "learning",
      label: "Learning",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.learning.map((s) => (
            <Badge
              key={s}
              variant="outline"
              className="text-[10px] bg-accent/10 text-accent border-accent/20"
            >
              {s}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "rating",
      label: "Rating",
      render: (row) => (
        <span className="flex items-center gap-1">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          {row.rating}
        </span>
      ),
    },
    { key: "sessions", label: "Sessions" },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            removeProfile(row.id);
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      ),
    },
  ];

  const matchColumns = [
    {
      key: "teacher",
      label: "Teacher",
      render: (row) => <span className="font-medium">{row.teacher}</span>,
    },
    { key: "learner", label: "Learner" },
    {
      key: "skill",
      label: "Skill",
      render: (row) => (
        <Badge variant="outline" className="text-[11px]">
          {row.skill}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "rating",
      label: "Rating",
      render: (row) =>
        row.rating ? (
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {row.rating}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      key: "feedback",
      label: "Feedback",
      render: (row) =>
        row.feedback ? (
          <p className="text-xs text-muted-foreground truncate max-w-[200px] flex items-center gap-1">
            <MessageSquare className="w-3 h-3 flex-shrink-0" />
            {row.feedback}
          </p>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Skill Exchange"
        description="Manage skill profiles and peer matches"
      />
      <Tabs defaultValue="profiles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profiles">Skill Profiles</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
        </TabsList>
        <TabsContent value="profiles">
          <DataTable columns={profileColumns} data={profiles} />
        </TabsContent>
        <TabsContent value="matches">
          <DataTable columns={matchColumns} data={matches} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
