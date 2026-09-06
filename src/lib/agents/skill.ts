import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

const cache = new Map<string, string>();

/** Loads /skills/<agent>/SKILL.md — editable without a code change or redeploy of the calling logic. */
export async function loadSkill(agent: string): Promise<string> {
  const cached = cache.get(agent);
  if (cached) return cached;

  const filePath = path.join(process.cwd(), "skills", agent, "SKILL.md");
  const content = await readFile(filePath, "utf8");
  cache.set(agent, content);
  return content;
}
