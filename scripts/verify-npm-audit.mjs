import { readFileSync } from "node:fs";

const auditFile = process.argv[2];

if (!auditFile) {
  console.error("Uso: node scripts/verify-npm-audit.mjs <npm-audit.json>");
  process.exit(1);
}

const allowedAdvisories = new Set(["GHSA-qwww-vcr4-c8h2"]);
let report;

try {
  report = JSON.parse(readFileSync(auditFile, "utf8"));
} catch (error) {
  console.error(`No se pudo leer el reporte de npm audit: ${error.message}`);
  process.exit(1);
}

const violations = [];

for (const [packageName, vulnerability] of Object.entries(report.vulnerabilities ?? {})) {
  if (!["high", "critical"].includes(vulnerability.severity)) continue;

  const advisories = (vulnerability.via ?? []).filter(
    (entry) => entry && typeof entry === "object"
  );

  for (const advisory of advisories) {
    const advisoryId = advisory.url?.match(/GHSA-[\w-]+/)?.[0];
    if (!advisoryId || !allowedAdvisories.has(advisoryId)) {
      violations.push({ packageName, advisoryId: advisoryId ?? "sin identificador", title: advisory.title });
    }
  }
}

if (violations.length > 0) {
  console.error("Vulnerabilidades de producción no aceptadas:");
  for (const violation of violations) {
    console.error(`- ${violation.packageName}: ${violation.advisoryId} — ${violation.title ?? "sin título"}`);
  }
  process.exit(1);
}

const accepted = Object.values(report.vulnerabilities ?? {}).flatMap((vulnerability) =>
  (vulnerability.via ?? [])
    .filter((entry) => entry && typeof entry === "object")
    .map((advisory) => advisory.url?.match(/GHSA-[\w-]+/)?.[0])
    .filter((id) => id && allowedAdvisories.has(id))
);

if (accepted.length > 0) {
  console.warn(
    "Advertencia aceptada: GHSA-qwww-vcr4-c8h2 (react-router RSC). Ver docs/security-exceptions.md."
  );
}
console.log("npm audit de producción verificado.");
