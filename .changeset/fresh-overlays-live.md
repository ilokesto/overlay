---
"@ilokesto/overlay": patch
---

Give each newly opened overlay a separate renderer lifetime so removing and reopening the same ID in one React batch resets adapter state and notifies removal and opening. Duplicate pending IDs continue to reuse the original request and renderer.
