import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const projectData: Record<string, unknown> = {
    user_id: userId,
    name: body.name ?? "Untitled Project",
    triggers: body.triggers ?? [],
    audio_path: body.audio_path ?? null,
    audio_duration_sec: body.audio_duration_sec ?? 60,
    playback_settings: body.playback_settings ?? {
      zoom: 1,
      current_tick: 0,
      loop_a: null,
      loop_b: null,
      midi_port: null,
    },
    is_demo: body.is_demo ?? false,
  };

  const supabase = createServiceClient();

  // Upsert mode (update existing)
  if (body.id) {
    const { user_id: _, ...updateData } = projectData;
    const { data, error } = await supabase
      .from("projects")
      .update(updateData as never)
      .eq("id", body.id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ project: data });
  }

  // Create new
  const { data, error } = await supabase
    .from("projects")
    .insert(projectData as never)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data }, { status: 201 });
}
