"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { ok, fail, type ActionResult } from "@/lib/actions/result";
import { EMPTY_CANVAS, canvasSnapshotSchema, type CanvasSnapshot } from "./types";

async function requireDesignInCurrentWorkspace(designId: string) {
  const { workspace } = await requireCurrentWorkspace();
  const design = await prisma.design.findFirst({ where: { id: designId, workspaceId: workspace.id } });
  if (!design) throw new Error("NOT_FOUND");
  return { workspace, design };
}

export async function createDesign(name: string): Promise<ActionResult<{ id: string }>> {
  const parsed = z.string().min(1).max(120).safeParse(name);
  if (!parsed.success) return fail("Give the design a name.");

  try {
    const { workspace } = await requireCurrentWorkspace();
    const design = await prisma.design.create({
      data: {
        workspaceId: workspace.id,
        name: parsed.data,
        versions: { create: { sequence: 0, layers: EMPTY_CANVAS } },
      },
    });
    revalidatePath("/studio");
    return ok({ id: design.id });
  } catch {
    return fail("Could not create the design. Please try again.");
  }
}

export async function listDesigns(): Promise<ActionResult<{ id: string; name: string; updatedAt: Date }[]>> {
  try {
    const { workspace } = await requireCurrentWorkspace();
    const designs = await prisma.design.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, updatedAt: true },
    });
    return ok(designs);
  } catch {
    return fail("Could not load your designs.");
  }
}

export async function getDesign(
  designId: string,
): Promise<ActionResult<{ id: string; name: string; canvas: CanvasSnapshot; versionCount: number }>> {
  try {
    const { design } = await requireDesignInCurrentWorkspace(designId);
    const latest = await prisma.designVersion.findFirst({
      where: { designId },
      orderBy: { sequence: "desc" },
    });
    const versionCount = await prisma.designVersion.count({ where: { designId } });
    const parsedCanvas = canvasSnapshotSchema.safeParse(latest?.layers);

    return ok({
      id: design.id,
      name: design.name,
      canvas: parsedCanvas.success ? parsedCanvas.data : EMPTY_CANVAS,
      versionCount,
    });
  } catch {
    return fail("Design not found.");
  }
}

export async function saveDesignVersion(
  designId: string,
  canvas: CanvasSnapshot,
): Promise<ActionResult<{ sequence: number }>> {
  const parsed = canvasSnapshotSchema.safeParse(canvas);
  if (!parsed.success) return fail("Invalid canvas state.");

  try {
    const { design } = await requireDesignInCurrentWorkspace(designId);

    const latest = await prisma.designVersion.findFirst({
      where: { designId: design.id },
      orderBy: { sequence: "desc" },
    });
    const nextSequence = (latest?.sequence ?? -1) + 1;

    await prisma.$transaction([
      prisma.designVersion.create({
        data: { designId: design.id, sequence: nextSequence, layers: parsed.data },
      }),
      prisma.design.update({ where: { id: design.id }, data: { updatedAt: new Date() } }),
    ]);

    revalidatePath(`/studio/${design.id}`);
    return ok({ sequence: nextSequence });
  } catch {
    return fail("Could not save this version. Please try again.");
  }
}

export async function listDesignVersions(
  designId: string,
): Promise<ActionResult<{ id: string; sequence: number; createdAt: Date }[]>> {
  try {
    const { design } = await requireDesignInCurrentWorkspace(designId);
    const versions = await prisma.designVersion.findMany({
      where: { designId: design.id },
      orderBy: { sequence: "desc" },
      select: { id: true, sequence: true, createdAt: true },
    });
    return ok(versions);
  } catch {
    return fail("Could not load version history.");
  }
}
