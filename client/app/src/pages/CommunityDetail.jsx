import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  MOCK_COMMUNITIES,
  MOCK_DISCUSSIONS,
  MOCK_COMMUNITY_MEMBERS,
} from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Plus, MessageSquare, ThumbsUp, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function CommunityDetail() {
  const communityId = window.location.pathname
    .split("/community/")[1]
    ?.split("/")[0];
  const { user } = useAuth();
  const [postOpen, setPostOpen] = useState(false);
  const [postForm, setPostForm] = useState({
    title: "",
    content: "",
    type: "discussion",
  });
  const [extraDiscussions, setExtraDiscussions] = useState([]);

  const community = MOCK_COMMUNITIES.find((c) => c.id === communityId);
  const discussions = [
    ...MOCK_DISCUSSIONS.filter((d) => d.community_id === communityId),
    ...extraDiscussions,
  ];
  const members = MOCK_COMMUNITY_MEMBERS.filter(
    (m) => m.community_id === communityId,
  );

  const handlePost = () => {
    if (!postForm.title || !postForm.content) return;
    const newPost = {
      id: `d-new-${Date.now()}`,
      ...postForm,
      author_email: user.email,
      author_name: user.full_name,
      community_id: communityId,
      community_name: community?.name,
      likes: 0,
      replies_count: 0,
      tags: [],
      created_date: new Date().toISOString(),
    };
    setExtraDiscussions((prev) => [newPost, ...prev]);
    setPostOpen(false);
    setPostForm({ title: "", content: "", type: "discussion" });
    toast.success("Post created! (Demo mode — not saved)");
  };

  if (!community)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Community not found.
      </div>
    );

  const typeColors = {
    discussion: "bg-blue-100 text-blue-700",
    question: "bg-amber-100 text-amber-700",
    suggestion: "bg-purple-100 text-purple-700",
    announcement: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <Link
        to="/community"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Communities
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{community.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {community.description}
          </p>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary">{community.category}</Badge>
            <Badge variant="outline">{members.length} members</Badge>
          </div>
        </div>
        <Dialog open={postOpen} onOpenChange={setPostOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> New Post
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Title"
                value={postForm.title}
                onChange={(e) =>
                  setPostForm({ ...postForm, title: e.target.value })
                }
              />
              <Textarea
                placeholder="Write your post..."
                value={postForm.content}
                onChange={(e) =>
                  setPostForm({ ...postForm, content: e.target.value })
                }
                rows={5}
              />
              <Select
                value={postForm.type}
                onValueChange={(v) => setPostForm({ ...postForm, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discussion">Discussion</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                onClick={handlePost}
                disabled={!postForm.title || !postForm.content}
              >
                Post
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {discussions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground text-sm">
                No discussions yet. Start the conversation!
              </CardContent>
            </Card>
          ) : (
            discussions.map((d) => (
              <Link
                key={d.id}
                to={`/community/${communityId}/discussion/${d.id}`}
              >
                <Card className="hover:shadow-sm transition-shadow mb-3">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 mt-0.5">
                        <AvatarFallback className="text-xs bg-muted">
                          {d.author_name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`text-[10px] ${typeColors[d.type] || ""}`}
                          >
                            {d.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {d.created_date &&
                              formatDistanceToNow(new Date(d.created_date), {
                                addSuffix: true,
                              })}
                          </span>
                        </div>
                        <h3 className="font-semibold text-sm mt-1">
                          {d.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {d.content}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" /> {d.likes || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />{" "}
                            {d.replies_count || 0} replies
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px] bg-muted">
                      {m.user_name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{m.user_name}</span>
                  {m.role !== "member" && (
                    <Badge variant="outline" className="text-[10px]">
                      {m.role}
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
