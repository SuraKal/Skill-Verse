import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { MOCK_DISCUSSIONS, MOCK_DISCUSSION_REPLIES } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, ThumbsUp, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function DiscussionDetail() {
  const parts = window.location.pathname.split("/");
  const communityId = parts[2];
  const discussionId = parts[4];
  const { user } = useAuth();
  const [replyContent, setReplyContent] = useState("");
  const [extraReplies, setExtraReplies] = useState([]);

  const discussion = MOCK_DISCUSSIONS.find((d) => d.id === discussionId);
  const replies = [
    ...MOCK_DISCUSSION_REPLIES.filter((r) => r.discussion_id === discussionId),
    ...extraReplies,
  ];

  const handleReply = () => {
    if (!replyContent.trim()) return;
    const newReply = {
      id: `reply-${Date.now()}`,
      discussion_id: discussionId,
      author_email: user.email,
      author_name: user.full_name,
      content: replyContent,
      likes: 0,
      created_date: new Date().toISOString(),
    };
    setExtraReplies((prev) => [...prev, newReply]);
    setReplyContent("");
    toast.success("Reply posted! (Demo mode — not saved)");
  };

  if (!discussion)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Discussion not found.
      </div>
    );

  const typeColors = {
    discussion: "bg-blue-100 text-blue-700",
    question: "bg-amber-100 text-amber-700",
    suggestion: "bg-purple-100 text-purple-700",
    announcement: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <Link
        to={`/community/${communityId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Community
      </Link>

      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Badge
              className={`text-[10px] ${typeColors[discussion.type] || ""}`}
            >
              {discussion.type}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {discussion.created_date &&
                formatDistanceToNow(new Date(discussion.created_date), {
                  addSuffix: true,
                })}
            </span>
          </div>
          <h1 className="text-xl font-bold">{discussion.title}</h1>
          <div className="flex items-center gap-2 mt-3">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-muted">
                {discussion.author_name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">
              {discussion.author_name}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
            {discussion.content}
          </p>
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" /> {discussion.likes || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> {replies.length} replies
            </span>
          </div>
        </CardContent>
      </Card>

      <h3 className="font-semibold mb-4">Replies ({replies.length})</h3>
      <div className="space-y-3 mb-6">
        {replies.map((reply) => (
          <Card key={reply.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs bg-muted">
                    {reply.author_name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{reply.author_name}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {reply.created_date &&
                    formatDistanceToNow(new Date(reply.created_date), {
                      addSuffix: true,
                    })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{reply.content}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <ThumbsUp className="h-3 w-3" /> {reply.likes || 0}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a Reply</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Write your reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            rows={3}
          />
          <Button onClick={handleReply} disabled={!replyContent.trim()}>
            Post Reply
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
