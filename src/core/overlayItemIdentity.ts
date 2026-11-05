import type { OverlayItem } from "../contracts/overlay";

// Symbol metadata survives closing snapshots without changing the public item shape.
export const overlayItemIdentity = Symbol("overlayItemIdentity");

export type OverlayItemWithIdentity = OverlayItem & {
  readonly [overlayItemIdentity]?: number;
};
