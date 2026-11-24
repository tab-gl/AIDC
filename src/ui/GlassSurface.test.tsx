// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import GlassSurface from "./GlassSurface";

afterEach(cleanup);

describe("GlassSurface", () => {
  it("renders its children on a sized glass container", () => {
    const { container } = render(<GlassSurface width={320} height={60} borderRadius={999}><span>Nav content</span></GlassSurface>);
    const glass = container.querySelector(".glass-surface") as HTMLElement;
    expect(glass).toBeTruthy();
    expect(glass.style.width).toBe("320px");
    expect(glass.style.height).toBe("60px");
    expect(glass.style.borderRadius).toBe("999px");
    expect(screen.getByText("Nav content")).toBeTruthy();
    // Without a backdrop the component never allocates a WebGL canvas.
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("gives each instance its own filter id and no duplicate SVG ids", () => {
    const { container } = render(<>
      <GlassSurface><span>One</span></GlassSurface>
      <GlassSurface><span>Two</span></GlassSurface>
    </>);
    const ids = [...container.querySelectorAll("filter")].map((node) => node.getAttribute("id"));
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    // The upstream component repeated `id` on the three displacement maps; those are gone.
    expect(container.querySelectorAll("#redchannel, #greenchannel, #bluechannel")).toHaveLength(0);
  });

  it("draws a displacement map into the filter so the rim can refract", () => {
    const { container } = render(<GlassSurface borderRadius={24}><span>Glass</span></GlassSurface>);
    const image = container.querySelector("feImage");
    expect(image).toBeTruthy();
    expect(image?.getAttribute("href")).toContain("data:image/svg+xml");
  });
});
