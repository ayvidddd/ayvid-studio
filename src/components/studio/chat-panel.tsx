"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStudioStore, createLayerId } from "@/lib/studio/store";
import { Send } from "lucide-react";
import { toast } from "sonner";

interface GenerationToolOutput {
  ok: boolean;
  error?: string;
  data?: {
    status?: string;
    images?: string[];
    available?: boolean;
    message?: string;
  };
}

function isGenerationToolOutput(value: unknown): value is GenerationToolOutput {
  return typeof value === "object" && value !== null && "ok" in value;
}

function isToolPart(part: UIMessage["parts"][number]): part is Extract<
  UIMessage["parts"][number],
  { type: `tool-${string}`; state: string; toolCallId: string }
> {
  return part.type.startsWith("tool-");
}

const IMAGE_PRODUCING_TOOLS = new Set(["tool-generate_image", "tool-edit_image"]);
const VIDEO_PRODUCING_TOOLS = new Set(["tool-generate_video"]);

// The server (src/app/api/studio/[designId]/chat/route.ts) already maps raw
// errors to a specific, safe-to-display message via toUIMessageStreamResponse's
// onError — this just prefixes it for context in the chat transcript.
function describeChatError(error: Error): string {
  return `Chat error: ${error.message}`;
}

export function ChatPanel({ designId }: { designId: string }) {
  const [input, setInput] = useState("");
  const addLayer = useStudioStore((s) => s.addLayer);
  const addVideo = useStudioStore((s) => s.addVideo);
  const canvas = useStudioStore((s) => s.canvas);
  const placedToolCallIds = useRef<Set<string>>(new Set());

  const [transport] = useState(
    () => new DefaultChatTransport({ api: `/api/studio/${designId}/chat`, body: { designId } }),
  );
  const { messages, sendMessage, status, error } = useChat({
    transport,
    onError: (err) => toast.error(describeChatError(err)),
  });

  useEffect(() => {
    for (const message of messages) {
      if (message.role !== "assistant") continue;

      for (const part of message.parts) {
        if (!isToolPart(part)) continue;
        if (part.state !== "output-available") continue;
        if (placedToolCallIds.current.has(part.toolCallId)) continue;

        const output = "output" in part ? part.output : undefined;
        if (!isGenerationToolOutput(output) || !output.ok) continue;
        if (output.data?.status !== "COMPLETED") continue;
        const url = output.data.images?.[0];
        if (!url) continue;

        if (IMAGE_PRODUCING_TOOLS.has(part.type)) {
          placedToolCallIds.current.add(part.toolCallId);
          addLayer({
            id: createLayerId(),
            type: "image",
            src: url,
            x: canvas.width * 0.1,
            y: canvas.height * 0.1,
            width: canvas.width * 0.8,
            height: canvas.height * 0.8,
            rotation: 0,
            opacity: 1,
          });
        } else if (VIDEO_PRODUCING_TOOLS.has(part.type)) {
          placedToolCallIds.current.add(part.toolCallId);
          addVideo({ id: createLayerId(), jobId: part.toolCallId, url });
        }
      }
    }
  }, [messages, addLayer, addVideo, canvas.width, canvas.height]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  }

  const isBusy = status === "submitted" || status === "streaming";

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 p-3">
        <div className="flex flex-col gap-3">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Tell the Designer what to create — e.g. &ldquo;a hero shot of our protein bar on a
              marble counter, warm morning light&rdquo;.
            </p>
          )}
          {messages.map((message) => (
            <ChatMessageBubble key={message.id} message={message} />
          ))}
          {error && (
            <div className="max-w-[85%] self-start rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {describeChatError(error)}
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Message the Designer…"
          rows={2}
          disabled={isBusy}
          className="resize-none"
        />
        <Button type="submit" size="icon" disabled={isBusy || !input.trim()}>
          <Send />
        </Button>
      </form>
    </div>
  );
}

function ChatMessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          return (
            <div
              key={index}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                isUser ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              {part.text}
            </div>
          );
        }

        if (isToolPart(part)) {
          return <ToolStatusPill key={index} part={part} />;
        }

        return null;
      })}
    </div>
  );
}

function ToolStatusPill({
  part,
}: {
  part: Extract<UIMessage["parts"][number], { type: `tool-${string}`; state: string; toolCallId: string }>;
}) {
  const toolName = part.type.replace(/^tool-/, "").replace(/_/g, " ");

  if (part.state === "input-streaming" || part.state === "input-available") {
    return <p className="text-xs text-muted-foreground">Running {toolName}…</p>;
  }

  if (part.state === "output-error") {
    return <p className="text-xs text-destructive">{toolName} failed: {String("errorText" in part ? part.errorText : "unknown error")}</p>;
  }

  const output = "output" in part ? part.output : undefined;
  if (isGenerationToolOutput(output)) {
    if (!output.ok) return <p className="text-xs text-destructive">{toolName}: {output.error}</p>;
    if (output.data?.available === false) return <p className="text-xs text-muted-foreground">{output.data.message}</p>;
    if (output.data?.status === "COMPLETED") {
      const destination = VIDEO_PRODUCING_TOOLS.has(part.type) ? "video preview" : "canvas";
      return <p className="text-xs text-muted-foreground">{toolName}: done — added to {destination}.</p>;
    }
    if (output.data?.status) return <p className="text-xs text-muted-foreground">{toolName}: {output.data.status.toLowerCase()}</p>;
  }

  return <p className="text-xs text-muted-foreground">{toolName}: done.</p>;
}
