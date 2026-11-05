import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { OverlayProvider, useOverlay, useOverlayItems } from "../../../src/core/OverlayProvider";
import type { OverlayAdapterMap } from "../../../src/contracts/adapter";

const stubAdapters: OverlayAdapterMap = {
  modal: () => null,
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <OverlayProvider adapters={stubAdapters}>{children}</OverlayProvider>;
}

describe("useOverlay", () => {
  it("returns display, open, close, closeAll, reject, remove, clear", () => {
    const { result } = renderHook(() => useOverlay(), { wrapper });

    expect(result.current.display).toBeInstanceOf(Function);
    expect(result.current.open).toBeInstanceOf(Function);
    expect(result.current.close).toBeInstanceOf(Function);
    expect(result.current.closeAll).toBeInstanceOf(Function);
    expect(result.current.reject).toBeInstanceOf(Function);
    expect(result.current.remove).toBeInstanceOf(Function);
    expect(result.current.clear).toBeInstanceOf(Function);
  });

  it("display returns a Promise", () => {
    const { result } = renderHook(() => useOverlay(), { wrapper });

    let promise: Promise<unknown> | undefined;
    act(() => {
      promise = result.current.display({ type: "modal" });
    });

    expect(promise).toBeInstanceOf(Promise);
  });

  it.each(["remove", "clear"] as const)(
    "open: rejected item settled by %s -> no unhandled rejection",
    async (settlement) => {
      const { result } = renderHook(
        () => ({ overlay: useOverlay(), items: useOverlayItems() }),
        { wrapper }
      );
      const unhandled = vi.fn();
      process.on("unhandledRejection", unhandled);

      try {
        act(() => {
          const id = result.current.overlay.open({ type: "modal" });
          result.current.overlay.reject(id, new Error("cancelled"));
          if (settlement === "remove") {
            result.current.overlay.remove(id);
          } else {
            result.current.overlay.clear();
          }
        });
        await new Promise<void>((resolve) => setImmediate(resolve));

        expect(unhandled).not.toHaveBeenCalled();
        expect(result.current.items).toEqual([]);
      } finally {
        process.off("unhandledRejection", unhandled);
      }
    }
  );

  it.each(["open-first", "display-first"] as const)(
    "display: shared id with %s -> preserves the original rejection",
    async (order) => {
      const { result } = renderHook(() => useOverlay(), { wrapper });
      const options = { id: "shared", type: "modal" };
      const reason = new Error("cancelled");
      let outcome: Promise<unknown> | undefined;

      act(() => {
        if (order === "open-first") {
          result.current.open(options);
        }
        outcome = result.current.display(options).catch((error: unknown) => error);
        if (order === "display-first") {
          result.current.open(options);
        }
        result.current.reject(options.id, reason);
        result.current.remove(options.id);
      });

      await expect(outcome).resolves.toBe(reason);
    }
  );

  it("reject calls store.reject and transitions item to closing", () => {
    let id: string | undefined;
    let overlayApi: ReturnType<typeof useOverlay> | undefined;
    let items: ReturnType<typeof useOverlayItems> | undefined;

    renderHook(
      () => {
        overlayApi = useOverlay();
        items = useOverlayItems();
      },
      { wrapper }
    );

    act(() => {
      id = overlayApi!.open({ type: "modal" });
    });

    act(() => {
      overlayApi!.reject(id!, "reason");
    });

    const item = items!.find((i) => i.id === id);
    expect(item?.status).toBe("closing");
    expect(item?.rejected).toBe(true);
    expect(item?.rejectReason).toBe("reason");
  });
});
