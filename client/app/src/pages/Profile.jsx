import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  MOCK_CERTIFICATES,
  MOCK_ENROLLMENTS,
  MOCK_SKILL_PROFILES,
} from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/PageHeader";
import { Star, Award, BookOpen, Save } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    bio: user.bio || "",
    location: user.location || "",
    website: user.website || "",
    company_name: user.company_name || "",
  });

  const certificates = MOCK_CERTIFICATES.filter(
    (c) => c.user_email === user.email,
  );
  const enrollments = MOCK_ENROLLMENTS.filter(
    (e) => e.user_email === user.email,
  );
  const skills = MOCK_SKILL_PROFILES.filter((s) => s.user_email === user.email);

  const handleSave = () =>
    toast.success("Profile updated! (Demo mode — not saved)");

  const initials =
    user?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";
  const roleBadgeColor = {
    admin: "bg-red-100 text-red-700",
    mentor: "bg-purple-100 text-purple-700",
    company: "bg-blue-100 text-blue-700",
    learner: "bg-green-100 text-green-700",
    user: "bg-green-100 text-green-700",
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your account and profile"
      />

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold">{user?.full_name}</h2>
              <p className="text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                <Badge className={roleBadgeColor[user?.role] || ""}>
                  {user?.role || "learner"}
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-emerald-100 text-emerald-700"
                >
                  {user?.verification_status || "verified"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6 p-4 bg-muted/50 rounded-xl">
            <div className="text-center">
              <p className="text-2xl font-bold">
                {user?.reputation_score?.toFixed(1) || "0.0"}
              </p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Star className="h-3 w-3" /> Reputation
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{certificates.length}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Award className="h-3 w-3" /> Certificates
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{enrollments.length}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <BookOpen className="h-3 w-3" /> Courses
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Bio</Label>
            <Textarea
              placeholder="Tell us about yourself..."
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="mt-1"
              rows={3}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Location</Label>
              <Input
                placeholder="City, Country"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Website</Label>
              <Input
                placeholder="https://..."
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Teaching
              </p>
              <div className="flex flex-wrap gap-1.5">
                {skills
                  .filter((s) => s.skill_type === "teaching")
                  .map((s) => (
                    <Badge
                      key={s.id}
                      className="bg-emerald-100 text-emerald-700"
                    >
                      {s.skill_name}
                    </Badge>
                  ))}
                {skills.filter((s) => s.skill_type === "teaching").length ===
                  0 && (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Learning
              </p>
              <div className="flex flex-wrap gap-1.5">
                {skills
                  .filter((s) => s.skill_type === "learning")
                  .map((s) => (
                    <Badge key={s.id} className="bg-blue-100 text-blue-700">
                      {s.skill_name}
                    </Badge>
                  ))}
                {skills.filter((s) => s.skill_type === "learning").length ===
                  0 && (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
