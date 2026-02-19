"use client";

import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useProjects } from "@/hooks/useProjects";
import { formatDate, formatDuration } from "@/lib/utils";
import { ProjectStatus } from "@/lib/types";
import Link from "next/link";
import {
  Plus,
  Film,
  Trash2,
  ArrowRight,
  FolderOpen,
} from "lucide-react";
import { useState } from "react";

const statusConfig: Record<ProjectStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }> = {
  draft: { label: "Draft", variant: "default" },
  scripting: { label: "Scripting", variant: "info" },
  "media-selection": { label: "Media", variant: "info" },
  "voice-generation": { label: "Voice", variant: "info" },
  rendering: { label: "Rendering", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
};

export default function ProjectsPage() {
  const { projects, deleteProject } = useProjects();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <>
      <Header />
      <main className="pt-24 pb-12 px-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-foreground/60 text-sm mt-1">
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </p>
          </div>
          <Link href="/create">
            <Button>
              <Plus className="h-4 w-4" />
              New Video
            </Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-24 glass rounded-2xl">
            <FolderOpen className="h-16 w-16 text-foreground/15 mx-auto mb-6" />
            <h3 className="text-xl font-medium mb-2">No projects yet</h3>
            <p className="text-sm text-foreground/50 mb-8 max-w-sm mx-auto">
              Create your first AI-powered video to get started.
            </p>
            <Link href="/create">
              <Button size="lg">
                <Plus className="h-5 w-5" />
                Create Your First Video
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const totalDuration = project.scenes.reduce((sum, s) => sum + s.duration, 0);
              const status = statusConfig[project.status];
              const thumbnail =
                project.scenes[0]?.media?.thumbnail;

              return (
                <Card key={project.id} hover className="group overflow-hidden p-0">
                  {/* Thumbnail */}
                  <div className="aspect-video bg-surface relative overflow-hidden">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface to-surface-light">
                        <Film className="h-10 w-10 text-foreground/15" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-sm truncate mb-1">
                      {project.title || project.prompt.slice(0, 50) + "..."}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-foreground/40 mb-3">
                      <span className="capitalize">{project.format}</span>
                      <span>&middot;</span>
                      <span>{project.scenes.length} scenes</span>
                      {totalDuration > 0 && (
                        <>
                          <span>&middot;</span>
                          <span>{formatDuration(totalDuration)}</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-foreground/30 mb-4">
                      {formatDate(project.updatedAt)}
                    </p>

                    <div className="flex gap-2">
                      <Link href={`/studio/${project.id}`} className="flex-1">
                        <Button variant="secondary" size="sm" className="w-full">
                          Continue
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteId(project.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-danger" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Modal
          isOpen={deleteId !== null}
          onClose={() => setDeleteId(null)}
          title="Delete Project"
        >
          <p className="text-sm text-foreground/60 mb-6">
            Are you sure you want to delete this project? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteId) deleteProject(deleteId);
                setDeleteId(null);
              }}
            >
              Delete
            </Button>
          </div>
        </Modal>
      </main>
    </>
  );
}
