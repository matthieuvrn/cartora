#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const severityOrder = ["low", "moderate", "high", "critical"];
const defaultAuditLevel = "high";

function parseAuditLevel(argv) {
  const flag = argv.find((arg) => arg.startsWith("--audit-level="));
  if (!flag) return defaultAuditLevel;

  const level = flag.split("=", 2)[1];
  if (!severityOrder.includes(level)) {
    throw new Error(
      `Unsupported audit level "${level}". Expected one of: ${severityOrder.join(", ")}`,
    );
  }

  return level;
}

function collectPackage(node, packageName, versionsByName, visitedPaths) {
  if (!node || typeof node !== "object") return;

  const resolvedName =
    packageName ??
    (typeof node.name === "string" ? node.name : null) ??
    (typeof node.from === "string" ? node.from : null);
  const nodeVersion = typeof node.version === "string" ? node.version : null;
  const nodePath =
    typeof node.path === "string"
      ? node.path
      : `${resolvedName ?? "unknown"}@${nodeVersion ?? "unknown"}`;

  if (visitedPaths.has(nodePath)) {
    return;
  }
  visitedPaths.add(nodePath);

  if (resolvedName && nodeVersion && !node.private) {
    const versions = versionsByName.get(resolvedName) ?? new Set();
    versions.add(nodeVersion);
    versionsByName.set(resolvedName, versions);
  }

  if (!node.dependencies || typeof node.dependencies !== "object") {
    return;
  }

  for (const [childName, childNode] of Object.entries(node.dependencies)) {
    collectPackage(childNode, childName, versionsByName, visitedPaths);
  }
}

function getSeverityIndex(severity) {
  return severityOrder.indexOf(severity);
}

async function main() {
  const auditLevel = parseAuditLevel(process.argv.slice(2));
  const dependencyTreeJson = execFileSync(
    "pnpm",
    ["list", "--lockfile-only", "--prod", "--json", "--depth", "Infinity"],
    {
      encoding: "utf8",
      maxBuffer: 100 * 1024 * 1024,
    },
  );

  const dependencyTree = JSON.parse(dependencyTreeJson);
  const versionsByName = new Map();
  const visitedPaths = new Set();

  for (const project of dependencyTree) {
    collectPackage(project, project?.name, versionsByName, visitedPaths);
  }

  const requestBody = Object.fromEntries(
    [...versionsByName.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, versions]) => [name, [...versions].sort()]),
  );

  if (Object.keys(requestBody).length === 0) {
    console.log("No production dependencies found to audit.");
    return;
  }

  const registry = process.env.npm_config_registry ?? "https://registry.npmjs.org/";
  const advisoryUrl = new URL("/-/npm/v1/security/advisories/bulk", registry);

  const response = await fetch(advisoryUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`Audit request failed with ${response.status}: ${responseBody.slice(0, 500)}`);
  }

  const advisoriesByPackage = await response.json();
  const minimumSeverity = getSeverityIndex(auditLevel);
  const findings = [];
  const seenFindings = new Set();

  for (const [packageName, advisories] of Object.entries(advisoriesByPackage)) {
    if (!Array.isArray(advisories)) continue;

    for (const advisory of advisories) {
      const severity = advisory?.severity;
      if (typeof severity !== "string" || getSeverityIndex(severity) < minimumSeverity) {
        continue;
      }

      const key = `${packageName}:${advisory.id ?? advisory.url ?? advisory.title ?? severity}`;
      if (seenFindings.has(key)) {
        continue;
      }

      seenFindings.add(key);
      findings.push({
        packageName,
        severity,
        title: advisory.title ?? "Untitled advisory",
        id: advisory.id ?? "unknown",
        url: advisory.url ?? "",
        vulnerableVersions: advisory.vulnerable_versions ?? "unknown",
      });
    }
  }

  findings.sort((left, right) => {
    const severityDiff = getSeverityIndex(right.severity) - getSeverityIndex(left.severity);
    if (severityDiff !== 0) return severityDiff;
    return left.packageName.localeCompare(right.packageName);
  });

  if (findings.length === 0) {
    console.log(
      `No ${auditLevel}-or-higher production vulnerabilities found across ${versionsByName.size} packages.`,
    );
    return;
  }

  console.error(`Found ${findings.length} ${auditLevel}-or-higher production vulnerabilities:`);
  for (const finding of findings) {
    console.error(
      `- [${finding.severity}] ${finding.packageName}: ${finding.title} (${finding.vulnerableVersions})`,
    );
    if (finding.url) {
      console.error(`  ${finding.url}`);
    }
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
});
