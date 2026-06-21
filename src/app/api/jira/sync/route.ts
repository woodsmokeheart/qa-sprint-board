// src/app/api/jira/sync/route.ts
import { NextResponse } from "next/server";
import { syncActiveSprintEpics } from "@/lib/sync";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const result = await syncActiveSprintEpics();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
