import { randomUUID } from "crypto";
import type { CreateRequestResponse, RequestStatusResponse } from "./schemas";

/**
 * Deterministic in-memory fake of the Higgsfield async job lifecycle, keyed by
 * poll count rather than wall-clock time so tests never race a timer: the
 * first status check is "in_progress", every check after that is terminal.
 * This lets job-sync/SSE/polling code exercise a real multi-step transition
 * without network calls or flaky timing.
 */

type MockKind = "IMAGE" | "VIDEO";

const pollCounts = new Map<string, number>();
const kinds = new Map<string, MockKind>();

export function mockCreateRequest(kind: MockKind): CreateRequestResponse {
  const requestId = `mock_${randomUUID()}`;
  pollCounts.set(requestId, 0);
  kinds.set(requestId, kind);
  return { request_id: requestId, status: "queued" };
}

export function mockGetStatus(requestId: string): RequestStatusResponse {
  const kind = kinds.get(requestId);
  if (!kind) {
    return { request_id: requestId, status: "failed", error: "Unknown mock request_id" };
  }

  const count = (pollCounts.get(requestId) ?? 0) + 1;
  pollCounts.set(requestId, count);

  if (count === 1) {
    return { request_id: requestId, status: "in_progress" };
  }

  if (kind === "IMAGE") {
    return {
      request_id: requestId,
      status: "completed",
      payload: { images: [{ url: `https://mock.higgsfield.local/${requestId}.png` }] },
    };
  }

  return {
    request_id: requestId,
    status: "completed",
    payload: { video: { url: `https://mock.higgsfield.local/${requestId}.mp4` } },
  };
}

export function mockCancelRequest(requestId: string): void {
  kinds.delete(requestId);
  pollCounts.delete(requestId);
}

/** Test-only: reset all mock state between test files/cases. */
export function __resetMockHiggsfieldState(): void {
  pollCounts.clear();
  kinds.clear();
}
