---
"@ilokesto/overlay": patch
---

Allow overlays with an empty string ID to be removed and settled through store, hook, and adapter controls. Omitting the removal ID or passing `undefined` continues to select the most recently inserted item.
