// src/lib/jira.test.ts
import { describe, it, expect } from "vitest";
import { fetchEpicsMeta, fetchRetestPct, isDoneStatus } from "./jira";

// Оффлайн (без сети): регистронезависимый детект готовности.
describe("isDoneStatus", () => {
  it("true для done/rf_release в любом регистре и языке", () => {
    expect(isDoneStatus("done")).toBe(true);
    expect(isDoneStatus("DONE")).toBe(true);
    expect(isDoneStatus("Готово")).toBe(true);
    expect(isDoneStatus("готово")).toBe(true);
    expect(isDoneStatus("R.F Release")).toBe(true);
    expect(isDoneStatus("rf release")).toBe(true);
  });

  it("false для не-готовых статусов", () => {
    expect(isDoneStatus("QA testing")).toBe(false);
    expect(isDoneStatus("analysis")).toBe(false);
  });
});

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
