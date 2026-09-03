# Berry Chat v2 Product Scope

## Core Positioning

Berry Chat v2 is a private AI chat application designed to feel memorable, companionable, stable, lightweight, and suitable for long-term daily use.

The product should prioritize calm reliability over novelty, clear conversation continuity over feature volume, and a light interface that keeps the user's relationship with the assistant at the center.

## Version 1 Scope

The first release keeps the product intentionally focused. It includes:

- Non-streaming chat
- Multiple conversations
- Automatic summaries
- Long-term memory library
- Backup, export, restore, and migration
- Image messages (see below)
- Clawd desktop pet
- Three themes: milk tea, strawberry bavarois, and night sakura
- Transparent and open-feeling chat interface
- Top and bottom fading glass areas without obvious hard dividers
- Reusable spring Popover menu component

### Image Messages

Implemented and live in production: users can attach one JPG, PNG, or WebP
image per message (with or without accompanying text), see it persist and
redisplay across sessions, and get a real answer from the model about what
the image shows (multimodal vision, not just storage/display).

Deliberately bounded — this is a chat attachment, not a general file system:

- One image per message. No multi-image messages.
- No PDF, Word, or video attachments.
- No in-app image editing or cropping.
- The image itself never directly produces a long-term memory entry; only
  the user's own written words in that turn can. (See memory-boundary
  behavior in server/memory/memory-prompt.ts.)
- Only the turn that just attached an image sends the actual image to the
  model; earlier turns are represented in later requests by a neutral
  text description, not by resending the raw image.

## Explicitly Removed

The following features are intentionally removed from Berry Chat v2 and should not be reintroduced without a later product decision:

- Today's Cottage
- MCP
- Notion
- File knowledge base
- RAG
- Streaming responses

## Deferred Beyond Phase 1

The following features are not part of the first implementation phase. They may be reconsidered after the core chat, persistence, summary, memory, backup, UI, and stability phases are complete:

- Sticker messages
- Quoted replies
- Regenerate response
- Continue response
- Auto continuation
- API Dashboard
- PWA

## Product Guardrails

- Build only the current phase; do not implement future requirements opportunistically.
- Keep the application personal and lightweight rather than turning it into a general knowledge platform.
- Favor stable, understandable behavior over complex automation.
- Treat backup, export, restore, and migration as first-class trust features.
- Preserve a bright, breathable chat experience as a product requirement, not only a visual preference.
- Keep Clawd as a companion presence, not as a substitute for the core chat experience.
