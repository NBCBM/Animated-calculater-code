import { NextRequest, NextResponse } from "next/server";
import { searchPhotos, searchVideos } from "@/lib/pexels";

export async function POST(request: NextRequest) {
  try {
    const { query, apiKey, type = "photos", perPage = 6 } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: "Pexels API key is required" }, { status: 400 });
    }

    if (!query) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    let photos: Awaited<ReturnType<typeof searchPhotos>> = [];
    let videos: Awaited<ReturnType<typeof searchVideos>> = [];

    if (type === "photos" || type === "both") {
      photos = await searchPhotos(query, apiKey, perPage);
    }
    if (type === "videos" || type === "both") {
      videos = await searchVideos(query, apiKey, perPage);
    }

    return NextResponse.json({ photos, videos });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Media search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
