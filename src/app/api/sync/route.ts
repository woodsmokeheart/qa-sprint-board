// src/app/api/sync/route.ts
// Публичный синк для кнопки на борде (без админ-токена) — чтобы команда могла
// сама обновить данные из Jira. Защита от спама и скриптов:
//   1) только POST + same-origin (Origin обязан совпадать с Host);
//   2) глобальный кулдаун: не чаще одного синка раз в COOLDOWN_SECONDS,
//      общий на всех (по времени последней записи в jira_cache). Это и от
//      спама кликами, и от скриптов — Jira API не задёргать.
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { syncActiveSprintEpics } from "@/lib/sync";

const COOLDOWN_SECONDS = 120;

export async function POST(request: Request) {
  // Same-origin guard: кросс-сайтовые запросы из браузера несут Origin — режем.
  // Серверные/прямые вызовы Origin не шлют — их ограничивает кулдаун ниже.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin) {
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (originHost !== host) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Глобальный кулдаун по времени последнего синка.
  const rows = (await sql`
    SELECT EXTRACT(EPOCH FROM (now() - MAX(synced_at)))::int AS ago FROM jira_cache
  `) as Array<{ ago: number | null }>;
  const ago = rows[0]?.ago ?? null;
  if (ago !== null && ago < COOLDOWN_SECONDS) {
    const retryAfter = COOLDOWN_SECONDS - ago;
    return NextResponse.json(
      { error: "cooldown", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  try {
    const result = await syncActiveSprintEpics();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
