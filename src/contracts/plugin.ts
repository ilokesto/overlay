import type { OverlayId, OverlayItem } from "./overlay";

/** Provider-level lifecycle observers, overridden per phase by adapter hooks. */
export interface OverlayPlugin {
  /** Human-readable plugin identity. */
  readonly name: string;
  /** Runs when an open item first mounts, unless its adapter handles this phase. */
  readonly onOpen?: (id: OverlayId, item: OverlayItem) => void;
  /** Runs on an observed open-to-closing transition, unless overridden. */
  readonly onClosing?: (id: OverlayId, item: OverlayItem) => void;
  /** Runs after removal unmounts the renderer, not merely on provider cleanup. */
  readonly onUnmount?: (id: OverlayId) => void;
}
