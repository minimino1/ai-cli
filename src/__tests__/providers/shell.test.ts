import { describe, it, expect, beforeEach, vi } from "bun:test";
import { runShell, executeCommand } from "../providers/shell";

// Mock Bun.spawn
const mockSpawn = vi.fn();
const mockProcess = {
  stdout: { on: vi.fn(), off: vi.fn() },
  stderr: { on: vi.fn(), off: vi.fn() },
  exit: vi.fn(),
  killed: false,
  signal: null,
};

vi.stubGlobal("Bun", {
  spawn: mockSpawn,
});

describe("runShell", () => {
  beforeEach(() => {
    mockSpawn.mockClear();
    vi.clearAllMocks();
  });

  it("should execute simple command", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "Hello World",
      stderr: "",
      killed: false,
      signal: null,
    });

    const result = await runShell("echo", ["Hello World"]);

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("Hello World");
    expect(result.exitCode).toBe(0);
  });

  it("should execute command with shell mode for pipes", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "line1\nline2",
      stderr: "",
      killed: false,
      signal: null,
    });

    await runShell("echo", ["line1\nline2"], undefined, true);

    expect(mockSpawn).toHaveBeenCalledWith(
      "sh",
      ["-c", "echo line1\nline2"],
      expect.objectContaining({ stdio: "pipe" })
    );
  });

  it("should execute command with shell mode for redirects", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "",
      stderr: "",
      killed: false,
      signal: null,
    });

    await runShell("ls", [], undefined, true);

    expect(mockSpawn).toHaveBeenCalledWith(
      "sh",
      ["-c", "ls"],
      expect.objectContaining({ stdio: "pipe" })
    );
  });

  it("should respect custom timeout", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: -1,
      stdout: "",
      stderr: "",
      killed: true,
      signal: "SIGTERM",
    });

    const result = await runShell("sleep", ["10"], 100);

    expect(result.timedOut).toBe(true);
    expect(result.success).toBe(false);
  });

  it("should use default timeout of 30 seconds", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "quick",
      stderr: "",
      killed: false,
      signal: null,
    });

    await runShell("true", []);

    expect(mockSpawn).toHaveBeenCalledWith(
      "true",
      [],
      expect.objectContaining({ timeout: 30000 })
    );
  });

  it("should pass custom cwd", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "",
      stderr: "",
      killed: false,
      signal: null,
    });

    await runShell("pwd", [], undefined, false, "/tmp");

    expect(mockSpawn).toHaveBeenCalledWith(
      "pwd",
      [],
      expect.objectContaining({ cwd: "/tmp" })
    );
  });

  it("should capture stderr separately", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "output",
      stderr: "warning",
      killed: false,
      signal: null,
    });

    const result = await runShell("sh", ["-c", "echo out; echo err >&2"]);

    expect(result.stdout).toBe("output");
    expect(result.stderr).toBe("warning");
  });

  it("should handle non-zero exit codes", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 1,
      stdout: "",
      stderr: "command not found",
      killed: false,
      signal: null,
    });

    const result = await runShell("false", []);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe("command not found");
  });

  it("should handle killed process", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: -1,
      stdout: "",
      stderr: "",
      killed: true,
      signal: "SIGKILL",
    });

    const result = await runShell("long-running", []);

    expect(result.success).toBe(false);
    expect(result.killed).toBe(true);
    expect(result.signal).toBe("SIGKILL");
  });

  it("should set stdio to pipe for proper output capture", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "test",
      stderr: "",
      killed: false,
      signal: null,
    });

    await runShell("echo", ["test"]);

    expect(mockSpawn).toHaveBeenCalledWith(
      "echo",
      ["test"],
      expect.objectContaining({ stdio: "pipe" })
    );
  });

  it("should handle empty stdout and stderr", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "",
      stderr: "",
      killed: false,
      signal: null,
    });

    const result = await runShell("true", []);

    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    expect(result.success).toBe(true);
  });

  it("should handle large output", async () => {
    const largeOutput = "a".repeat(100000);
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: largeOutput,
      stderr: "",
      killed: false,
      signal: null,
    });

    const result = await runShell("cat", ["largefile"]);

    expect(result.stdout).toBe(largeOutput);
    expect(result.stdout.length).toBe(100000);
  });
});

describe("executeCommand", () => {
  beforeEach(() => {
    mockSpawn.mockClear();
    vi.clearAllMocks();
  });

  it("should execute simple command string", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "result",
      stderr: "",
      killed: false,
      signal: null,
    });

    const result = await executeCommand("echo hello");

    expect(mockSpawn).toHaveBeenCalledWith(
      "sh",
      ["-c", "echo hello"],
      expect.objectContaining({ stdio: "pipe" })
    );
    expect(result.success).toBe(true);
    expect(result.stdout).toBe("result");
  });

  it("should execute pipeline", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "filtered output",
      stderr: "",
      killed: false,
      signal: null,
    });

    await executeCommand("cat file.txt | grep pattern | wc -l");

    expect(mockSpawn).toHaveBeenCalledWith(
      "sh",
      ["-c", "cat file.txt | grep pattern | wc -l"],
      expect.objectContaining({ stdio: "pipe" })
    );
  });

  it("should execute command with redirects", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "",
      stderr: "",
      killed: false,
      signal: null,
    });

    await executeCommand("echo 'output' > file.txt");

    expect(mockSpawn).toHaveBeenCalledWith(
      "sh",
      ["-c", "echo 'output' > file.txt"],
      expect.objectContaining({ stdio: "pipe" })
    );
  });

  it("should execute command with background process", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "",
      stderr: "",
      killed: false,
      signal: null,
    });

    await executeCommand("long-task &");

    expect(mockSpawn).toHaveBeenCalledWith(
      "sh",
      ["-c", "long-task &"],
      expect.objectContaining({ stdio: "pipe" })
    );
  });

  it("should handle command with quotes", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "hello world",
      stderr: "",
      killed: false,
      signal: null,
    });

    await executeCommand('echo "hello world"');

    expect(mockSpawn).toHaveBeenCalledWith(
      "sh",
      ["-c", 'echo "hello world"'],
      expect.objectContaining({ stdio: "pipe" })
    );
  });

  it("should handle complex shell features", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "result",
      stderr: "",
      killed: false,
      signal: null,
    });

    await executeCommand("for i in 1 2 3; do echo $i; done");

    expect(mockSpawn).toHaveBeenCalledWith(
      "sh",
      ["-c", "for i in 1 2 3; do echo $i; done"],
      expect.objectContaining({ stdio: "pipe" })
    );
  });

  it("should pass through errors from runShell", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 1,
      stdout: "",
      stderr: "syntax error",
      killed: false,
      signal: null,
    });

    const result = await executeCommand("invalid command");

    expect(result.success).toBe(false);
    expect(result.stderr).toBe("syntax error");
  });

  it("should always use shell mode", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "",
      stderr: "",
      killed: false,
      signal: null,
    });

    await executeCommand("ls");

    // Should always use shell mode (useShell=true)
    expect(mockSpawn).toHaveBeenCalledWith(
      "sh",
      ["-c", "ls"],
      expect.objectContaining({ stdio: "pipe" })
    );
  });
});

describe("concurrent stdout/stderr reading", () => {
  it("should handle concurrent stdout and stderr", async () => {
    let stdoutCalled = false;
    let stderrCalled = false;

    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "stdout data",
      stderr: "stderr data",
      killed: false,
      signal: null,
    });

    const result = await runShell("sh", [
      "-c",
      "echo out; echo err >&2",
    ]);

    expect(result.stdout).toBe("stdout data");
    expect(result.stderr).toBe("stderr data");
  });

  it("should handle interleaved output", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "line1\nline3",
      stderr: "line2",
      killed: false,
      signal: null,
    });

    const result = await runShell("sh", [
      "-c",
      "echo line1; echo line2 >&2; echo line3",
    ]);

    expect(result.stdout).toBe("line1\nline3");
    expect(result.stderr).toBe("line2");
  });
});
