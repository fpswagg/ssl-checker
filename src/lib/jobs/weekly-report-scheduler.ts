import { env } from "../env.js";
import { runWeeklyReport } from "./run-checks.js";

let timer: NodeJS.Timeout | undefined;
let running = false;
let lastSentDateKey: string | null = null;

export function shouldSendWeeklyReport(
  now: Date,
  lastSent: string | null,
): boolean {
  if (now.getUTCDay() !== env.weeklyReportDay) {
    return false;
  }
  if (now.getUTCHours() < env.weeklyReportHour) {
    return false;
  }

  const dateKey = now.toISOString().slice(0, 10);
  return lastSent !== dateKey;
}

async function tick(now = new Date()): Promise<void> {
  if (running || !shouldSendWeeklyReport(now, lastSentDateKey)) {
    return;
  }

  running = true;
  const dateKey = now.toISOString().slice(0, 10);
  try {
    const result = await runWeeklyReport();
    if (result.ok) {
      lastSentDateKey = dateKey;
      console.log(`Weekly SSL report sent (${dateKey})`);
    } else {
      console.error(`Weekly SSL report failed: ${result.error}`);
    }
  } catch (err) {
    console.error("Weekly SSL report failed", err);
  } finally {
    running = false;
  }
}

export function startWeeklyReportScheduler(): void {
  if (!env.weeklyReportEnabled || timer) {
    return;
  }

  const pollMs = Math.max(10, env.autoCheckPollSeconds) * 1000;

  void tick();
  timer = setInterval(() => {
    void tick();
  }, pollMs);
}
