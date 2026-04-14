import React, { useState } from "react";
import { mockAdminRoles, PRIVILEGE_MODULES } from "@/lib/mockData";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import {
  ShieldPlus,
  Eye,
  Pencil,
  Trash2,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const emptyForm = {
  name: "",
  email: "",
  description: "",
  privileges: {},
};

function PrivilegeEditor({ privileges, onChange }) {
  const [expanded, setExpanded] = useState({});

  const toggleModule = (module) => {
    setExpanded((prev) => ({ ...prev, [module]: !prev[module] }));
  };

  const toggleAction = (module, action) => {
    const current = privileges[module] || [];
    const updated = current.includes(action)
      ? current.filter((a) => a !== action)
      : [...current, action];
    onChange({ ...privileges, [module]: updated });
  };

  const toggleAllModule = (module, actions) => {
    const current = privileges[module] || [];
    const allSelected = actions.every((a) => current.includes(a));
    onChange({ ...privileges, [module]: allSelected ? [] : [...actions] });
  };

  return (
    <div className="space-y-1">
      {PRIVILEGE_MODULES.map(({ module, label, actions }) => {
        const selected = privileges[module] || [];
        const allSelected = actions.every((a) => selected.includes(a));
        const someSelected = selected.length > 0 && !allSelected;
        const isOpen = expanded[module];

        return (
          <div
            key={module}
            className="border border-border rounded-lg overflow-hidden"
          >
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => toggleModule(module)}
            >
              <Checkbox
                checked={allSelected}
                data-state={
                  someSelected
                    ? "indeterminate"
                    : allSelected
                      ? "checked"
                      : "unchecked"
                }
                className={someSelected ? "opacity-60" : ""}
                onCheckedChange={() => toggleAllModule(module, actions)}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="flex-1 text-sm font-medium">{label}</span>
              {selected.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {selected.length}/{actions.length}
                </Badge>
              )}
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            {isOpen && (
              <div className="px-4 pb-3 pt-1 bg-muted/20 flex flex-wrap gap-3">
                {actions.map((action) => (
                  <label
                    key={action}
                    className="flex items-center gap-2 cursor-pointer select-none"
                  >
                    <Checkbox
                      checked={selected.includes(action)}
                      onCheckedChange={() => toggleAction(module, action)}
                    />
                    <span className="text-xs capitalize">{action}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminManagement() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState(mockAdminRoles);
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [viewingAdmin, setViewingAdmin] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setEditingAdmin(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (admin) => {
    setEditingAdmin(admin);
    setForm({
      name: admin.name,
      email: admin.email,
      description: admin.description,
      privileges: { ...admin.privileges },
    });
    setFormOpen(true);
  };

  const openView = (admin) => {
    setViewingAdmin(admin);
    setViewOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.email) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    if (editingAdmin) {
      setAdmins((prev) =>
        prev.map((a) => (a.id === editingAdmin.id ? { ...a, ...form } : a)),
      );
      toast({ title: "Admin updated successfully" });
    } else {
      const newAdmin = {
        id: Date.now(),
        ...form,
        status: "active",
        createdDate: new Date().toISOString().split("T")[0],
      };
      setAdmins((prev) => [...prev, newAdmin]);
      toast({ title: "Admin created successfully" });
    }
    setFormOpen(false);
  };

  const deleteAdmin = (id) => {
    setAdmins((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Admin removed" });
  };

  const toggleStatus = (id) => {
    setAdmins((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: a.status === "active" ? "inactive" : "active" }
          : a,
      ),
    );
    toast({ title: "Admin status updated" });
  };

  const totalPrivileges = (privileges) =>
    Object.values(privileges).reduce((sum, arr) => sum + arr.length, 0);

  const columns = [
    {
      key: "name",
      label: "Admin",
      render: (row) => (
        <div>
          <p className="font-medium text-sm">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.description || "—"}
        </span>
      ),
    },
    {
      key: "privileges",
      label: "Privileges",
      render: (row) => {
        const modules = Object.keys(row.privileges).filter(
          (m) => row.privileges[m]?.length > 0,
        );
        return (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {modules.slice(0, 3).map((m) => {
              const found = PRIVILEGE_MODULES.find((p) => p.module === m);
              return (
                <Badge key={m} variant="secondary" className="text-[10px]">
                  {found?.label || m}
                </Badge>
              );
            })}
            {modules.length > 3 && (
              <Badge variant="outline" className="text-[10px]">
                +{modules.length - 3} more
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
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
              openView(row);
            }}
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              toggleStatus(row.id);
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              deleteAdmin(row.id);
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
        title="Admin Management"
        description="Create sub-admins and define their access privileges"
      >
        <Button onClick={openCreate} className="gap-2">
          <ShieldPlus className="w-4 h-4" /> Create Admin
        </Button>
      </PageHeader>

      <DataTable columns={columns} data={admins} />

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAdmin ? "Edit Admin" : "Create New Admin"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-1">
            <div className="space-y-5 pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="e.g. Sarah Connor"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email Address *</Label>
                  <Input
                    placeholder="admin@example.com"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  placeholder="Brief description of this admin's role"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              <Separator />
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold">Module Privileges</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select which modules this admin can access and what actions
                    they can perform.
                  </p>
                </div>
                <PrivilegeEditor
                  privileges={form.privileges}
                  onChange={(privileges) =>
                    setForm((f) => ({ ...f, privileges }))
                  }
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingAdmin ? "Save Changes" : "Create Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Privileges Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Admin Privileges — {viewingAdmin?.name}</DialogTitle>
          </DialogHeader>
          {viewingAdmin && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {viewingAdmin.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{viewingAdmin.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {viewingAdmin.email}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <StatusBadge status={viewingAdmin.status} />
                  </div>
                </div>
                <div className="space-y-3">
                  {PRIVILEGE_MODULES.map(({ module, label }) => {
                    const actions = viewingAdmin.privileges[module] || [];
                    if (actions.length === 0) return null;
                    return (
                      <div key={module}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                          {label}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {actions.map((action) => (
                            <Badge
                              key={action}
                              variant="secondary"
                              className="text-xs capitalize"
                            >
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {totalPrivileges(viewingAdmin.privileges) === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No privileges assigned.
                    </p>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
