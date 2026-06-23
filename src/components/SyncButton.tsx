// src/components/SyncButton.tsx
// Кнопка ручного синка на борде (для всей команды, без админки).
// Бьёт в публичный /api/sync (кулдаун + same-origin на сервере), после успеха
// перезагружает данные доски. UX: спиннер, кулдаун-сообщение, ошибки.
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useBoardData } from "./BoardDataProvider";

export function SyncButton() {
  const { refetch } = useBoardData();
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0); // секунд до повторной попытки
  const [msg, setMsg] = useState<string | null>(null);
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Тикаем обратный отсчёт кулдауна.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const flash = useCallback((text: string) => {
    setMsg(text);
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMsg(null), 4000);
  }, []);

  async function onClick() {
    if (busy || cooldown > 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });

      if (res.status === 429) {
        const d = (await res.json().catch(() => ({}))) as { retryAfter?: number };
        const wait = d.retryAfter ?? 60;
        setCooldown(wait);
        flash(`Только что обновляли — подождите ${wait} с`);
        return;
      }
      if (!res.ok) {
        flash("Не удалось обновить, попробуйте позже");
        return;
      }

      const d = (await res.json()) as { errors?: unknown[] };
      await refetch();
      const errs = Array.isArray(d.errors) ? d.errors.length : 0;
      flash(errs ? `Обновлено (замечаний: ${errs})` : "Обновлено");
      // мягкий локальный кулдаун, чтобы не молотить сервер вхолостую
      setCooldown(30);
    } catch {
      flash("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || cooldown > 0;
  const label = busy ? "Обновление…" : cooldown > 0 ? `Обновить (${cooldown})` : "Обновить из Jira";

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title="Обновить данные из Jira"
        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
        {label}
      </button>
      {msg && <span className="whitespace-nowrap text-xs text-slate-500">{msg}</span>}
    </span>
  );
}
