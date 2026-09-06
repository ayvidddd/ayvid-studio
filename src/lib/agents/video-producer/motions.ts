/**
 * Higgsfield's video models take camera movement purely as free text in the
 * prompt — there's no discrete motion-preset endpoint on the public API (the
 * one model that has a typed `motions` field takes opaque preset UUIDs with
 * no public listing endpoint to discover them). This is our own curated set
 * of phrases to fold into a prompt, not a call to Higgsfield.
 */
export const MOTION_PRESETS = [
  { id: "slow-pan-left", label: "Slow pan left", prompt: "slow, smooth camera pan from right to left" },
  { id: "slow-pan-right", label: "Slow pan right", prompt: "slow, smooth camera pan from left to right" },
  { id: "zoom-in", label: "Zoom in", prompt: "slow, steady zoom in toward the subject" },
  { id: "zoom-out", label: "Zoom out", prompt: "slow, steady zoom out from the subject" },
  { id: "orbit", label: "Orbit the subject", prompt: "camera slowly orbits around the subject" },
  { id: "parallax-drift", label: "Parallax drift", prompt: "gentle parallax drift, foreground and background moving at different speeds" },
  { id: "push-in", label: "Push in", prompt: "camera pushes in toward the subject, gaining intimacy" },
  { id: "handheld", label: "Subtle handheld", prompt: "subtle handheld camera movement, natural and organic" },
] as const;
