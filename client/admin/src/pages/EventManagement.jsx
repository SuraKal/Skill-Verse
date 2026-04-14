import React, { useState } from "react";
import { mockEvents } from "@/lib/mockData";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Check,
  X,
  Trash2,
  Pencil,
  MapPin,
  Calendar,
  Users,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function EventManagement() {
  const { toast } = useToast();
  const [events, setEvents] = useState(mockEvents);
  const [editEvent, setEditEvent] = useState(null);
  const [editData, setEditData] = useState({});

  const approveEvent = (id) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "upcoming" } : e)),
    );
    toast({ title: "Event approved" });
  };

  const cancelEvent = (id) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "cancelled" } : e)),
    );
    toast({ title: "Event cancelled" });
  };

  const deleteEvent = (id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    toast({ title: "Event deleted" });
  };

  const openEdit = (event) => {
    setEditData({ ...event });
    setEditEvent(event);
  };

  const saveEdit = () => {
    setEvents((prev) => prev.map((e) => (e.id === editData.id ? editData : e)));
    setEditEvent(null);
    toast({ title: "Event updated" });
  };

  const columns = [
    {
      key: "title",
      label: "Event",
      render: (row) => (
        <div>
          <p className="font-medium text-sm">{row.title}</p>
          <p className="text-xs text-muted-foreground">{row.organizer}</p>
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
      key: "date",
      label: "Date",
      render: (row) => (
        <span className="flex items-center gap-1 text-sm">
          <Calendar className="w-3 h-3" />
          {row.date}
        </span>
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
      key: "registrations",
      label: "Registrations",
      render: (row) => (
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {row.registrations}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
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
              openEdit(row);
            }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          {row.status === "pending" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-emerald-600"
              onClick={(e) => {
                e.stopPropagation();
                approveEvent(row.id);
              }}
            >
              <Check className="w-3.5 h-3.5" />
            </Button>
          )}
          {(row.status === "upcoming" || row.status === "pending") && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                cancelEvent(row.id);
              }}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              deleteEvent(row.id);
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Event Management"
        description="Manage platform events and registrations"
      />
      <DataTable columns={columns} data={events} />

      <Dialog open={!!editEvent} onOpenChange={() => setEditEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={editData.title || ""}
                onChange={(e) =>
                  setEditData((p) => ({ ...p, title: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editData.date || ""}
                  onChange={(e) =>
                    setEditData((p) => ({ ...p, date: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={editData.location || ""}
                  onChange={(e) =>
                    setEditData((p) => ({ ...p, location: e.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>Organizer</Label>
              <Input
                value={editData.organizer || ""}
                onChange={(e) =>
                  setEditData((p) => ({ ...p, organizer: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
