import React, { useState } from "react";
import { mockCommunities, mockDiscussions } from "@/lib/mockData";
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
import { Eye, Trash2, Archive, Users, MessageSquare, Flag } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function CommunityManagement() {
  const { toast } = useToast();
  const [communities, setCommunities] = useState(mockCommunities);
  const [discussions, setDiscussions] = useState(mockDiscussions);
  const [viewCommunity, setViewCommunity] = useState(null);

  const deleteCommunity = (id) => {
    setCommunities((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Community deleted" });
  };

  const changeVisibility = (id, visibility) => {
    setCommunities((prev) =>
      prev.map((c) => (c.id === id ? { ...c, visibility } : c)),
    );
    toast({ title: "Visibility updated" });
  };

  const removeDiscussion = (id) => {
    setDiscussions((prev) => prev.filter((d) => d.id !== id));
    toast({ title: "Discussion removed" });
  };

  const communityDiscussions = viewCommunity
    ? discussions.filter((d) => d.communityId === viewCommunity.id)
    : [];

  const columns = [
    {
      key: "name",
      label: "Community",
      render: (row) => (
        <div>
          <p className="font-medium text-sm">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.category}</p>
        </div>
      ),
    },
    {
      key: "visibility",
      label: "Visibility",
      render: (row) => (
        <Select
          value={row.visibility}
          onValueChange={(val) => changeVisibility(row.id, val)}
        >
          <SelectTrigger
            className="h-8 w-24 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="private">Private</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "members",
      label: "Members",
      render: (row) => (
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {row.members.toLocaleString()}
        </span>
      ),
    },
    {
      key: "discussions",
      label: "Discussions",
      render: (row) => (
        <span className="flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          {row.discussions}
        </span>
      ),
    },
    { key: "createdDate", label: "Created" },
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
              setViewCommunity(row);
            }}
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              deleteCommunity(row.id);
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const discColumns = [
    {
      key: "title",
      label: "Discussion",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.flagged && (
            <Flag className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
          )}
          <span className="font-medium text-sm">{row.title}</span>
        </div>
      ),
    },
    { key: "author", label: "Author" },
    { key: "replies", label: "Replies" },
    { key: "createdDate", label: "Date" },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            removeDiscussion(row.id);
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Community Management"
        description="Manage communities and discussions"
      />
      <DataTable columns={columns} data={communities} />

      <Dialog
        open={!!viewCommunity}
        onOpenChange={() => setViewCommunity(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewCommunity?.name} — Discussions</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground mb-4">
            {viewCommunity?.members.toLocaleString()} members ·{" "}
            {communityDiscussions.length} discussions
          </div>
          <DataTable columns={discColumns} data={communityDiscussions} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
