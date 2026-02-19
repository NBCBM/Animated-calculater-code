import { PexelsMedia } from "./types";

const PEXELS_BASE = "https://api.pexels.com";

interface PexelsPhotoResponse {
  photos: {
    id: number;
    width: number;
    height: number;
    photographer: string;
    photographer_url: string;
    alt: string;
    src: {
      large2x: string;
      medium: string;
    };
  }[];
}

interface PexelsVideoResponse {
  videos: {
    id: number;
    width: number;
    height: number;
    user: { name: string; url: string };
    image: string;
    video_files: {
      quality: string;
      link: string;
      width: number;
      height: number;
    }[];
  }[];
}

export async function searchPhotos(
  query: string,
  apiKey: string,
  perPage = 6
): Promise<PexelsMedia[]> {
  const res = await fetch(
    `${PEXELS_BASE}/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
    { headers: { Authorization: apiKey } }
  );
  if (!res.ok) throw new Error(`Pexels API error: ${res.status}`);
  const data: PexelsPhotoResponse = await res.json();
  return data.photos.map((p) => ({
    id: p.id,
    type: "photo" as const,
    src: p.src.large2x,
    thumbnail: p.src.medium,
    photographer: p.photographer,
    photographerUrl: p.photographer_url,
    alt: p.alt || query,
    width: p.width,
    height: p.height,
  }));
}

export async function searchVideos(
  query: string,
  apiKey: string,
  perPage = 6
): Promise<PexelsMedia[]> {
  const res = await fetch(
    `${PEXELS_BASE}/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
    { headers: { Authorization: apiKey } }
  );
  if (!res.ok) throw new Error(`Pexels API error: ${res.status}`);
  const data: PexelsVideoResponse = await res.json();
  return data.videos.map((v) => {
    const hdFile = v.video_files.find((f) => f.quality === "hd") || v.video_files[0];
    return {
      id: v.id,
      type: "video" as const,
      src: hdFile?.link || "",
      thumbnail: v.image,
      photographer: v.user.name,
      photographerUrl: v.user.url,
      alt: query,
      width: v.width,
      height: v.height,
    };
  });
}
