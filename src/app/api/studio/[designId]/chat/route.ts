import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { prisma } from "@/lib/prisma";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { loadBrandKitContext, formatBrandKitForPrompt } from "@/lib/agents/context";
import { loadSkill } from "@/lib/agents/skill";
import { createDesignerTools } from "@/lib/agents/designer/tools";
import { createVideoProducerTools } from "@/lib/agents/video-producer/tools";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { messages, designId }: { messages: UIMessage[]; designId: string } = await request.json();

  let workspaceId: string;
  try {
    ({
      workspace: { id: workspaceId },
    } = await requireCurrentWorkspace());
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const design = await prisma.design.findFirst({ where: { id: designId, workspaceId } });
  if (!design) return new Response("Not found", { status: 404 });

  const [directorSkill, designerSkill, videoSkill, brandKit, modelMessages] = await Promise.all([
    loadSkill("creative-director"),
    loadSkill("designer"),
    loadSkill("video-producer"),
    loadBrandKitContext(workspaceId),
    convertToModelMessages(messages),
  ]);

  const system = [directorSkill, designerSkill, videoSkill, `## Current Brand Kit\n${formatBrandKitForPrompt(brandKit)}`].join(
    "\n\n---\n\n",
  );

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system,
    messages: modelMessages,
    tools: { ...createDesignerTools(workspaceId), ...createVideoProducerTools(workspaceId) },
    stopWhen: stepCountIs(6),
  });

  return result.toUIMessageStreamResponse();
}
