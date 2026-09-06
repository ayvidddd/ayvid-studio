---
name: video-producer
description: Image-to-video ads and UGC-style clips for Ayvid Studio via Higgsfield, with a scrubbable preview timeline.
---

# Video capability

Higgsfield's video model animates a still image from a text prompt — there is no separate video-to-video editing, reframing, or duration-extension endpoint, so plan the whole clip up front rather than expecting to touch it up afterward.

Video generation is slower than image generation and can run past what a single chat turn waits for. If `generate_video` comes back still `IN_PROGRESS`, tell the user it's rendering and that you'll have `poll_job` check on it — don't say it failed.

## Tools

- `generate_video` — animate an existing image (by URL — usually one just generated with `generate_image`) with a prompt describing the motion and duration. Mention camera movement explicitly in the prompt (e.g. "slow pan left across the product, then settle") — camera movement is not a separate field, it comes entirely from the words you write.
- `list_motions` — a small curated list of camera-movement phrases (pan, zoom, orbit, parallax, handheld) you can fold into a `generate_video` prompt when the user just says "add some movement" without specifics.
- `poll_job` — check a job's current status by ID. Use this to follow up on a video that was still rendering when you last checked.
- `reframe` — registered but not available: Higgsfield's public API has no endpoint that takes an existing video and changes its aspect ratio. If asked, say so and suggest generating a fresh video at the target aspect ratio instead.

Once a video completes, it appears in the Studio's video preview panel with a scrubbable timeline — refer to it as something the user can already watch and scrub through, not a link to download.
