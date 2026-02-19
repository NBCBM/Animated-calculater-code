"use client";

import { Scene, PexelsMedia, Project } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Image as ImageIcon,
  Search,
  Check,
  Loader2,
  Wand2,
} from "lucide-react";
import { useState } from "react";

interface MediaSelectorProps {
  project: Project;
  pexelsApiKey: string;
  onSetMedia: (sceneId: string, media: PexelsMedia) => void;
  onComplete: () => void;
}

export function MediaSelector({
  project,
  pexelsApiKey,
  onSetMedia,
  onComplete,
}: MediaSelectorProps) {
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<PexelsMedia[]>([]);
  const [searching, setSearching] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [error, setError] = useState("");

  const allHaveMedia = project.scenes.every((s) => s.media !== null);

  const searchMedia = async (query: string) => {
    setSearching(true);
    setError("");
    try {
      const res = await fetch("/api/search-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          type: "photos",
          perPage: 9,
          apiKey: pexelsApiKey,
        }),
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(data.photos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const autoFillAll = async () => {
    setAutoFilling(true);
    setError("");
    try {
      for (const scene of project.scenes) {
        if (scene.media) continue;
        const res = await fetch("/api/search-media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: scene.visualDescription,
            type: "photos",
            perPage: 1,
            apiKey: pexelsApiKey,
          }),
        });
        if (!res.ok) continue;
        const data = await res.json();
        if (data.photos && data.photos.length > 0) {
          onSetMedia(scene.id, data.photos[0]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-fill failed");
    } finally {
      setAutoFilling(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-purple" />
            Media
          </h2>
          <p className="text-xs text-foreground/50 mt-1">
            Select stock footage for each scene from Pexels
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={autoFillAll}
          isLoading={autoFilling}
        >
          <Wand2 className="h-4 w-4" />
          Auto-fill All
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {project.scenes.map((scene) => (
          <Card key={scene.id} className="p-4">
            <div className="flex items-center gap-4">
              {/* Thumbnail */}
              <div
                className={cn(
                  "w-24 h-16 rounded-lg shrink-0 bg-surface flex items-center justify-center overflow-hidden",
                  scene.media && "ring-2 ring-success/50"
                )}
              >
                {scene.media ? (
                  <img
                    src={scene.media.thumbnail}
                    alt={scene.media.alt}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-6 w-6 text-foreground/20" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm truncate">
                    Scene {scene.index + 1}: {scene.title}
                  </h4>
                  {scene.media && <Check className="h-4 w-4 text-success shrink-0" />}
                </div>
                <p className="text-xs text-foreground/40 truncate">{scene.visualDescription}</p>
                {scene.media && (
                  <p className="text-xs text-foreground/30 mt-0.5">
                    by {scene.media.photographer}
                  </p>
                )}
              </div>

              {/* Action */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveScene(activeScene === scene.id ? null : scene.id);
                  if (activeScene !== scene.id) {
                    searchMedia(scene.visualDescription);
                  }
                }}
              >
                <Search className="h-4 w-4" />
                {scene.media ? "Change" : "Find"}
              </Button>
            </div>

            {/* Search panel */}
            {activeScene === scene.id && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex gap-2 mb-3">
                  <input
                    className="flex-1 bg-white/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                    defaultValue={scene.visualDescription}
                    placeholder="Search for media..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        searchMedia((e.target as HTMLInputElement).value);
                      }
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      const input = (e.target as HTMLElement)
                        .closest(".mt-4")
                        ?.querySelector("input");
                      if (input) searchMedia(input.value);
                    }}
                    isLoading={searching}
                  >
                    Search
                  </Button>
                </div>

                {searching && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-foreground/30" />
                  </div>
                )}

                {!searching && searchResults.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {searchResults.map((media) => (
                      <button
                        key={media.id}
                        onClick={() => {
                          onSetMedia(scene.id, media);
                          setActiveScene(null);
                        }}
                        className={cn(
                          "relative rounded-lg overflow-hidden aspect-video group cursor-pointer",
                          scene.media?.id === media.id && "ring-2 ring-accent"
                        )}
                      >
                        <img
                          src={media.thumbnail}
                          alt={media.alt}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <Check className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!searching && searchResults.length === 0 && (
                  <p className="text-center text-sm text-foreground/40 py-4">
                    No results found. Try a different search query.
                  </p>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="pt-6">
        <Button className="w-full" onClick={onComplete} disabled={!allHaveMedia}>
          {allHaveMedia ? "Continue to Voice Settings" : "Select media for all scenes to continue"}
        </Button>
      </div>
    </div>
  );
}
