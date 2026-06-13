import { describe, it, expect } from "bun:test";
import { runShell, executeCommand } from "../../providers/shell";

describe("runShell", () => {
  it("should be a function", () => {
    expect(typeof runShell).toBe("function");
  });

  it("should return a Promise", () => {
    const result = runShell("echo", ["hello"]);
    expect(result).toBeInstanceOf(Promise);
  });
});

describe("executeCommand", () => {
  it("should be a function", () => {
    expect(typeof executeCommand).toBe("function");
  });

  it("should return a Promise", () => {
    const result = executeCommand("echo hello");
    expect(result).toBeInstanceOf(Promise);
  });
});
