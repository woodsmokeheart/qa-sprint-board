// src/app/api/sprint/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json() as {
    number: number; start: string; end: string; confluenceUrl?: string;
  };

  // Деактивируем предыдущий спринт
  await sql`UPDATE sprints SET is_active = false WHERE is_active = true`;

  const [row] = (await sql`
    INSERT INTO sprints (number, start_date, end_date, confluence_url, is_active)
    VALUES (${body.number}, ${body.start}, ${body.end}, ${body.confluenceUrl ?? null}, true)
    RETURNING id
  `) as Array<{ id: number }>;

  return NextResponse.json({ id: row.id });
}
