import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Resolves the signed-in user's workspace. A user can belong to more than
 * one workspace (team invites), but Milestone 1 has no workspace switcher
 * yet, so we operate on the earliest membership — normally the workspace
 * auto-provisioned at signup.
 */
export async function requireCurrentWorkspace() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: { workspace: { include: { brandKit: { include: { assets: true } } } } },
  });

  if (!membership) throw new Error("NO_WORKSPACE");

  return { userId: session.user.id, role: membership.role, workspace: membership.workspace };
}
