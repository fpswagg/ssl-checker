import { env } from "../env.js";
import { notifyOpsError } from "../ops-notify.js";
import { runDueChecks } from "./run-checks.js";

let timer: NodeJS.Timeout | undefined;
let running = false;

async function tick(): Promise<void> {
  if (running) {
    return;
  }

  running = true;
  try {
    const summary = await runDueChecks();
    if (summary.checked > 0 || summary.errors.length > 0) {
      console.log(
        `Auto SSL checks complete: checked=${summary.checked}, alertsSent=${summary.alertsSent}, errors=${summary.errors.length}`,
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("Auto SSL checks failed", err);
    notifyOpsError({
      category: "auto-check",
      message: "Auto SSL checks failed",
      details: message,
    });
  } finally {
    running = false;
  }
}

export function startAutoCheckScheduler(): void {
  if (!env.autoCheckEnabled || timer) {
    return;
  }

  const pollMs = Math.max(10, env.autoCheckPollSeconds) * 1000;

  void tick();
  timer = setInterval(() => {
    void tick();
  }, pollMs);
}
