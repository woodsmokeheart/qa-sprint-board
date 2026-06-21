// src/lib/auth.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function requireAdmin(request?: Request): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (token === process.env.ADMIN_TOKEN) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  return token === process.env.ADMIN_TOKEN;
}
