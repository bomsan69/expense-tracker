import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pagination } from "./pagination";

describe("Pagination", () => {
  it("renders nothing for a single page", () => {
    const { container } = render(
      <Pagination
        page={1}
        totalPages={1}
        basePath="/"
        from="2026-10-25"
        to="2026-11-01"
        category="all"
        person="all"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("marks the current page and disables bounds", () => {
    render(
      <Pagination
        page={1}
        totalPages={3}
        basePath="/"
        from="2026-10-25"
        to="2026-11-01"
        category="all"
        person="all"
      />,
    );
    expect(screen.getByRole("link", { name: "1" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByLabelText("Previous page")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByLabelText("Next page")).toHaveAttribute(
      "aria-disabled",
      "false",
    );
  });

  it("preserves the filter state in each page link", () => {
    render(
      <Pagination
        page={2}
        totalPages={3}
        basePath="/"
        from="2026-10-25"
        to="2026-11-01"
        category="4"
        person="wife"
      />,
    );
    const link = screen.getByRole("link", { name: "3" });
    expect(link.getAttribute("href")).toContain("category=4");
    expect(link.getAttribute("href")).toContain("person=wife");
    expect(link.getAttribute("href")).toContain("page=3");
  });
});
