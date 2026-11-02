import type { ComponentType } from "react";
import type { OverlayId, OverlayItem } from "./overlay";

/** Per-item phase handlers; each supplied handler replaces provider plugins for its phase. */
export interface OverlayAdapterHooks {
  /** Observes the first committed open render. */
  onOpen?: (id: OverlayId, item: OverlayItem) => void;
  /** Observes an open-to-closing transition; already-closing mounts do not trigger it. */
  onClosing?: (id: OverlayId, item: OverlayItem) => void;
  /** Observes store removal, excluding effect replacement and provider-only unmount. */
  onUnmount?: (id: OverlayId) => void;
}

/** Runtime-owned props overriding same-named user props on an adapter. */
export interface OverlayRenderProps<TResult = unknown> {
  /** Identity of this adapter's item. */
  readonly id: string;
  /** Whether the item is open rather than awaiting exit completion. */
  readonly isOpen: boolean;
  /** Current lifecycle stage. */
  readonly status: "open" | "closing";
  /** Records a result and starts closing; call remove after exit completion. */
  readonly close: (result?: TResult) => void;
  /** Removes this item and settles its pending request. */
  readonly remove: () => void;
  /** Registers the latest per-item lifecycle callbacks during adapter rendering. */
  readonly useLifecycle: (hooks: OverlayAdapterHooks) => void;
}

/** Component receiving runtime controls and arbitrary adapter-specific user props. */
export type OverlayAdapterComponent<TResult = unknown> = ComponentType<
  OverlayRenderProps<TResult> & Record<string, unknown>
>;

/** Open registry mapping overlay type names to adapter components. */
export type OverlayAdapterMap = Readonly<
  Record<string, OverlayAdapterComponent>
>;
