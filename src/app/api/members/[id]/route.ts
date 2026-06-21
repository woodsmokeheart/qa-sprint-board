// src/app/api/members/[id]/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

interface Params { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json() as {
    name?: string; role?: string; onVacation?: boolean; shift?: string;
  };

  await sql`
    UPDATE members SET
      name        = COALESCE(${body.name ?? null}, name),
      role        = COALESCE(${body.role ?? null}, role),
      on_vacation = COALESCE(${body.onVacation ?? null}, on_vacation),
      shift       = COALESCE(${body.shift ?? null}, shift)
    WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true });
}
