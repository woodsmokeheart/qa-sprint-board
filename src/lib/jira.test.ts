// src/lib/jira.test.ts
import { describe, it, expect } from "vitest";
import { fetchEpicsMeta, fetchRetestPct } from "./jira";

// Запускать только с реальными кредами: npx vitest run src/lib/jira.test.ts
describe("jira client", () => {
  it("fetchEpicsMeta возвращает данные по BF-2209", async () => {
    const result = await fetchEpicsMeta(["BF-2209"]);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("BF-2209");
    expect(result[0].title).toBeTruthy();
    expect(result[0].jiraStatus).toBeTruthy();
  });

  it("fetchRetestPct возвращает число от 0 до 100 для BF-2209", async () => {
    const pct = await fetchRetestPct("BF-2209");
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(100);
    console.log("BF-2209 retest %:", pct);
  });
});
