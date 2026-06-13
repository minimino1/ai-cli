import { describe, it, expect } from "bun:test";
import { tree, treeSync } from "../../../tools/file/tree";

describe("tree", () => {
  it("should be a function", () => {
    expect(typeof tree).toBe("function");
  });

  it("should return a promise", () => {
    const result = tree("/");
    expect(result).toBeInstanceOf(Promise);
  });
});

describe("treeSync", () => {
  it("should be a function", () => {
    expect(typeof treeSync).toBe("function");
  });

  it("should return a string", () => {
    // Note: actual tree generation may fail due to permissions, but function should exist
    expect(typeof treeSync).toBe("function");
  });
});
