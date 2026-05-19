import tls from "node:tls";
import { deriveStatus } from "./status.js";
import type { SslStatus } from "@prisma/client";

export type SslCheckOutcome = {
  status: SslStatus;
  validTo: Date | null;
  daysRemaining: number | null;
  issuer: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

const TIMEOUT_MS = 10_000;

function parseIssuer(cert: tls.PeerCertificate): string | null {
  if (cert.issuer && typeof cert.issuer === "object" && "O" in cert.issuer) {
    const org = cert.issuer.O;
    if (typeof org === "string") return org;
  }
  return null;
}

function hostnameMatches(cert: tls.PeerCertificate, host: string): boolean {
  if (cert.subject?.CN === host) return true;
  const altNames = cert.subjectaltname;
  if (!altNames) return false;
  const entries = altNames.split(", ").map((part) => part.replace(/^DNS:/i, ""));
  return entries.some((name) => {
    if (name === host) return true;
    if (name.startsWith("*.")) {
      const suffix = name.slice(1);
      const prefix = host.slice(0, host.length - suffix.length);
      return (
        host.endsWith(suffix) &&
        prefix.length > 0 &&
        !prefix.includes(".")
      );
    }
    return false;
  });
}

export async function checkCertificate(
  host: string,
  warnDays: number,
): Promise<SslCheckOutcome> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (outcome: SslCheckOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };

    const socket = tls.connect(
      {
        host,
        port: 443,
        servername: host,
        rejectUnauthorized: false,
        timeout: TIMEOUT_MS,
      },
      () => {
        try {
          const cert = socket.getPeerCertificate();
          socket.end();

          if (!cert || Object.keys(cert).length === 0) {
            finish({
              status: "ERROR",
              validTo: null,
              daysRemaining: null,
              issuer: null,
              errorCode: "NO_CERT",
              errorMessage: "No certificate returned",
            });
            return;
          }

          const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
          const hostnameValid = hostnameMatches(cert, host);
          const status = deriveStatus(validTo, hostnameValid, warnDays);
          const daysRemaining =
            validTo !== null
              ? Math.ceil(
                  (validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                )
              : null;

          finish({
            status,
            validTo,
            daysRemaining,
            issuer: parseIssuer(cert),
            errorCode: hostnameValid ? null : "HOSTNAME_MISMATCH",
            errorMessage: hostnameValid
              ? null
              : `Certificate does not match ${host}`,
          });
        } catch (err) {
          finish({
            status: "ERROR",
            validTo: null,
            daysRemaining: null,
            issuer: null,
            errorCode: "PARSE_ERROR",
            errorMessage:
              err instanceof Error ? err.message : "Certificate parse failed",
          });
        }
      },
    );

    socket.on("error", (err) => {
      socket.destroy();
      finish({
        status: "ERROR",
        validTo: null,
        daysRemaining: null,
        issuer: null,
        errorCode: "TLS_ERROR",
        errorMessage: err.message,
      });
    });

    socket.on("timeout", () => {
      socket.destroy();
      finish({
        status: "ERROR",
        validTo: null,
        daysRemaining: null,
        issuer: null,
        errorCode: "TIMEOUT",
        errorMessage: `Connection timed out after ${TIMEOUT_MS}ms`,
      });
    });
  });
}
