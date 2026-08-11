import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const CONTAINER_KEYS = [
  "registry_contract",
  "registryContract",
  "rcr_contract",
  "rcrContract",
  "reference_contract",
  "referenceContract",
];

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const APP_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const REPO_ROOT = path.resolve(APP_ROOT, "..");
const SELF_TEST_DIR = path.join(APP_ROOT, "__rcr_tripwire_probe__");
const BACKEND_SELF_TEST_DIR = path.join(REPO_ROOT, "flora-fauna", "backend", "scripts", "__rcr_tripwire_probe__");

// R1-sensitive allowlist: any addition that permits a new contract-container
// location must reopen B6/R1 review. Do not expand as a routine unblock.
const ALLOWED_PATHS = new Set([
  "presence-app/lib/presence/rcrContract.ts",
  "presence-app/lib/presence/rcrContract.test.ts",
  "presence-app/lib/editor/readiness.ts",
  "presence-app/lib/editor/readiness.test.ts",
  "presence-app/lib/presence/render/publicPayload.ts",
  "presence-app/lib/presence/render/publicPayload.test.ts",
  "presence-app/scripts/check-rcr-container-keys.mjs",
]);

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".tmp",
  "coverage",
  "dist",
  "node_modules",
  "PEACH",
  "test-results",
]);

const SCANNED_FILE_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".csv",
  ".cts",
  ".html",
  ".ini",
  ".js",
  ".json",
  ".jsonc",
  ".jsx",
  ".mjs",
  ".mts",
  ".py",
  ".sh",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has("--self-test")) {
    runSelfTest();
    return;
  }

  const violations = findViolations(REPO_ROOT);
  if (violations.length > 0) {
    printViolations(violations);
    process.exitCode = 1;
    return;
  }

  console.log("RCR container-key tripwire passed: no unapproved registry contract producers found.");
}

function runSelfTest() {
  fs.rmSync(SELF_TEST_DIR, { recursive: true, force: true });
  fs.rmSync(BACKEND_SELF_TEST_DIR, { recursive: true, force: true });

  const before = findViolations(REPO_ROOT);
  if (before.length > 0) {
    printViolations(before);
    throw new Error("Self-test cannot start because the current tree already has tripwire violations.");
  }

  try {
    fs.mkdirSync(SELF_TEST_DIR, { recursive: true });
    fs.mkdirSync(BACKEND_SELF_TEST_DIR, { recursive: true });
    const appProbePath = path.join(SELF_TEST_DIR, "bad-fixture.json");
    const backendProbePath = path.join(BACKEND_SELF_TEST_DIR, "bad_backend_seed.py");
    fs.writeFileSync(appProbePath, '{ "registry_contract": { "producer": true } }\n', "utf8");
    fs.writeFileSync(backendProbePath, 'reference_contract = { "producer": True }\n', "utf8");

    const planted = findViolations(REPO_ROOT);
    const relativeAppProbePath = relativePath(appProbePath);
    const relativeBackendProbePath = relativePath(backendProbePath);
    const appProbeDetected = planted.some((violation) => violation.file === relativeAppProbePath && violation.key === "registry_contract");
    const backendProbeDetected = planted.some((violation) => violation.file === relativeBackendProbePath && violation.key === "reference_contract");
    if (!appProbeDetected || !backendProbeDetected) {
      printViolations(planted);
      throw new Error("Self-test failed: planted registry contract container key was not detected.");
    }
    console.log(`Self-test planted violation detected at ${relativeAppProbePath}.`);
    console.log(`Self-test backend planted violation detected at ${relativeBackendProbePath}.`);
  } finally {
    fs.rmSync(SELF_TEST_DIR, { recursive: true, force: true });
    fs.rmSync(BACKEND_SELF_TEST_DIR, { recursive: true, force: true });
  }

  const after = findViolations(REPO_ROOT);
  if (after.length > 0) {
    printViolations(after);
    throw new Error("Self-test restore failed: tripwire violations remain after probe cleanup.");
  }

  console.log("RCR container-key tripwire self-test passed: planted key failed, restored tree passed.");
}

function findViolations(root) {
  const violations = [];
  for (const filePath of walkFiles(root, violations)) {
    const relative = relativePath(filePath);
    if (ALLOWED_PATHS.has(relative)) continue;
    const content = readTextFile(filePath, violations);
    if (content === null) continue;
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const key of CONTAINER_KEYS) {
        if (line.includes(key)) {
          violations.push({ file: relative, line: index + 1, key });
        }
      }
    });
  }
  return violations;
}

function* walkFiles(directory, violations) {
  let entries;
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    violations.push(unreadableViolation(directory, error, "directory"));
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") && ![".agent", ".agents", ".codex"].includes(entry.name) && entry.name !== ".env.local") {
      continue;
    }
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (isIgnoredDirectory(entry.name)) continue;
      yield* walkFiles(entryPath, violations);
    } else if (entry.isFile() && shouldScanFile(entry.name)) {
      yield entryPath;
    }
  }
}

function readTextFile(filePath, violations) {
  try {
    const buffer = fs.readFileSync(filePath);
    if (buffer.includes(0)) return null;
    return buffer.toString("utf8");
  } catch (error) {
    violations.push(unreadableViolation(filePath, error, "file"));
    return null;
  }
}

function printViolations(violations) {
  console.error("RCR container-key tripwire failed. Unapproved registry contract container keys found:");
  for (const violation of violations) {
    if (violation.reason) {
      console.error(`- ${violation.file}: ${violation.reason}`);
    } else {
      console.error(`- ${violation.file}:${violation.line} contains ${violation.key}`);
    }
  }
}

function isIgnoredDirectory(name) {
  return IGNORED_DIRECTORIES.has(name) || name.startsWith("pytest-cache-files-");
}

function shouldScanFile(fileName) {
  if (fileName === "Dockerfile" || fileName === "Procfile" || fileName.startsWith(".env")) {
    return true;
  }
  return SCANNED_FILE_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function unreadableViolation(filePath, error, kind) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    file: relativePath(filePath),
    line: 0,
    key: `unreadable-${kind}`,
    reason: `unscanned ${kind}; ${message}`,
  };
}

function relativePath(filePath) {
  return path.relative(REPO_ROOT, filePath).replaceAll(path.sep, "/");
}

main();
