// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Sheet } from "./Sheet";

afterEach(() => {
  cleanup();
  document.documentElement.style.overflow = "";
  document.documentElement.style.paddingRight = "";
});

function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open account sheet</button>
      <Sheet open={open} title="Account" description="Signed in with Ace ID." onClose={() => { setOpen(false); onClose(); }}>
        <button type="button" className="sheet-row">Settings</button>
      </Sheet>
    </>
  );
}

describe("account sheet", () => {
  it("is a labelled modal dialog with a close affordance", () => {
    render(<Sheet open title="Account" description="Signed in with Ace ID." onClose={() => {}}><button type="button">Settings</button></Sheet>);
    const dialog = screen.getByRole("dialog", { name: "Account" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByText("Signed in with Ace ID.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
  });

  it("locks the page behind it and unlocks after closing", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open account sheet" }));
    expect(document.documentElement.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(document.documentElement.style.overflow).toBe(""));
  });

  it("dismisses on Escape and hands focus back to the trigger", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const trigger = screen.getByRole("button", { name: "Open account sheet" });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Account" });
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("keeps tab focus inside the sheet", () => {
    render(<Sheet open title="Account" onClose={() => {}}><button type="button">Settings</button><button type="button">Sign out</button></Sheet>);
    const last = screen.getByRole("button", { name: "Sign out" });
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));
  });

  it("removes itself from the DOM after the exit transition", async () => {
    const { rerender } = render(<Sheet open title="Account" onClose={() => {}}>Body</Sheet>);
    expect(screen.getByRole("dialog")).toBeTruthy();
    rerender(<Sheet open={false} title="Account" onClose={() => {}}>Body</Sheet>);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 1500 });
  });
});
