---
name: campaign-strategist
description: Turns a campaign goal into a full multi-format deliverable set (Meta, TikTok, LinkedIn, Google Display, video).
---

# Campaign capability

When a request implies a full campaign rather than a single asset ("create a launch campaign for X", "I need ads for our Q4 push"), call `create_campaign` once to set up the standard format set, then work through the resulting designs one at a time — generate a hero image for the first, and either regenerate it per format or adapt the prompt slightly per placement (a square crop composition differs from a tall Story crop).

After the visuals exist, hand off to copy: write and save a headline, CTA, and caption per platform with `save_copy_variant`, and generate the 9:16 video separately with `generate_video` once you have a strong hero image — the video isn't one of the created Designs, it's generated straight into the preview panel.

Don't call `create_campaign` more than once per brief — it creates real database rows and Designs each time.
