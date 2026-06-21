import { describe, it, expect, vi } from "vitest";

// Мокаем БД — не нужна реальная БД для unit-теста формата ответа
vi.mock("@/lib/db", () => ({
  sql: vi.fn().mockResolvedValue([]),
}));

describe("GET /api/sprint/active", () => {
  it("возвращает 404 если нет активного спринта", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/sprint/active");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});
