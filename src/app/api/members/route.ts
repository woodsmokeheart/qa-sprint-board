// src/app/api/members/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  const rows = await sql`SELECT * FROM members ORDER BY team, name`;
  return NextResponse.json(rows);
}
