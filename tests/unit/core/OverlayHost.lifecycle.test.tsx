import { describe, it, expect, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { StrictMode, useState } from "react";
import { createOverlayContext } from "../../../src/core/createOverlayContext";
import { createOverlayStore } from "../../../src/core/createOverlayStore";
import type { OverlayAdapterComponent, OverlayAdapterHooks } from "../../../src/contracts/adapter";

function createTrackingAdapter(): {
  Adapter: OverlayAdapterComponent;
  calls: { phase: string; id: string }[];
} {
  const calls: { phase: string; id: string }[] = [];
  const hooks: OverlayAdapterHooks = {
    onOpen: (id) => calls.push({ phase: "onOpen", id }),
    onClosing: (id) => calls.push({ phase: "onClosing", id }),
    onUnmount: (id) => calls.push({ phase: "onUnmount", id }),
  };

  const Adapter: OverlayAdapterComponent = ({ useLifecycle }) => {
    useLifecycle(hooks);
    return null;
  };

  return { Adapter, calls };
}

describe("adapter lifecycle hooks", () => {
  it.each([
    { strict: false, closing: false },
    { strict: true, closing: false },
    { strict: false, closing: true },
    { strict: true, closing: true },
  ])(
    "same-batch id reuse: strict=$strict closing=$closing -> resets adapter and notifies each lifetime once",
    ({ strict, closing }) => {
      const ctx = createOverlayContext();
      const store = createOverlayStore();
      const calls: string[] = [];
      const props = {};
      let serial = 0;
      const Adapter: OverlayAdapterComponent = ({ useLifecycle }) => {
        const [instance] = useState(() => ++serial);
        useLifecycle({
          onOpen: () => calls.push(`open:${instance}`),
          onClosing: () => calls.push(`closing:${instance}`),
          onUnmount: () => calls.push(`unmount:${instance}`),
        });
        return <output>{instance}</output>;
      };
      const clock = vi.spyOn(Date, "now").mockReturnValue(1000);
      try {
        store.open({ id: "reuse", type: "modal", props });
        const content = (
          <ctx.Provider store={store} adapters={{ modal: Adapter }}>
            {null}
          </ctx.Provider>
        );
        const { container } = render(strict ? <StrictMode>{content}</StrictMode> : content);
        const first = container.textContent;
        if (closing) {
          act(() => store.close("reuse"));
        }

        act(() => {
          store.remove("reuse");
          store.open({ id: "reuse", type: "modal", props });
        });

        const second = container.textContent;
        expect(second).not.toBe(first);
        expect(calls).toEqual([
          `open:${first}`,
          ...(closing ? [`closing:${first}`] : []),
          `unmount:${first}`,
          `open:${second}`,
        ]);

        act(() => store.remove("reuse"));
        expect(calls.at(-1)).toBe(`unmount:${second}`);
        expect(calls.filter((call) => call.startsWith("unmount:"))).toHaveLength(2);
      } finally {
        clock.mockRestore();
      }
    }
  );

  it("duplicate pending id: open and closing -> retains request, props and renderer", () => {
    const ctx = createOverlayContext();
    const store = createOverlayStore();
    const { Adapter, calls } = createTrackingAdapter();
    const first = store.open({ id: "duplicate", type: "modal", props: { value: "first" } });
    const original = store.getSnapshot()[0];
    render(
      <ctx.Provider store={store} adapters={{ modal: Adapter }}>
        {null}
      </ctx.Provider>
    );
    let duplicate: typeof first | undefined;

    act(() => {
      duplicate = store.open({ id: "duplicate", type: "other", props: { value: "second" } });
    });

    expect(duplicate).toBe(first);
    expect(store.getSnapshot()[0]).toBe(original);
    expect(calls).toEqual([{ phase: "onOpen", id: "duplicate" }]);

    act(() => {
      store.close("duplicate");
      duplicate = store.open({ id: "duplicate", type: "other" });
    });
    expect(duplicate).toBe(first);
    expect(store.getSnapshot()[0].props).toEqual({ value: "first" });
    expect(calls).toEqual([
      { phase: "onOpen", id: "duplicate" },
      { phase: "onClosing", id: "duplicate" },
    ]);
  });

  it("keeps one lifecycle sequence when StrictMode replays mounted effects", () => {
    const ctx = createOverlayContext();
    const { Adapter, calls } = createTrackingAdapter();
    const store = createOverlayStore();
    store.open({ id: "strict", type: "modal" });
    render(
      <StrictMode>
        <ctx.Provider store={store} adapters={{ modal: Adapter }}>
          {null}
        </ctx.Provider>
      </StrictMode>,
    );

    act(() => store.close("strict"));
    act(() => store.remove("strict"));

    expect(calls).toEqual([
      { phase: "onOpen", id: "strict" },
      { phase: "onClosing", id: "strict" },
      { phase: "onUnmount", id: "strict" },
    ]);
  });

  it("does not invent an open or closing transition for an item closed before mount", async () => {
    const ctx = createOverlayContext();
    const { Adapter, calls } = createTrackingAdapter();
    const store = createOverlayStore();
    const request = store.open<string>({ id: "preclosed", type: "modal" });
    store.close("preclosed", "result");
    render(
      <ctx.Provider store={store} adapters={{ modal: Adapter }}>
        {null}
      </ctx.Provider>,
    );
    expect(calls).toEqual([]);

    act(() => store.remove("preclosed"));

    expect(calls).toEqual([{ phase: "onUnmount", id: "preclosed" }]);
    await expect(request.promise).resolves.toBe("result");
  });

  it("uses replacement plugins for later phases without replaying open or unmount", () => {
    const ctx = createOverlayContext();
    const store = createOverlayStore();
    const calls: string[] = [];
    const Adapter: OverlayAdapterComponent = ({ useLifecycle }) => {
      useLifecycle({ onOpen: () => calls.push("adapter-open") });
      return null;
    };
    const adapters = { modal: Adapter };
    store.open({ id: "replacement", type: "modal" });
    const { rerender } = render(
      <ctx.Provider store={store} adapters={adapters} plugins={[{
        name: "old",
        onClosing: () => calls.push("old-closing"),
        onUnmount: () => calls.push("old-unmount"),
      }]}>
        {null}
      </ctx.Provider>,
    );

    rerender(
      <ctx.Provider store={store} adapters={adapters} plugins={[{
        name: "new",
        onOpen: () => calls.push("new-open"),
        onClosing: () => calls.push("new-closing"),
        onUnmount: () => calls.push("new-unmount"),
      }]}>
        {null}
      </ctx.Provider>,
    );
    act(() => store.close("replacement"));
    act(() => store.remove("replacement"));

    expect(calls).toEqual(["adapter-open", "new-closing", "new-unmount"]);
  });

  it("calls onOpen once when an item is opened", () => {
    const ctx = createOverlayContext();
    const { Adapter, calls } = createTrackingAdapter();

    let overlayApi: ReturnType<typeof ctx.useOverlay> | undefined;
    function App() {
      overlayApi = ctx.useOverlay();
      return null;
    }

    render(
      <ctx.Provider adapters={{ modal: Adapter }}>
        <App />
      </ctx.Provider>
    );

    act(() => {
      overlayApi!.open({ id: "test", type: "modal" });
    });

    expect(calls).toContainEqual({ phase: "onOpen", id: "test" });
    expect(calls.filter((c) => c.phase === "onOpen")).toHaveLength(1);
  });

  it("calls onClosing when status transitions to closing", () => {
    const ctx = createOverlayContext();
    const { Adapter, calls } = createTrackingAdapter();

    let overlayApi: ReturnType<typeof ctx.useOverlay> | undefined;
    function App() {
      overlayApi = ctx.useOverlay();
      return null;
    }

    render(
      <ctx.Provider adapters={{ modal: Adapter }}>
        <App />
      </ctx.Provider>
    );

    act(() => {
      overlayApi!.open({ id: "test", type: "modal" });
    });

    act(() => {
      overlayApi!.close("test", "done");
    });

    expect(calls).toContainEqual({ phase: "onClosing", id: "test" });
    expect(calls.filter((c) => c.phase === "onClosing")).toHaveLength(1);
  });

  it("does not call onUnmount when the provider unmounts while the item remains in the supplied store", async () => {
    const ctx = createOverlayContext();
    const { Adapter, calls } = createTrackingAdapter();
    const store = createOverlayStore();
    const settled = vi.fn();
    const request = store.open({ id: "test", type: "modal" });
    void request.promise.then(settled, settled);

    const { unmount } = render(
      <ctx.Provider adapters={{ modal: Adapter }} store={store}>
        {null}
      </ctx.Provider>
    );

    await act(async () => {
      unmount();
      await Promise.resolve();
    });

    expect(calls.filter((call) => call.phase === "onUnmount")).toHaveLength(0);
    expect(store.getSnapshot().map((item) => item.id)).toEqual(["test"]);
    expect(settled).not.toHaveBeenCalled();
  });

  it("calls onUnmount once when the supplied store explicitly removes the item", () => {
    const ctx = createOverlayContext();
    const { Adapter, calls } = createTrackingAdapter();
    const store = createOverlayStore();
    store.open({ id: "test", type: "modal" });

    const { unmount } = render(
      <ctx.Provider adapters={{ modal: Adapter }} store={store}>
        {null}
      </ctx.Provider>
    );

    act(() => {
      store.remove("test");
    });

    expect(calls).toContainEqual({ phase: "onUnmount", id: "test" });
    expect(calls.filter((call) => call.phase === "onUnmount")).toHaveLength(1);

    unmount();
  });

  it("does not call onOpen again on re-render without status change", () => {
    const ctx = createOverlayContext();
    const { Adapter, calls } = createTrackingAdapter();

    let overlayApi: ReturnType<typeof ctx.useOverlay> | undefined;
    let renderCount = 0;
    function App() {
      renderCount++;
      overlayApi = ctx.useOverlay();
      return null;
    }

    const { rerender } = render(
      <ctx.Provider adapters={{ modal: Adapter }}>
        <App />
      </ctx.Provider>
    );

    act(() => {
      overlayApi!.open({ id: "test", type: "modal" });
    });

    const openCountAfterOpen = calls.filter((c) => c.phase === "onOpen").length;

    rerender(
      <ctx.Provider adapters={{ modal: Adapter }}>
        <App />
      </ctx.Provider>
    );

    expect(calls.filter((c) => c.phase === "onOpen").length).toBe(openCountAfterOpen);
  });

  it("calls onUnmount once after removal in the normal close then remove flow", () => {
    const ctx = createOverlayContext();
    const { Adapter, calls } = createTrackingAdapter();

    let overlayApi: ReturnType<typeof ctx.useOverlay> | undefined;
    function App() {
      overlayApi = ctx.useOverlay();
      return null;
    }

    const { unmount } = render(
      <ctx.Provider adapters={{ modal: Adapter }}>
        <App />
      </ctx.Provider>
    );

    act(() => {
      overlayApi!.open({ id: "test", type: "modal" });
    });

    act(() => {
      overlayApi!.close("test", "done");
    });

    expect(calls.filter((call) => call.phase === "onUnmount")).toHaveLength(0);

    act(() => {
      overlayApi!.remove("test");
    });

    expect(calls.map((c) => c.phase)).toEqual([
      "onOpen",
      "onClosing",
      "onUnmount",
    ]);

    unmount();
  });

  it("does not call any lifecycle hook when adapter does not register hooks", () => {
    const ctx = createOverlayContext();
    const calls: string[] = [];

    const Adapter: OverlayAdapterComponent = () => null;

    let overlayApi: ReturnType<typeof ctx.useOverlay> | undefined;
    function App() {
      overlayApi = ctx.useOverlay();
      return null;
    }

    render(
      <ctx.Provider adapters={{ modal: Adapter }}>
        <App />
      </ctx.Provider>
    );

    act(() => {
      overlayApi!.open({ id: "test", type: "modal" });
    });

    act(() => {
      overlayApi!.close("test");
    });

    act(() => {
      overlayApi!.remove("test");
    });

    expect(calls).toHaveLength(0);
  });
});
