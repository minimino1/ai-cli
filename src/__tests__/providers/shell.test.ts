import { describe, it, expect } from "bun:test";
import { runShell, executeCommand } from "../../providers/shell";

describe("runShell", () => {
  it("should be a function", () => {
    expect(typeof runShell).toBe("function");
  });

  it("should return a Promise", () => {
    const result = runShell("echo", ["hello"]);
    expect(result).toBeInstanceOf(Promise);
    // Consume the promise to prevent unhandled rejection
    result.catch(() => {});
  });

  it("should execute echo command", async () => {
    const result = await runShell("echo", ["hello"]);
    expect(result.success).toBe(true);
    expect(result.stdout).toBe("hello");
    expect(result.exitCode).toBe(0);
  });
});

describe("executeCommand", () => {
  it("should be a function", () => {
    expect(typeof executeCommand).toBe("function");
  });

  it("should return a Promise", () => {
    const result = executeCommand("echo hello");
    expect(result).toBeInstanceOf(Promise);
    // Consume the promise to prevent unhandled rejection
    result.catch(() => {});
  });

  it("should execute a command string", async () => {
    const result = await executeCommand("echo hello world");
    expect(result).toContain("hello world");
    expect(result).toContain("Exit code: 0");
  });
});
