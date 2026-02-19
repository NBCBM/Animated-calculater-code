import { Scene, RenderConfig } from "./types";

type KenBurnsDirection = "zoom-in" | "zoom-out" | "pan-left" | "pan-right";

export class VideoRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext | null = null;
  private config: RenderConfig;
  private scenes: Scene[] = [];
  private images: Map<string, HTMLImageElement> = new Map();
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private cancelled = false;
  private onProgress: (progress: number, currentScene: number) => void = () => {};

  constructor(config: RenderConfig) {
    this.config = config;
    this.canvas = document.createElement("canvas");
    this.canvas.width = config.width;
    this.canvas.height = config.height;
    this.ctx = this.canvas.getContext("2d")!;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  setProgressCallback(cb: (progress: number, currentScene: number) => void) {
    this.onProgress = cb;
  }

  async prepare(scenes: Scene[]): Promise<void> {
    this.scenes = scenes;
    this.audioContext = new AudioContext();

    const imagePromises = scenes.map(async (scene) => {
      if (!scene.media) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load image for scene: ${scene.title}`));
        img.src = scene.media!.type === "photo" ? scene.media!.src : scene.media!.thumbnail;
      });
      this.images.set(scene.id, img);
    });

    const audioPromises = scenes.map(async (scene) => {
      if (!scene.audioUrl) return;
      try {
        const response = await fetch(scene.audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
        this.audioBuffers.set(scene.id, audioBuffer);
      } catch (e) {
        console.warn(`Failed to decode audio for scene ${scene.title}:`, e);
      }
    });

    await Promise.all([...imagePromises, ...audioPromises]);
  }

  async render(): Promise<Blob> {
    this.cancelled = false;
    this.recordedChunks = [];

    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    const audioDestination = this.audioContext.createMediaStreamDestination();
    const videoStream = this.canvas.captureStream(this.config.fps);
    const combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audioDestination.stream.getAudioTracks(),
    ]);

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";

    this.mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 5000000,
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    const recordingPromise = new Promise<Blob>((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        resolve(blob);
      };
    });

    this.mediaRecorder.start(100);

    const totalDuration = this.scenes.reduce((sum, s) => sum + s.duration, 0);
    let elapsed = 0;

    for (let i = 0; i < this.scenes.length; i++) {
      if (this.cancelled) break;

      const scene = this.scenes[i];
      const direction = this.getKenBurnsDirection(i);

      // Play audio for this scene
      const audioBuffer = this.audioBuffers.get(scene.id);
      if (audioBuffer) {
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioDestination);
        source.start();
      }

      // Render scene frames
      await this.renderScene(scene, direction, (sceneProgress) => {
        const overallProgress = (elapsed + sceneProgress * scene.duration) / totalDuration;
        this.onProgress(overallProgress, i);
      });

      elapsed += scene.duration;

      // Transition to next scene
      if (i < this.scenes.length - 1 && this.config.transition !== "none" && !this.cancelled) {
        await this.renderTransition(scene, this.scenes[i + 1]);
      }
    }

    this.mediaRecorder.stop();
    return recordingPromise;
  }

  cancel(): void {
    this.cancelled = true;
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
  }

  private async renderScene(
    scene: Scene,
    direction: KenBurnsDirection,
    onProgress: (p: number) => void
  ): Promise<void> {
    const durationMs = scene.duration * 1000;
    const startTime = performance.now();
    const image = this.images.get(scene.id);

    const narrationChunks = this.splitNarration(scene.narration);
    const chunkDuration = durationMs / narrationChunks.length;

    return new Promise<void>((resolve) => {
      const animate = () => {
        if (this.cancelled) {
          resolve();
          return;
        }

        const now = performance.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);

        // Clear canvas
        this.ctx.fillStyle = "#0a0a1a";
        this.ctx.fillRect(0, 0, this.config.width, this.config.height);

        // Draw image with Ken Burns
        if (image) {
          this.drawKenBurns(image, progress, direction);
        } else {
          // Gradient placeholder if no image
          const gradient = this.ctx.createLinearGradient(0, 0, this.config.width, this.config.height);
          gradient.addColorStop(0, "#1a1a2e");
          gradient.addColorStop(1, "#16213e");
          this.ctx.fillStyle = gradient;
          this.ctx.fillRect(0, 0, this.config.width, this.config.height);
        }

        // Draw scene title
        if (this.config.showSceneTitles && progress < 0.3) {
          const titleAlpha = progress < 0.05 ? progress / 0.05 : progress > 0.25 ? (0.3 - progress) / 0.05 : 1;
          this.drawTitle(scene.title, titleAlpha);
        }

        // Draw subtitles
        if (this.config.showSubtitles && narrationChunks.length > 0) {
          const chunkIndex = Math.min(Math.floor(elapsed / chunkDuration), narrationChunks.length - 1);
          this.drawSubtitle(narrationChunks[chunkIndex]);
        }

        onProgress(progress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  private drawKenBurns(
    image: HTMLImageElement,
    progress: number,
    direction: KenBurnsDirection
  ): void {
    const { width, height } = this.config;
    const intensity = this.config.kenBurnsIntensity;

    this.ctx.save();

    // Cover the canvas while maintaining aspect ratio
    const imgAspect = image.width / image.height;
    const canvasAspect = width / height;
    let drawWidth: number, drawHeight: number;

    if (imgAspect > canvasAspect) {
      drawHeight = height;
      drawWidth = height * imgAspect;
    } else {
      drawWidth = width;
      drawHeight = width / imgAspect;
    }

    // Scale up slightly for Ken Burns movement room
    const baseScale = 1.1;
    let scale = baseScale;
    let offsetX = (width - drawWidth * scale) / 2;
    let offsetY = (height - drawHeight * scale) / 2;

    switch (direction) {
      case "zoom-in":
        scale = baseScale + intensity * 0.2 * progress;
        offsetX = (width - drawWidth * scale) / 2;
        offsetY = (height - drawHeight * scale) / 2;
        break;
      case "zoom-out":
        scale = baseScale + intensity * 0.2 * (1 - progress);
        offsetX = (width - drawWidth * scale) / 2;
        offsetY = (height - drawHeight * scale) / 2;
        break;
      case "pan-left":
        scale = baseScale + intensity * 0.1;
        offsetX = -drawWidth * scale * 0.05 * progress + (width - drawWidth * scale) / 2;
        offsetY = (height - drawHeight * scale) / 2;
        break;
      case "pan-right":
        scale = baseScale + intensity * 0.1;
        offsetX = drawWidth * scale * 0.05 * progress + (width - drawWidth * scale) / 2;
        offsetY = (height - drawHeight * scale) / 2;
        break;
    }

    this.ctx.drawImage(image, offsetX, offsetY, drawWidth * scale, drawHeight * scale);
    this.ctx.restore();
  }

  private drawTitle(title: string, alpha: number): void {
    const { width } = this.config;
    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    // Background bar
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    this.ctx.fillRect(0, 60, width, 80);

    // Title text
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 42px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    this.ctx.shadowBlur = 8;
    this.ctx.fillText(title, width / 2, 100);

    this.ctx.restore();
  }

  private drawSubtitle(text: string): void {
    const { width, height } = this.config;
    this.ctx.save();

    // Measure text for background sizing
    this.ctx.font = "32px sans-serif";
    const metrics = this.ctx.measureText(text);
    const padding = 20;
    const bgWidth = Math.min(metrics.width + padding * 2, width - 100);
    const bgX = (width - bgWidth) / 2;

    // Background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.beginPath();
    this.roundRect(bgX, height - 120, bgWidth, 56, 12);
    this.ctx.fill();

    // Text
    this.ctx.fillStyle = "#ffffff";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    this.ctx.shadowBlur = 4;
    this.ctx.fillText(text, width / 2, height - 92, width - 140);

    this.ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.moveTo(x + r, y);
    this.ctx.arcTo(x + w, y, x + w, y + h, r);
    this.ctx.arcTo(x + w, y + h, x, y + h, r);
    this.ctx.arcTo(x, y + h, x, y, r);
    this.ctx.arcTo(x, y, x + w, y, r);
    this.ctx.closePath();
  }

  private async renderTransition(fromScene: Scene, toScene: Scene): Promise<void> {
    const durationMs = this.config.transitionDuration;
    const startTime = performance.now();
    const fromImage = this.images.get(fromScene.id);
    const toImage = this.images.get(toScene.id);

    return new Promise<void>((resolve) => {
      const animate = () => {
        if (this.cancelled) {
          resolve();
          return;
        }

        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / durationMs, 1);

        this.ctx.fillStyle = "#0a0a1a";
        this.ctx.fillRect(0, 0, this.config.width, this.config.height);

        // Draw outgoing scene
        if (fromImage) {
          this.ctx.save();
          this.ctx.globalAlpha = 1 - progress;
          this.drawKenBurns(fromImage, 1, "zoom-in");
          this.ctx.restore();
        }

        // Draw incoming scene
        if (toImage) {
          this.ctx.save();
          this.ctx.globalAlpha = progress;
          this.drawKenBurns(toImage, 0, "zoom-in");
          this.ctx.restore();
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  private getKenBurnsDirection(index: number): KenBurnsDirection {
    const directions: KenBurnsDirection[] = ["zoom-in", "pan-left", "zoom-out", "pan-right"];
    return directions[index % directions.length];
  }

  private splitNarration(text: string): string[] {
    if (!text) return [""];
    const words = text.split(" ");
    const chunks: string[] = [];
    let current = "";

    for (const word of words) {
      if ((current + " " + word).length > 60 && current) {
        chunks.push(current.trim());
        current = word;
      } else {
        current = current ? current + " " + word : word;
      }
    }
    if (current) chunks.push(current.trim());
    return chunks.length > 0 ? chunks : [""];
  }

  destroy(): void {
    this.cancel();
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.images.clear();
    this.audioBuffers.clear();
  }
}
