// src/app/api/cron/sync/route.ts
import { NextResponse } from "next/server";
import { syncActiveSprintEpics } from "@/lib/sync";

export async function POST(request: Request) {
  // Vercel Cron добавляет заголовок Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncActiveSprintEpics();
  return NextResponse.json(result);
}
