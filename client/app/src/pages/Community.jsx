import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { MOCK_COMMUNITIES, MOCK_COMMUNITY_MEMBERS } from "@/lib/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Users, Search } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function Community() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [joinedIds, setJoinedIds] = useState(
    MOCK_COMMUNITY_MEMBERS.filter((m) => m.user_email === user.email).map(
      (m) => m.community_id,
    ),
  );

  const communities = MOCK_COMMUNITIES;
  const filtered = communities.filter(
    (c) => !search || c.name?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleJoin = (community) => {
    setJoinedIds((prev) => [...prev, community.id]);
    toast.success("Joined! (Demo mode — not saved)");
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Communities"
        description="Join skill-based communities and collaborate"
      />

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search communities..."
          className="pl-9 max-w-md"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No communities yet"
          description="Check back later."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((community) => (
            <Card
              key={community.id}
              className="group hover:shadow-md transition-all"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/community/${community.id}`}>
                      <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
                        {community.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {community.category}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {community.visibility}
                      </Badge>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                  {community.description}
                </p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-muted-foreground">
                    {community.member_count || 0} members
                  </span>
                  {joinedIds.includes(community.id) ? (
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                      Joined
                    </Badge>
                  ) : (
                    <Button size="sm" onClick={() => handleJoin(community)}>
                      Join
                    </Button>
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
