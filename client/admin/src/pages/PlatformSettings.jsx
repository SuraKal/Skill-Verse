import React, { useState } from "react";
import { defaultPlatformSettings } from "@/lib/mockData";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function PlatformSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState(defaultPlatformSettings);
  const [newCategory, setNewCategory] = useState("");

  const toggleFeature = (key) => {
    setSettings((prev) => ({
      ...prev,
      features: { ...prev.features, [key]: !prev.features[key] },
    }));
  };

  const addCategory = () => {
    if (!newCategory.trim()) return;
    setSettings((prev) => ({
      ...prev,
      categories: [...prev.categories, newCategory.trim()],
    }));
    setNewCategory("");
  };

  const removeCategory = (cat) => {
    setSettings((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c !== cat),
    }));
  };

  const featureLabels = {
    jobBoard: "Job Board",
    skillExchange: "Skill Exchange",
    communities: "Communities",
    events: "Events",
    assessments: "Assessments",
    certificates: "Certificates",
  };

  return (
    <div>
      <PageHeader
        title="Platform Settings"
        description="Configure your SkillForge platform"
      >
        <Button
          className="gap-2"
          onClick={() => toast({ title: "Settings saved!" })}
        >
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Platform Name</Label>
              <Input
                value={settings.platformName}
                onChange={(e) =>
                  setSettings((p) => ({ ...p, platformName: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Primary Color</Label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, primaryColor: e.target.value }))
                  }
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={settings.primaryColor}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, primaryColor: e.target.value }))
                  }
                  className="w-32"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Feature Toggles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(settings.features).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="font-normal">{featureLabels[key]}</Label>
                <Switch
                  checked={enabled}
                  onCheckedChange={() => toggleFeature(key)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {settings.categories.map((cat) => (
                <Badge
                  key={cat}
                  variant="secondary"
                  className="gap-1 pl-3 pr-1 py-1.5"
                >
                  {cat}
                  <button
                    onClick={() => removeCategory(cat)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="New category..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
                className="max-w-xs"
              />
              <Button variant="outline" size="icon" onClick={addCategory}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
