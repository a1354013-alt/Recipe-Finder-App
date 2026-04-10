import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const releaseRoot = path.join(repoRoot, "release");
const releaseDir = path.join(releaseRoot, "recipe-finder-app");

const excludedNames = new Set([
  ".git",
  "node_modules",
  "dist",
  "release",
  ".manus-logs",
  ".webdev",
  ".env",
]);

const excludedSuffixes = [".tar.gz", ".zip", ".log"];

async function recreateDir(dir) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

function shouldExclude(relativePath, entryName) {
  if (!relativePath) {
    return false;
  }

  const topLevelName = relativePath.split(path.sep)[0];
  if (excludedNames.has(topLevelName)) {
    return true;
  }

  return excludedSuffixes.some((suffix) => entryName.endsWith(suffix));
}

async function copyTree(sourceDir, targetDir, relativePrefix = "") {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const relativePath = path.join(relativePrefix, entry.name);

    if (shouldExclude(relativePath, entry.name)) {
      continue;
    }

    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await fs.mkdir(targetPath, { recursive: true });
      await copyTree(sourcePath, targetPath, relativePath);
      continue;
    }

    if (entry.isFile()) {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

async function main() {
  await recreateDir(releaseDir);
  await copyTree(repoRoot, releaseDir);
  console.log(`Clean release staged at ${releaseDir}`);
}

main().catch((error) => {
  console.error("Failed to prepare release package", error);
  process.exitCode = 1;
});
