import type { SslStatus } from "@prisma/client";

export function deriveStatus(
  validTo: Date | null,
  hostnameValid: boolean,
  warnDays: number,
  now = new Date(),
): SslStatus {
  if (!hostnameValid || !validTo) {
    return "ERROR";
  }

  const daysRemaining = Math.ceil(
    (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysRemaining < 0) {
    return "ERROR";
  }

  if (daysRemaining <= warnDays) {
    return "WARNING";
  }

  return "OK";
}

export function statusRank(status: SslStatus): number {
  switch (status) {
    case "OK":
      return 0;
    case "WARNING":
      return 1;
    case "ERROR":
      return 2;
  }
}

export function shouldSendFailureAlert(
  previous: SslStatus | null,
  current: SslStatus,
): boolean {
  if (!previous) {
    return current !== "OK";
  }
  return statusRank(current) > statusRank(previous);
}

export function shouldSendRecoveryAlert(
  previous: SslStatus | null,
  current: SslStatus,
): boolean {
  return previous !== null && previous !== "OK" && current === "OK";
}
