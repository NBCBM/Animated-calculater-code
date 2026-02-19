"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useSettings } from "@/hooks/useSettings";
import { OPENAI_VOICES } from "@/lib/tts";
import { useToast } from "@/components/ui/toast";
import { Key, Image, Mic, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

type TestStatus = "idle" | "testing" | "success" | "error";

export default function SettingsPage() {
  const { settings, updateSettings, loaded } = useSettings();
  const { toast } = useToast();
  const [openaiStatus, setOpenaiStatus] = useState<TestStatus>("idle");
  const [pexelsStatus, setPexelsStatus] = useState<TestStatus>("idle");
  const [testMessage, setTestMessage] = useState("");

  const testOpenAI = async () => {
    if (!settings.openaiApiKey) {
      setTestMessage("Please enter an API key first");
      return;
    }
    setOpenaiStatus("testing");
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Test connection",
          format: "documentary",
          duration: "short",
          theme: "professional",
          sceneCount: 1,
          apiKey: settings.openaiApiKey,
        }),
      });
      if (res.ok) {
        setOpenaiStatus("success");
        setTestMessage("OpenAI connection successful!");
        toast("OpenAI connection successful!", "success");
      } else {
        const data = await res.json();
        setOpenaiStatus("error");
        setTestMessage(data.error || "Connection failed");
        toast(data.error || "OpenAI connection failed", "error");
      }
    } catch {
      setOpenaiStatus("error");
      setTestMessage("Connection failed");
      toast("OpenAI connection failed", "error");
    }
  };

  const testPexels = async () => {
    if (!settings.pexelsApiKey) {
      setTestMessage("Please enter an API key first");
      toast("Please enter an API key first", "warning");
      return;
    }
    setPexelsStatus("testing");
    try {
      const res = await fetch("/api/search-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "nature",
          type: "photos",
          perPage: 1,
          apiKey: settings.pexelsApiKey,
        }),
      });
      if (res.ok) {
        setPexelsStatus("success");
        setTestMessage("Pexels connection successful!");
        toast("Pexels connection successful!", "success");
      } else {
        setPexelsStatus("error");
        setTestMessage("Pexels connection failed");
        toast("Pexels connection failed", "error");
      }
    } catch {
      setPexelsStatus("error");
      setTestMessage("Connection failed");
      toast("Pexels connection failed", "error");
    }
  };

  const statusIcon = (status: TestStatus) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-success" />;
      case "error":
        return <XCircle className="h-5 w-5 text-danger" />;
      default:
        return null;
    }
  };

  if (!loaded) {
    return (
      <>
        <Header />
        <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto">
          <div className="skeleton h-8 w-48 mb-8" />
          <div className="skeleton h-64 w-full mb-6" />
          <div className="skeleton h-64 w-full" />
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-foreground/60 mb-8">
          Configure your API keys to enable AI features. Keys are stored locally in your browser.
        </p>

        {(!settings.openaiApiKey || !settings.pexelsApiKey) && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20 mb-6">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning">API keys required</p>
              <p className="text-xs text-foreground/60 mt-1">
                You need both an OpenAI API key and a Pexels API key to use all features.
                Get your OpenAI key at platform.openai.com and Pexels key at pexels.com/api.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-accent/10">
                <Key className="h-5 w-5 text-accent-light" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">OpenAI Configuration</h2>
                <p className="text-xs text-foreground/50">For script generation and text-to-speech</p>
              </div>
            </div>
            <div className="space-y-4">
              <Input
                label="API Key"
                type="password"
                placeholder="sk-..."
                value={settings.openaiApiKey}
                onChange={(e) => updateSettings({ openaiApiKey: e.target.value })}
              />
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={testOpenAI}
                  isLoading={openaiStatus === "testing"}
                >
                  Test Connection
                </Button>
                {statusIcon(openaiStatus)}
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple/10">
                <Image className="h-5 w-5 text-purple" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Pexels Configuration</h2>
                <p className="text-xs text-foreground/50">For stock footage and images</p>
              </div>
            </div>
            <div className="space-y-4">
              <Input
                label="API Key"
                type="password"
                placeholder="Enter your Pexels API key"
                value={settings.pexelsApiKey}
                onChange={(e) => updateSettings({ pexelsApiKey: e.target.value })}
              />
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={testPexels}
                  isLoading={pexelsStatus === "testing"}
                >
                  Test Connection
                </Button>
                {statusIcon(pexelsStatus)}
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-success/10">
                <Mic className="h-5 w-5 text-success" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Voice Settings</h2>
                <p className="text-xs text-foreground/50">Default voice for text-to-speech narration</p>
              </div>
            </div>
            <Select
              label="Default Voice"
              value={settings.defaultVoice}
              onChange={(e) => updateSettings({ defaultVoice: e.target.value })}
              options={OPENAI_VOICES.map((v) => ({
                value: v.id,
                label: `${v.name} - ${v.description}`,
              }))}
            />
          </Card>
        </div>

        {testMessage && (
          <p className="text-sm text-foreground/60 mt-4 text-center">{testMessage}</p>
        )}
      </main>
    </>
  );
}
