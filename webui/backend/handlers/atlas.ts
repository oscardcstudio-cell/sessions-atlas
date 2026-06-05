import { Context } from "hono";
import { readTextFile } from "../utils/fs.ts";
import { logger } from "../utils/logger.ts";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../.."); // sessions-atlas/ root
const ATLAS_INDEX = join(ROOT, "atlas-index.json");
const GENERATE_SCRIPT = join(ROOT, "generate-atlas.mjs");

function runGenerate() {
  execSync(`node "${GENERATE_SCRIPT}"`, { cwd: ROOT, stdio: "pipe" });
}

async function readIndex() {
  return JSON.parse(await readTextFile(ATLAS_INDEX));
}

export async function handleAtlasRequest(c: Context) {
  try {
    return c.json(await readIndex());
  } catch {
    try {
      runGenerate();
      return c.json(await readIndex());
    } catch (err) {
      logger.api.error("Atlas load failed: {error}", { error: err });
      return c.json({ projects: [], stats: {}, error: "failed" }, 500);
    }
  }
}

export async function handleAtlasRegenRequest(c: Context) {
  try {
    runGenerate();
    return c.json(await readIndex());
  } catch (err) {
    logger.api.error("Atlas regen failed: {error}", { error: err });
    return c.json({ error: "Regen failed" }, 500);
  }
}

export async function handlePlanRequest(c: Context) {
  const projectPath = c.req.query("path");
  if (!projectPath) return c.json(null);
  const decoded = decodeURIComponent(projectPath);
  const planPath = join(decoded, ".planning/launch-plan.json");
  try {
    return c.json(JSON.parse(await readTextFile(planPath)));
  } catch {
    return c.json(null);
  }
}
