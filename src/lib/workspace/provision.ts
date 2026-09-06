import { prisma } from "@/lib/prisma";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "workspace";
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 0;
  // Collisions are rare (personal workspace names); a short linear probe is enough.
  while (await prisma.workspace.findUnique({ where: { slug: candidate } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

export async function provisionWorkspaceForUser(userId: string, displayName: string) {
  const workspaceName = `${displayName}'s Workspace`;
  const slug = await uniqueSlug(workspaceName);

  return prisma.workspace.create({
    data: {
      name: workspaceName,
      slug,
      memberships: {
        create: { userId, role: "OWNER" },
      },
      brandKit: {
        create: {
          name: displayName,
          palette: [],
          bannedWords: [],
        },
      },
    },
    include: { brandKit: true, memberships: true },
  });
}
