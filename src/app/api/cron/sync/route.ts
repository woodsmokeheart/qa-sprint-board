// src/app/api/cron/sync/route.ts
import { NextResponse } from "next/server";
import { syncActiveSprintEpics } from "@/lib/sync";

async function handle(request: Request) {
  // Vercel Cron дёргает endpoint методом GET с заголовком Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncActiveSprintEpics();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
