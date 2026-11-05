import type { ReactNode } from "react";
import type { OverlayAdapterMap } from "./adapter";
import type { OverlayPlugin } from "./plugin";

/** Identifies an item within a single overlay store. */
export type OverlayId = string;

/** Open items remain visible; closing items await explicit removal. */
export type OverlayStatus = "open" | "closing";

/** Immutable snapshot of one overlay and its pending settlement state. */
export interface OverlayItem {
  /** Caller-visible store-local identity, reusable after removal. */
  readonly id: OverlayId;
  /** Adapter registry key used to render this item. */
  readonly type: string;
  /** User props supplied to the adapter before runtime props override them. */
  readonly props: Readonly<Record<string, unknown>>;
  /** Current stage; closing does not itself remove or settle the item. */
  readonly status: OverlayStatus;
  /** Creation time in milliseconds since the Unix epoch. */
  readonly createdAt: number;
  /** Value passed to close, resolved only when the item is removed or cleared. */
  readonly closeResult?: unknown;
  /**
   * Set by `reject(id, reason)`. On `remove(id)`, the pending Promise is
   * rejected with this reason instead of being resolved.
   */
  readonly rejectReason?: unknown;
  /**
   * True once `reject(id, reason)` has been called. Distinguishes
   * `reject(id, undefined)` (should reject) from a plain `remove(id)` (should
   * resolve), since `rejectReason` itself may be `undefined`.
   */
  readonly rejected?: boolean;
}

/** State held by the backing store. */
export interface OverlayState {
  /** Items in insertion order, including those waiting for exit completion. */
  readonly items: ReadonlyArray<OverlayItem>;
}

/** Input used by open and display to enqueue an adapter-backed overlay. */
export interface DisplayOptions {
  /** Optional identity; opening a pending identity reuses its original request. */
  readonly id?: OverlayId;
  /** Key of the adapter registered on the matching provider. */
  readonly type: string;
  /** Adapter-specific values; runtime render props take precedence. */
  readonly props?: Record<string, unknown>;
}

/** Identity and eventual result of a pending overlay. */
export interface OverlayRequest<TResult = unknown> {
  /** Identity allocated or reused by open. */
  readonly id: OverlayId;
  /** Settles on removal or clear, resolving the close result or rejecting the reason. */
  readonly promise: Promise<TResult | undefined>;
}

/** Imperative store controls, usable before a provider mounts. */
export interface OverlayStoreApi {
  /** Enqueues an item or returns the existing pending request for the same id. */
  open: <TResult = unknown>(options: DisplayOptions) => OverlayRequest<TResult>;
  /** Marks an item closing and records its result; removal settles its request. */
  close: (id: OverlayId, result?: unknown) => void;
  /** Marks every open item closing without removing or settling requests. */
  closeAll: () => void;
  /** Marks an item closing and records a rejection, including an undefined reason. */
  reject: (id: OverlayId, reason?: unknown) => void;
  /** Removes and settles the selected item, defaulting to the last item. */
  remove: (id?: OverlayId) => void;
  /** Removes all items and settles each pending request from its recorded state. */
  clear: () => void;
  /** Subscribes to snapshot changes and returns an unsubscribe callback. */
  subscribe: (listener: () => void) => () => void;
  /** Reads the stable current items snapshot. */
  getSnapshot: () => ReadonlyArray<OverlayItem>;
  /** Reads the initial empty snapshot used during server rendering. */
  getInitialSnapshot: () => ReadonlyArray<OverlayItem>;
}

/** Configuration for a provider and its automatically mounted host. */
export interface OverlayProviderProps {
  /** Adapter registry indexed by each item's type. */
  readonly adapters: OverlayAdapterMap;
  /** Application content sharing this overlay scope. */
  readonly children: ReactNode;
  /** Optional external store; otherwise the provider creates its own store. */
  readonly store?: OverlayStoreApi;
  /** Lifecycle observers used when the adapter has no hook for that phase. */
  readonly plugins?: ReadonlyArray<OverlayPlugin>;
}
