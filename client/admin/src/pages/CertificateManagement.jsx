import React, { useState } from "react";
import { mockCertificates } from "@/lib/mockData";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ShieldX, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function CertificateManagement() {
  const { toast } = useToast();
  const [certificates, setCertificates] = useState(mockCertificates);
  const [search, setSearch] = useState("");

  const filtered = certificates.filter(
    (c) =>
      c.user.toLowerCase().includes(search.toLowerCase()) ||
      c.course.toLowerCase().includes(search.toLowerCase()) ||
      c.verificationCode.toLowerCase().includes(search.toLowerCase()),
  );

  const revokeCert = (id) => {
    setCertificates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "revoked" } : c)),
    );
    toast({ title: "Certificate revoked" });
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Verification code copied" });
  };

  const columns = [
    {
      key: "user",
      label: "User",
      render: (row) => <span className="font-medium text-sm">{row.user}</span>,
    },
    { key: "course", label: "Course" },
    { key: "issuedDate", label: "Issued" },
    {
      key: "verificationCode",
      label: "Verification Code",
      render: (row) => (
        <div className="flex items-center gap-2">
          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
            {row.verificationCode}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              copyCode(row.verificationCode);
            }}
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
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
      render: (row) =>
        row.status !== "revoked" ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              revokeCert(row.id);
            }}
          >
            <ShieldX className="w-3.5 h-3.5" />
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Certificate Management"
        description="View and manage all issued certificates"
      />
      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by user, course, or code..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <DataTable columns={columns} data={filtered} />
    </div>
  );
}
