import { describe, it, expect, beforeEach, vi } from "bun:test";
import {
  detectLanguage,
  executeFile,
  executeCode,
  runCommand,
  languageCommands,
  ExecuteResult,
} from "../providers/execute";

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

// Mock fs/promises
const mockFs = {
  writeFile: vi.fn(),
  unlink: vi.fn(),
  mkdir: vi.fn(),
};

vi.mock("node:fs/promises", () => mockFs);

// Mock node:path
vi.mock("node:path", () => ({
  join: vi.fn((...args) => args.join("/")),
  basename: vi.fn((p) => p.split("/").pop() || p),
  extname: vi.fn((p) => {
    const parts = p.split(".");
    return parts.length > 1 ? `.${parts.pop()}` : "";
  }),
  dirname: vi.fn((p) => p.split("/").slice(0, -1).join("/")),
}));

describe("detectLanguage", () => {
  it("should detect Python from .py extension", () => {
    expect(detectLanguage("script.py")).toBe("python");
  });

  it("should detect JavaScript from .js extension", () => {
    expect(detectLanguage("app.js")).toBe("javascript");
  });

  it("should detect TypeScript from .ts extension", () => {
    expect(detectLanguage("component.ts")).toBe("typescript");
  });

  it("should detect TypeScript JSX from .tsx extension", () => {
    expect(detectLanguage("component.tsx")).toBe("typescript");
  });

  it("should detect Go from .go extension", () => {
    expect(detectLanguage("main.go")).toBe("go");
  });

  it("should detect Rust from .rs extension", () => {
    expect(detectLanguage("lib.rs")).toBe("rust");
  });

  it("should detect Java from .java extension", () => {
    expect(detectLanguage("Main.java")).toBe("java");
  });

  it("should detect C from .c extension", () => {
    expect(detectLanguage("program.c")).toBe("c");
  });

  it("should detect C++ from .cpp extension", () => {
    expect(detectLanguage("program.cpp")).toBe("cpp");
  });

  it("should detect C++ from .cc extension", () => {
    expect(detectLanguage("program.cc")).toBe("cpp");
  });

  it("should detect C++ from .cxx extension", () => {
    expect(detectLanguage("program.cxx")).toBe("cpp");
  });

  it("should detect C++ from .hpp extension", () => {
    expect(detectLanguage("header.hpp")).toBe("cpp");
  });

  it("should detect Ruby from .rb extension", () => {
    expect(detectLanguage("script.rb")).toBe("ruby");
  });

  it("should detect PHP from .php extension", () => {
    expect(detectLanguage("app.php")).toBe("php");
  });

  it("should detect Perl from .pl extension", () => {
    expect(detectLanguage("script.pl")).toBe("perl");
  });

  it("should detect Bash from .sh extension", () => {
    expect(detectLanguage("script.sh")).toBe("bash");
  });

  it("should return null for unknown extensions", () => {
    expect(detectLanguage("file.unknown")).toBeNull();
  });

  it("should return null for files without extension", () => {
    expect(detectLanguage("Makefile")).toBeNull();
  });

  it("should handle uppercase extensions", () => {
    expect(detectLanguage("script.PY")).toBe("python");
    expect(detectLanguage("app.JS")).toBe("javascript");
  });
});

describe("languageCommands", () => {
  it("should have command for python", () => {
    expect(languageCommands.python).toBe("python3");
  });

  it("should have command for javascript", () => {
    expect(languageCommands.javascript).toBe("node");
  });

  it("should have command for typescript", () => {
    expect(languageCommands.typescript).toBe("tsx");
  });

  it("should have command for go", () => {
    expect(languageCommands.go).toBe("go run");
  });

  it("should have command for rust", () => {
    expect(languageCommands.rust).toBe("rustc");
  });

  it("should have command for java", () => {
    expect(languageCommands.java).toBe("java");
  });

  it("should have command for c", () => {
    expect(languageCommands.c).toBe("gcc");
  });

  it("should have command for cpp", () => {
    expect(languageCommands.cpp).toBe("g++");
  });

  it("should have command for ruby", () => {
    expect(languageCommands.ruby).toBe("ruby");
  });

  it("should have command for php", () => {
    expect(languageCommands.php).toBe("php");
  });

  it("should have command for perl", () => {
    expect(languageCommands.perl).toBe("perl");
  });

  it("should have command for bash", () => {
    expect(languageCommands.bash).toBe("bash");
  });
});

describe("runCommand", () => {
  beforeEach(() => {
    mockSpawn.mockClear();
    vi.clearAllMocks();
  });

  it("should execute command successfully", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "output",
      stderr: "",
      killed: false,
      signal: null,
    });

    const result = await runCommand("echo", ["hello"]);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("output");
    expect(result.stderr).toBe("");
    expect(result.timedOut).toBe(false);
  });

  it("should handle command failure", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 1,
      stdout: "",
      stderr: "error",
      killed: false,
      signal: null,
    });

    const result = await runCommand("false", []);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe("error");
  });

  it("should respect timeout", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: -1,
      stdout: "",
      stderr: "",
      killed: true,
      signal: "SIGTERM",
    });

    const result = await runCommand("sleep", ["100"], 100);

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
  });

  it("should pass arguments correctly", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "arg1 arg2",
      stderr: "",
      killed: false,
      signal: null,
    });

    await runCommand("echo", ["arg1", "arg2"]);

    expect(mockSpawn).toHaveBeenCalledWith("echo", ["arg1", "arg2"], expect.any(Object));
  });

  it("should set cwd correctly", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "",
      stderr: "",
      killed: false,
      signal: null,
    });

    await runCommand("pwd", [], { cwd: "/tmp" });

    expect(mockSpawn).toHaveBeenCalledWith("pwd", [], expect.objectContaining({ cwd: "/tmp" }));
  });

  it("should capture stderr separately", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "stdout content",
      stderr: "stderr content",
      killed: false,
      signal: null,
    });

    const result = await runCommand("sh", ["-c", "echo out; echo err >&2"]);

    expect(result.stdout).toBe("stdout content");
    expect(result.stderr).toBe("stderr content");
  });
});

describe("executeCode", () => {
  beforeEach(() => {
    mockFs.writeFile.mockClear();
    mockFs.unlink.mockClear();
    mockSpawn.mockClear();
  });

  it("should write code to temp file", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "Hello",
      stderr: "",
      killed: false,
      signal: null,
    });

    await executeCode("print('Hello')", "python");

    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/\.py$/),
      "print('Hello')"
    );
  });

  it("should execute code with correct interpreter", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "",
      stderr: "",
      killed: false,
      signal: null,
    });

    await executeCode("console.log('test')", "javascript");

    expect(mockSpawn).toHaveBeenCalledWith("node", expect.any(Array), expect.any(Object));
  });

  it("should clean up temp file after execution", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "",
      stderr: "",
      killed: false,
      signal: null,
    });
    mockFs.unlink.mockResolvedValueOnce(undefined);

    await executeCode("echo test", "bash");

    expect(mockFs.unlink).toHaveBeenCalledWith(expect.stringMatching(/\.sh$/));
  });

  it("should handle execution errors", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 1,
      stdout: "",
      stderr: "SyntaxError",
      killed: false,
      signal: null,
    });

    const result = await executeCode("invalid code", "python");

    expect(result.success).toBe(false);
    expect(result.stderr).toContain("SyntaxError");
  });

  it("should return ExecuteResult with language", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "output",
      stderr: "",
      killed: false,
      signal: null,
    });

    const result = await executeCode("code", "go");

    expect(result.language).toBe("go");
    expect(result.command).toBe("go run");
  });
});

describe("executeFile", () => {
  beforeEach(() => {
    mockSpawn.mockClear();
  });

  it("should execute Python file directly", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "Hello from Python",
      stderr: "",
      killed: false,
      signal: null,
    });

    const result = await executeFile("/path/script.py");

    expect(result.success).toBe(true);
    expect(result.language).toBe("python");
    expect(result.command).toBe("python3");
  });

  it("should execute JavaScript file with node", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "Hello from JS",
      stderr: "",
      killed: false,
      signal: null,
    });

    const result = await executeFile("/path/app.js");

    expect(result.language).toBe("javascript");
    expect(result.command).toBe("node");
  });

  it("should compile and run C file", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "compiled",
      stderr: "",
      killed: false,
      signal: null,
    });
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "Hello from C",
      stderr: "",
      killed: false,
      signal: null,
    });

    const result = await executeFile("/path/program.c");

    expect(result.language).toBe("c");
    // First call should be gcc, second should be running the binary
    expect(mockSpawn).toHaveBeenNthCalledWith(1, "gcc", expect.any(Array), expect.any(Object));
    expect(mockSpawn).toHaveBeenNthCalledWith(2, expect.stringMatching(/program$|program\.exe$/), expect.any(Array), expect.any(Object));
  });

  it("should compile and run C++ file", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "compiled",
      stderr: "",
      killed: false,
      signal: null,
    });
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "Hello from C++",
      stderr: "",
      killed: false,
      signal: null,
    });

    const result = await executeFile("/path/program.cpp");

    expect(result.language).toBe("cpp");
    expect(mockSpawn).toHaveBeenNthCalledWith(1, "g++", expect.any(Array), expect.any(Object));
  });

  it("should compile and run Rust file", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "compiled",
      stderr: "",
      killed: false,
      signal: null,
    });
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "Hello from Rust",
      stderr: "",
      killed: false,
      signal: null,
    });

    const result = await executeFile("/path/main.rs");

    expect(result.language).toBe("rust");
    expect(mockSpawn).toHaveBeenNthCalledWith(1, "rustc", expect.any(Array), expect.any(Object));
  });

  it("should compile and run Java file", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "compiled",
      stderr: "",
      killed: false,
      signal: null,
    });
    mockSpawn.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "Hello from Java",
      stderr: "",
      killed: false,
      signal: null,
    });

    const result = await executeFile("/path/Main.java");

    expect(result.language).toBe("java");
    expect(mockSpawn).toHaveBeenNthCalledWith(1, "javac", expect.any(Array), expect.any(Object));
    expect(mockSpawn).toHaveBeenNthCalledWith(2, "java", expect.arrayContaining(["Main"]), expect.any(Object));
  });

  it("should handle unknown file types", async () => {
    const result = await executeFile("/path/file.unknown");

    expect(result.success).toBe(false);
    expect(result.stderr).toContain("Unsupported file type");
  });

  it("should handle compilation failures", async () => {
    mockSpawn.mockResolvedValueOnce({
      exitCode: 1,
      stdout: "",
      stderr: "Compilation error",
      killed: false,
      signal: null,
    });

    const result = await executeFile("/path/broken.c");

    expect(result.success).toBe(false);
    expect(result.stderr).toContain("Compilation error");
    // Should not attempt to run if compilation fails
    expect(mockSpawn).toHaveBeenCalledTimes(1);
  });
});

describe("ExecuteResult", () => {
  it("should have correct shape for success", () => {
    const result: ExecuteResult = {
      success: true,
      exitCode: 0,
      stdout: "output",
      stderr: "",
      language: "python",
      command: "python3",
    };

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("output");
    expect(result.stderr).toBe("");
    expect(result.language).toBe("python");
    expect(result.command).toBe("python3");
    expect(result.timedOut).toBeUndefined();
  });

  it("should have timedOut flag for timeouts", () => {
    const result: ExecuteResult = {
      success: false,
      exitCode: -1,
      stdout: "",
      stderr: "",
      language: "bash",
      command: "bash",
      timedOut: true,
    };

    expect(result.timedOut).toBe(true);
  });
});
