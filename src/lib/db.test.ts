import { describe, it, expect } from "vitest";
import { query } from "./db";

describe("db", () => {
  it("подключается и выполняет простой запрос", async () => {
    const result = await query<{ one: number }>`SELECT 1 AS one`;
    expect(result[0].one).toBe(1);
  });
});
