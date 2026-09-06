import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { prisma } from "@/lib/prisma";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { loadBrandKitContext, formatBrandKitForPrompt } from "@/lib/agents/context";
import { loadSkill } from "@/lib/agents/skill";
import { createDesignerTools } from "@/lib/agents/designer/tools";
import { createVideoProducerTools } from "@/lib/agents/video-producer/tools";
import { createCopywriterTools } from "@/lib/agents/copywriter/tools";
import { createCampaignStrategistTools } from "@/lib/agents/campaign-strategist/tools";

export const maxDuration = 60;

const SKILL_NAMES = ["creative-director", "designer", "video-producer", "copywriter", "campaign-strategist"] as const;

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

  const [skills, brandKit, modelMessages] = await Promise.all([
    Promise.all(SKILL_NAMES.map((name) => loadSkill(name))),
    loadBrandKitContext(workspaceId),
    convertToModelMessages(messages),
  ]);

  const system = [...skills, `## Current Brand Kit\n${formatBrandKitForPrompt(brandKit)}`].join("\n\n---\n\n");

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system,
    messages: modelMessages,
    tools: {
      ...createDesignerTools(workspaceId),
      ...createVideoProducerTools(workspaceId),
      ...createCopywriterTools(workspaceId),
      ...createCampaignStrategistTools(workspaceId),
    },
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse({ onError: describeStreamError });
}

/**
 * `toUIMessageStreamResponse()` sends a generic "An error occurred." to the
 * client by default, to avoid leaking internals — but a missing/invalid
 * ANTHROPIC_API_KEY is the single most common reason this route fails
 * locally, and "An error occurred." gives a developer nothing to act on.
 */
function describeStreamError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/invalid x-api-key|x-api-key.*missing|authentication_error/i.test(message)) {
    return "ANTHROPIC_API_KEY is missing or invalid — set a real key in .env.local to use the chat.";
  }
  return "The Creative Director hit an unexpected error. Check the server logs for details.";
}
