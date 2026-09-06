import "server-only";
import { z } from "zod";
import {
  CreateRequestResponseSchema,
  RequestStatusResponseSchema,
  type CreateRequestResponse,
  type RequestStatusResponse,
  type ImageGenerationInput,
  type ImageToVideoInput,
} from "./schemas";
import { mockCreateRequest, mockGetStatus, mockCancelRequest } from "./mock";

const BASE_URL = process.env.HIGGSFIELD_API_BASE_URL ?? "https://api.higgsfield.ai";

export class HiggsfieldApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`Higgsfield API error (${status})`);
  }
}

function isMockMode(): boolean {
  return process.env.HIGGSFIELD_MODE === "mock" || process.env.NODE_ENV === "test";
}

function authHeader(): string {
  const id = process.env.HIGGSFIELD_API_KEY_ID;
  const secret = process.env.HIGGSFIELD_API_KEY_SECRET;
  if (!id || !secret) {
    throw new Error("HIGGSFIELD_API_KEY_ID / HIGGSFIELD_API_KEY_SECRET are not configured.");
  }
  return `Key ${id}:${secret}`;
}

async function apiRequest<T>(path: string, init: RequestInit, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: authHeader(), ...init.headers },
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) throw new HiggsfieldApiError(res.status, json);

  return schema.parse(json);
}

function toImageApiBody(input: ImageGenerationInput) {
  return {
    prompt: input.prompt,
    num_images: input.numImages,
    resolution: input.resolution,
    aspect_ratio: input.aspectRatio,
  };
}

function toVideoApiBody(input: ImageToVideoInput) {
  return {
    image_url: input.imageUrl,
    prompt: input.prompt,
    duration: input.duration,
    cfg_scale: input.cfgScale,
    negative_prompt: input.negativePrompt,
  };
}

export async function createImageGeneration(params: {
  model: string;
  input: ImageGenerationInput;
  webhookUrl?: string;
}): Promise<CreateRequestResponse> {
  if (isMockMode()) return mockCreateRequest("IMAGE");

  const query = params.webhookUrl ? `?hf_webhook=${encodeURIComponent(params.webhookUrl)}` : "";
  return apiRequest(
    `/${params.model}${query}`,
    { method: "POST", body: JSON.stringify(toImageApiBody(params.input)) },
    CreateRequestResponseSchema,
  );
}

export async function createImageToVideo(params: {
  model: string;
  input: ImageToVideoInput;
  webhookUrl?: string;
}): Promise<CreateRequestResponse> {
  if (isMockMode()) return mockCreateRequest("VIDEO");

  const query = params.webhookUrl ? `?hf_webhook=${encodeURIComponent(params.webhookUrl)}` : "";
  return apiRequest(
    `/${params.model}${query}`,
    { method: "POST", body: JSON.stringify(toVideoApiBody(params.input)) },
    CreateRequestResponseSchema,
  );
}

export async function getRequestStatus(requestId: string): Promise<RequestStatusResponse> {
  if (isMockMode()) return mockGetStatus(requestId);

  return apiRequest(`/requests/${requestId}/status`, { method: "GET" }, RequestStatusResponseSchema);
}

export async function cancelRequest(requestId: string): Promise<void> {
  if (isMockMode()) {
    mockCancelRequest(requestId);
    return;
  }

  await apiRequest(`/requests/${requestId}/cancel`, { method: "POST" }, z.unknown());
}
