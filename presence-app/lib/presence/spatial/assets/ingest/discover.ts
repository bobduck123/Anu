import { readdir } from "node:fs/promises";
import path from "node:path";

const SUPPORTED_EXTENSIONS = new Set([".glb", ".gltf"]);
const IGNORED_DIRECTORIES = new Set(["node_modules", ".git", "textures", "__macosx"]);

export interface DiscoveredSource {
  absolutePath: string;
  relativePath: string;
}

/**
 * Recursively finds every `.glb`/`.gltf` under the source root. Discovery is
 * read-only; the pipeline never writes into, renames or deletes source folders.
 *
 * `textures/` is skipped as a directory name only — it never contains models in
 * the Sketchfab-style layouts this batch uses, and skipping it avoids scanning
 * large image folders.
 */
export async function discoverSources(sourceRoot: string): Promise<DiscoveredSource[]> {
  const found: DiscoveredSource[] = [];

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name.toLowerCase())) continue;
        await walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      found.push({
        absolutePath,
        relativePath: path.relative(sourceRoot, absolutePath).split(path.sep).join("/"),
      });
    }
  }

  await walk(sourceRoot);
  found.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return found;
}
