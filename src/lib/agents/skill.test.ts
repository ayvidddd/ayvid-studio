import { describe, expect, it, vi, beforeEach } from "vitest";
import path from "node:path";

const readFile = vi.fn();
vi.mock("node:fs/promises", () => ({
  readFile: (...args: unknown[]) => readFile(...args),
}));

const { loadSkill } = await import("./skill");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadSkill", () => {
  it("reads skills/<agent>/SKILL.md relative to the process working directory", async () => {
    readFile.mockResolvedValue("# Designer\n...");

    const content = await loadSkill("designer");

    expect(content).toBe("# Designer\n...");
    expect(readFile).toHaveBeenCalledWith(path.join(process.cwd(), "skills", "designer", "SKILL.md"), "utf8");
  });

  it("caches the file content and only reads disk once per agent", async () => {
    readFile.mockResolvedValue("# Copywriter\n...");

    await loadSkill("copywriter-cache-test");
    await loadSkill("copywriter-cache-test");

    expect(readFile).toHaveBeenCalledTimes(1);
  });

  it("propagates a read error (e.g. missing skill file) to the caller", async () => {
    readFile.mockRejectedValue(new Error("ENOENT: no such file"));

    await expect(loadSkill("nonexistent-agent")).rejects.toThrow("ENOENT");
  });
});
