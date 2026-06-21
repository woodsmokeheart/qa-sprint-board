import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { token } = (await request.json()) as { token: string };

  if (token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7 дней
    path: "/",
  });
  return res;
}
