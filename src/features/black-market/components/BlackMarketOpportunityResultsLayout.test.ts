import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(resolve(root, path), "utf8");
}

describe("Black Market opportunity results layout", () => {
  it("loads the dedicated table stylesheet", () => {
    const index = readProjectFile("index.html");

    expect(index).toContain('/black-market-results-table.css');
  });

  it("keeps the header and detail action visible inside a bounded scroll area", () => {
    const css = readProjectFile("public/black-market-results-table.css");

    expect(css).toContain("max-height: min(72vh, 56rem)");
    expect(css).toContain("overflow: auto");
    expect(css).toContain("thead th");
    expect(css).toContain("th:last-child");
    expect(css).toContain("td:last-child");
    expect(css.match(/position: sticky/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });
});
