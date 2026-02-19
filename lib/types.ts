export type VideoFormat = "documentary" | "listicle";
export type VideoDuration = "short" | "medium" | "long";
export type VideoMode = "auto" | "manual";
export type VideoTheme = "professional" | "cinematic" | "educational" | "casual";
export type ProjectStatus =
  | "draft"
  | "scripting"
  | "media-selection"
  | "voice-generation"
  | "rendering"
  | "completed";
export type SceneStatus = "pending" | "approved" | "rejected" | "editing";

export interface PexelsMedia {
  id: number;
  type: "photo" | "video";
  src: string;
  thumbnail: string;
  photographer: string;
  photographerUrl: string;
  alt: string;
  width: number;
  height: number;
}

export interface Scene {
  id: string;
  index: number;
  title: string;
  narration: string;
  visualDescription: string;
  duration: number;
  status: SceneStatus;
  media: PexelsMedia | null;
  audioUrl: string | null;
}

export interface Project {
  id: string;
  title: string;
  prompt: string;
  format: VideoFormat;
  duration: VideoDuration;
  mode: VideoMode;
  theme: VideoTheme;
  voiceId: string;
  status: ProjectStatus;
  scenes: Scene[];
  thumbnailUrl: string | null;
  videoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  openaiApiKey: string;
  pexelsApiKey: string;
  defaultVoice: string;
}

export interface RenderConfig {
  width: number;
  height: number;
  fps: number;
  transition: "fade" | "crossfade" | "none";
  transitionDuration: number;
  showSubtitles: boolean;
  showSceneTitles: boolean;
  kenBurnsIntensity: number;
}

export interface GenerateScriptRequest {
  prompt: string;
  format: VideoFormat;
  duration: VideoDuration;
  theme: VideoTheme;
  sceneCount: number;
  apiKey: string;
}

export interface GenerateScriptResponse {
  title: string;
  scenes: {
    title: string;
    narration: string;
    visualDescription: string;
    duration: number;
  }[];
}

export interface SearchMediaRequest {
  query: string;
  apiKey: string;
  type: "photos" | "videos" | "both";
  perPage?: number;
}

export const DURATION_CONFIG = {
  short: { label: "Short (1-2 min)", minScenes: 3, maxScenes: 4, avgDuration: 25 },
  medium: { label: "Medium (3-5 min)", minScenes: 6, maxScenes: 8, avgDuration: 35 },
  long: { label: "Long (8-10 min)", minScenes: 12, maxScenes: 15, avgDuration: 40 },
} as const;

export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  width: 1920,
  height: 1080,
  fps: 30,
  transition: "fade",
  transitionDuration: 1000,
  showSubtitles: true,
  showSceneTitles: true,
  kenBurnsIntensity: 0.5,
};
