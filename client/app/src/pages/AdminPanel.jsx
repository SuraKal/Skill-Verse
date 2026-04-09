import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { MOCK_ALL_USERS, MOCK_DISCUSSIONS } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import { Shield, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminPanel() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [discussions, setDiscussions] = useState(MOCK_DISCUSSIONS);

  if (user?.role !== "admin") {
    return (
      <div className="p-8 text-center">
        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground mt-2">Admin access required.</p>
      </div>
    );
  }

  const filteredUsers = MOCK_ALL_USERS.filter(
    (u) =>
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()),
  );

  const deleteDiscussion = (id) => {
    setDiscussions((prev) => prev.filter((d) => d.id !== id));
    toast.success("Discussion removed (Demo mode — not saved)");
  };

  const roleBadgeColor = {
    admin: "bg-red-100 text-red-700",
    mentor: "bg-purple-100 text-purple-700",
    company: "bg-blue-100 text-blue-700",
    user: "bg-green-100 text-green-700",
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Admin Panel"
        description="Manage users and platform content"
      />
      <Tabs defaultValue="users">
        <TabsList className="mb-6">
          <TabsTrigger value="users">
            Users ({MOCK_ALL_USERS.length})
          </TabsTrigger>
          <TabsTrigger value="content">Content Moderation</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-9 max-w-md"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            {filteredUsers.map((u) => (
              <Card key={u.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <Badge className={roleBadgeColor[u.role] || ""}>
                    {u.role}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="content">
          <div className="space-y-3">
            {discussions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No discussions to moderate.
              </p>
            )}
            {discussions.map((d) => (
              <Card key={d.id}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{d.title}</p>
                    <p className="text-xs text-muted-foreground">
                      by {d.author_name} in {d.community_name}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                      {d.content}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive shrink-0"
                    onClick={() => deleteDiscussion(d.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
