"use client";

import { useState, useEffect, useCallback } from "react";
import { Project } from "@/lib/types";
import { getProjects, saveProject, deleteProject as removeProject } from "@/lib/storage";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);

  const refresh = useCallback(() => {
    setProjects(getProjects());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addProject = (project: Project) => {
    saveProject(project);
    refresh();
  };

  const updateProject = (project: Project) => {
    saveProject(project);
    refresh();
  };

  const deleteProjectById = (id: string) => {
    removeProject(id);
    refresh();
  };

  return { projects, addProject, updateProject, deleteProject: deleteProjectById, refresh };
}
