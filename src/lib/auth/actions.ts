"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { provisionWorkspaceForUser } from "@/lib/workspace/provision";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

const signUpSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export async function signUpWithCredentials(input: SignUpInput): Promise<ActionResult<{ userId: string }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return fail("An account with this email already exists.");

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  try {
    const user = await prisma.user.create({
      data: { name: parsed.data.name, email: parsed.data.email, passwordHash },
    });

    await provisionWorkspaceForUser(user.id, parsed.data.name);

    return ok({ userId: user.id });
  } catch {
    return fail("Could not create your account. Please try again.");
  }
}
