import "server-only";
import { prisma } from "@/lib/prisma";

export interface ToolLogEvent {
  tool: string;
  workspaceId: string;
  status: "start" | "success" | "error";
  durationMs?: number;
  error?: string;
}

type EvalHook = (event: ToolLogEvent) => void;
const evalHooks: EvalHook[] = [];

/** Registers a hook for every tool invocation — the extension point for eval/observability pipelines. */
export function onToolEvent(hook: EvalHook): void {
  evalHooks.push(hook);
}

function emit(event: ToolLogEvent): void {
  console.log(JSON.stringify({ at: "agent-tool", ...event }));
  for (const hook of evalHooks) hook(event);
}

const RETRYABLE_MESSAGE = /fetch failed|ECONNRESET|ETIMEDOUT|network|timeout/i;

function isRetryable(error: unknown): boolean {
  return error instanceof Error && RETRYABLE_MESSAGE.test(error.message);
}

export type AgentToolResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Wraps a tool's business logic with the harness every agent tool shares:
 * a fast-fail credit check, retries with backoff on transient failures, and
 * structured start/success/error logging with an eval-hook extension point.
 *
 * Input validation is the caller's job — the Vercel AI SDK already validates
 * against each tool's Zod `inputSchema` before `execute` runs, so this isn't
 * duplicated here.
 */
export async function runAgentTool<T>(
  params: { name: string; workspaceId: string; creditCost?: number; maxRetries?: number },
  handler: () => Promise<T>,
): Promise<AgentToolResult<T>> {
  const start = Date.now();
  emit({ tool: params.name, workspaceId: params.workspaceId, status: "start" });

  if (params.creditCost) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: params.workspaceId },
      select: { creditBalance: true },
    });
    if (!workspace || workspace.creditBalance < params.creditCost) {
      emit({ tool: params.name, workspaceId: params.workspaceId, status: "error", error: "insufficient_credits" });
      return { ok: false, error: "Not enough credits in this workspace for this action." };
    }
  }

  const maxRetries = params.maxRetries ?? 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const data = await handler();
      emit({ tool: params.name, workspaceId: params.workspaceId, status: "success", durationMs: Date.now() - start });
      return { ok: true, data };
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === maxRetries) break;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Tool execution failed.";
  emit({ tool: params.name, workspaceId: params.workspaceId, status: "error", error: message });
  return { ok: false, error: message };
}
