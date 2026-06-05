import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FolderIcon } from "@heroicons/react/24/outline";
import type { ProjectsResponse, ProjectInfo } from "../types";
import { getProjectsUrl } from "../config/api";
import { SettingsButton } from "./SettingsButton";
import { SettingsModal } from "./SettingsModal";

export function ProjectSelector() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(getProjectsUrl());
      if (!response.ok) {
        throw new Error(`Failed to load projects: ${response.statusText}`);
      }
      const data: ProjectsResponse = await response.json();
      setProjects(data.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (projectPath: string) => {
    const normalizedPath = projectPath.startsWith("/")
      ? projectPath
      : `/${projectPath}`;
    navigate(`/projects${normalizedPath}`);
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#212121]">
        <div className="text-[#6a6a6a]">Loading projects…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#212121]">
        <div className="text-[#f06060]">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#212121]">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#c96442] text-xl font-bold">✱</span>
              <span className="text-[#ececec] text-xl font-semibold">Claude</span>
            </div>
            <p className="text-[#6a6a6a] text-sm">Select a project to start</p>
          </div>
          <SettingsButton onClick={handleSettingsClick} />
        </div>

        <div className="space-y-2">
          {projects.length > 0 ? (
            projects.map((project) => (
              <button
                key={project.path}
                onClick={() => handleProjectSelect(project.path)}
                className="w-full flex items-center gap-3 p-4 bg-[#2a2a2a] hover:bg-[#303030] border border-[#333] rounded-xl transition-colors text-left"
              >
                <FolderIcon className="h-4 w-4 text-[#6a6a6a] flex-shrink-0" />
                <span className="text-[#ececec] font-mono text-sm truncate">{project.path}</span>
              </button>
            ))
          ) : (
            <p className="text-[#555] text-sm text-center py-8">No projects found</p>
          )}
        </div>

        <SettingsModal isOpen={isSettingsOpen} onClose={handleSettingsClose} />
      </div>
    </div>
  );
}
