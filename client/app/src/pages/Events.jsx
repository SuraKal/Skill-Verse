import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { MOCK_EVENTS, MOCK_EVENT_REGISTRATIONS } from "@/lib/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Calendar, MapPin, Video, Clock, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Events() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [registeredIds, setRegisteredIds] = useState(
    MOCK_EVENT_REGISTRATIONS.filter((r) => r.user_email === user.email).map(
      (r) => r.event_id,
    ),
  );

  const events = MOCK_EVENTS;
  const filtered = events.filter(
    (e) => !search || e.title?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleRegister = (event) => {
    setRegisteredIds((prev) => [...prev, event.id]);
    toast.success("Registered! (Demo mode — not saved)");
  };

  const statusColors = {
    upcoming: "bg-blue-100 text-blue-700",
    ongoing: "bg-emerald-100 text-emerald-700",
    completed: "bg-muted text-muted-foreground",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Events"
        description="Discover workshops, meetups, and learning events"
      />

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          className="pl-9 max-w-md"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No events yet"
          description="Check back later."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((event) => (
            <Card
              key={event.id}
              className="group hover:shadow-md transition-all overflow-hidden"
            >
              <div className="h-28 bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center">
                <Calendar className="h-8 w-8 text-primary/40" />
              </div>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    className={`text-[10px] ${statusColors[event.status] || ""}`}
                  >
                    {event.status}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {event.type}
                  </Badge>
                </div>
                <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                  {event.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {event.description}
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />{" "}
                    {event.date &&
                      format(new Date(event.date), "MMM d, h:mm a")}
                  </span>
                  {event.is_virtual ? (
                    <span className="flex items-center gap-1">
                      <Video className="h-3 w-3" /> Virtual
                    </span>
                  ) : event.location ? (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {event.location}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-muted-foreground">
                    {event.registration_count || 0}/{event.max_attendees || "∞"}
                  </span>
                  {registeredIds.includes(event.id) ? (
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                      Registered
                    </Badge>
                  ) : event.status === "upcoming" ? (
                    <Button size="sm" onClick={() => handleRegister(event)}>
                      Register
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
