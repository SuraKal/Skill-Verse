import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { MOCK_SKILL_PROFILES, MOCK_SKILL_MATCHES } from "@/lib/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import {
  Plus,
  ArrowLeftRight,
  Sparkles,
  Star,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const CATEGORIES = [
  "programming",
  "design",
  "business",
  "language",
  "music",
  "science",
  "math",
  "writing",
  "marketing",
  "other",
];
const LEVELS = ["beginner", "intermediate", "advanced", "expert"];

export default function SkillExchange() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    skill_name: "",
    skill_type: "teaching",
    proficiency_level: "intermediate",
    category: "programming",
    description: "",
  });
  const [mySkills, setMySkills] = useState(
    MOCK_SKILL_PROFILES.filter((s) => s.user_email === user.email),
  );
  const allSkills = MOCK_SKILL_PROFILES;
  const matches = MOCK_SKILL_MATCHES.filter(
    (m) => m.user_a_email === user.email || m.user_b_email === user.email,
  );
  const otherSkills = allSkills.filter((s) => s.user_email !== user.email);

  const addSkill = () => {
    if (!form.skill_name) return;
    const newSkill = {
      id: `sp-${Date.now()}`,
      ...form,
      user_email: user.email,
      user_name: user.full_name,
      availability: "available",
    };
    setMySkills((prev) => [...prev, newSkill]);
    setOpen(false);
    setForm({
      skill_name: "",
      skill_type: "teaching",
      proficiency_level: "intermediate",
      category: "programming",
      description: "",
    });
    toast.success("Skill added! (Demo mode — not saved)");
  };

  const removeSkill = (id) => {
    setMySkills((prev) => prev.filter((s) => s.id !== id));
    toast.success("Skill removed");
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Skill Exchange"
        description="List your skills, find matches, and learn from each other"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Skill
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a Skill</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Skill name"
                  value={form.skill_name}
                  onChange={(e) =>
                    setForm({ ...form, skill_name: e.target.value })
                  }
                />
                <Select
                  value={form.skill_type}
                  onValueChange={(v) => setForm({ ...form, skill_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teaching">I can teach this</SelectItem>
                    <SelectItem value="learning">
                      I want to learn this
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={form.proficiency_level}
                  onValueChange={(v) =>
                    setForm({ ...form, proficiency_level: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l.charAt(0).toUpperCase() + l.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Brief description..."
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <DialogFooter>
                <Button onClick={addSkill} disabled={!form.skill_name}>
                  Add Skill
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Tabs defaultValue="my-skills" className="space-y-6">
        <TabsList>
          <TabsTrigger value="my-skills">My Skills</TabsTrigger>
          <TabsTrigger value="matches">Matches ({matches.length})</TabsTrigger>
          <TabsTrigger value="browse">Browse Skills</TabsTrigger>
        </TabsList>

        <TabsContent value="my-skills">
          {mySkills.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="No skills yet"
              description="Add skills you can teach or want to learn."
              actionLabel="Add Skill"
              onAction={() => setOpen(true)}
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mySkills.map((skill) => (
                <Card key={skill.id} className="group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge
                          className={
                            skill.skill_type === "teaching"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-blue-100 text-blue-700"
                          }
                        >
                          {skill.skill_type === "teaching"
                            ? "Teaching"
                            : "Learning"}
                        </Badge>
                        <h3 className="font-semibold mt-2">
                          {skill.skill_name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {skill.proficiency_level} · {skill.category}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 text-destructive"
                        onClick={() => removeSkill(skill.id)}
                      >
                        Remove
                      </Button>
                    </div>
                    {skill.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {skill.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="matches">
          {matches.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No matches yet"
              description="Matches are pre-loaded in demo mode."
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {matches.map((match) => {
                const isA = match.user_a_email === user.email;
                const partnerName = isA ? match.user_b_name : match.user_a_name;
                const partnerEmail = isA
                  ? match.user_b_email
                  : match.user_a_email;
                return (
                  <Card key={match.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {partnerName?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">{partnerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {partnerEmail}
                          </p>
                        </div>
                        <Badge variant="outline" className="ml-auto text-xs">
                          {Math.round(match.match_score || 0)}% match
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-emerald-50 rounded-lg p-2">
                          <p className="text-muted-foreground">
                            They teach you
                          </p>
                          <p className="font-medium">{match.skill_b_teaches}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2">
                          <p className="text-muted-foreground">
                            You teach them
                          </p>
                          <p className="font-medium">{match.skill_a_teaches}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Link
                          to={`/messages?to=${partnerEmail}`}
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-1"
                          >
                            <MessageSquare className="h-3 w-3" /> Message
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="browse">
          {otherSkills.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="No skills from others yet"
              description="Invite others to list their skills."
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherSkills.map((skill) => (
                <Card key={skill.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-muted text-xs">
                          {skill.user_name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {skill.user_name}
                      </span>
                      <Badge
                        className={
                          skill.skill_type === "teaching"
                            ? "bg-emerald-100 text-emerald-700 ml-auto"
                            : "bg-blue-100 text-blue-700 ml-auto"
                        }
                        variant="secondary"
                      >
                        {skill.skill_type === "teaching"
                          ? "Teaches"
                          : "Wants to learn"}
                      </Badge>
                    </div>
                    <h3 className="font-semibold">{skill.skill_name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {skill.proficiency_level} · {skill.category}
                    </p>
                    {skill.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {skill.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
