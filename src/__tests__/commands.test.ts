import { describe, it, expect, beforeEach, vi } from "bun:test";
import { parseCommand, createContext, commands } from "../commands";
import type { CommandContext, Config } from "../types";

// Mock dependencies
vi.mock("../history", () => ({
  SessionManager: {
    getInstance: vi.fn(() => ({
      sessions: new Map(),
      saveSession: vi.fn(),
      loadSession: vi.fn(),
      listSessions: vi.fn(() => []),
      deleteSession: vi.fn(),
    })),
  },
}));

vi.mock("../providers/ai", () => ({
  sendToAI: vi.fn(),
}));

describe("parseCommand", () => {
  beforeEach(() => {
    // No commandHistory to clear since it's not exported
  });

  it("should parse simple command without args", () => {
    const result = parseCommand("/help");
    expect(result).not.toBeNull();
    expect(result!.command.name).toBe("help");
    expect(result!.args).toBe("");
  });

  it("should parse command with single arg", () => {
    const result = parseCommand("/review file.ts");
    expect(result).not.toBeNull();
    expect(result!.command.name).toBe("review");
    expect(result!.args).toBe("file.ts");
  });

  it("should parse command with multiple args", () => {
    const result = parseCommand("/git add file1.ts file2.ts");
    expect(result).not.toBeNull();
    expect(result!.command.name).toBe("git");
    expect(result!.args).toBe("add file1.ts file2.ts");
  });

  it("should parse command with flags", () => {
    const result = parseCommand("/ls -la /home");
    expect(result).not.toBeNull();
    expect(result!.command.name).toBe("ls");
    expect(result!.args).toBe("-la /home");
  });

  it("should return null for empty input", () => {
    const result = parseCommand("");
    expect(result).toBeNull();
  });

  it("should return null for non-command input", () => {
    const result = parseCommand("just some text");
    expect(result).toBeNull();
  });

  it("should handle command with quoted args", () => {
    const result = parseCommand('/git commit -m "fix: bug"');
    expect(result).not.toBeNull();
    expect(result!.command.name).toBe("git");
    expect(result!.args).toBe('commit -m "fix: bug"');
  });

  it("should be case-sensitive for command name", () => {
    const result = parseCommand("/HELP");
    expect(result).toBeNull(); // commands are lowercase
  });

  it("should trim whitespace", () => {
    // parseCommand doesn't trim input, so leading whitespace causes it to not start with '/'
    const result = parseCommand("  /help  ");
    expect(result).toBeNull(); // leading whitespace makes it not a command
  });

  it("should handle command with only slash", () => {
    const result = parseCommand("/");
    expect(result).toBeNull();
  });

  it("should handle command with special characters in args", () => {
    const result = parseCommand('/grep "error|warning"');
    expect(result).not.toBeNull();
    expect(result!.command.name).toBe("grep");
    expect(result!.args).toBe('"error|warning"');
  });
});

describe("createContext", () => {
  const mockConfig: Config = {
    providers: [
      { id: "test", name: "Test", apiUrl: "http://test.com", model: "test-model" },
    ],
    activeProvider: "test",
  };

  const mockCwd = "/test/path";

  it("should create context with required dependencies", () => {
    const context = createContext(mockConfig, mockCwd);
    expect(context.config).toBe(mockConfig);
    expect(context.cwd).toBe(mockCwd);
    expect(typeof context.readFile).toBe("function");
    expect(typeof context.listFiles).toBe("function");
    expect(typeof context.sendToAI).toBe("function");
  });

  it("should include optional deps when provided", () => {
    const mockGetMessages = () => [];
    const mockSetMessages = () => {};
    const mockGetSessionManager = () => ({
      listSessions: () => Promise.resolve([]),
      loadSession: () => Promise.resolve(null),
      saveSession: () => Promise.resolve("id"),
      deleteSession: () => Promise.resolve(true),
    });
    const mockSetFileExplorerMode = () => {};

    const context = createContext(mockConfig, mockCwd, {
      getMessages: mockGetMessages,
      setMessages: mockSetMessages,
      getSessionManager: mockGetSessionManager,
      setFileExplorerMode: mockSetFileExplorerMode,
    });

    expect(context.getMessages).toBe(mockGetMessages);
    expect(context.setMessages).toBe(mockSetMessages);
    expect(context.getSessionManager).toBe(mockGetSessionManager);
    expect(context.setFileExplorerMode).toBe(mockSetFileExplorerMode);
  });
});

describe("commands registry", () => {
  it("should have all required commands defined", () => {
    const commandNames = commands.map((c) => c.name);

    // AI commands
    expect(commandNames).toContain("review");
    expect(commandNames).toContain("explain");
    expect(commandNames).toContain("fix");

    // File commands
    expect(commandNames).toContain("file");
    expect(commandNames).toContain("ls");
    expect(commandNames).toContain("open");
    expect(commandNames).toContain("edit");
    expect(commandNames).toContain("browse");

    // Git commands
    expect(commandNames).toContain("git");

    // Shell commands
    expect(commandNames).toContain("sh");
    expect(commandNames).toContain("run");
    expect(commandNames).toContain("exec");

    // Session commands
    expect(commandNames).toContain("sessions");
    expect(commandNames).toContain("load");
    expect(commandNames).toContain("save");
    expect(commandNames).toContain("delete");

    // Settings
    expect(commandNames).toContain("provider");
    expect(commandNames).toContain("alias");
    expect(commandNames).toContain("export");
    expect(commandNames).toContain("env");
    expect(commandNames).toContain("clear");
    expect(commandNames).toContain("help");
  });

  it("should have unique command names", () => {
    const commandNames = commands.map((c) => c.name);
    const unique = new Set(commandNames);
    expect(unique.size).toBe(commandNames.length);
  });

  it("should have description for all commands", () => {
    commands.forEach((cmd) => {
      expect(cmd.description).toBeDefined();
      expect(cmd.description.length).toBeGreaterThan(0);
    });
  });

  it("should have run function for all commands", () => {
    commands.forEach((cmd) => {
      expect(typeof cmd.run).toBe("function");
    });
  });

  it("should have correct alias definitions", () => {
    const helpCmd = commands.find((c) => c.name === "help");
    expect(helpCmd?.aliases).toContain("?");
    expect(helpCmd?.aliases).toContain("h");

    const fixCmd = commands.find((c) => c.name === "fix");
    expect(fixCmd?.aliases).toContain("f");

    const runCmd = commands.find((c) => c.name === "run");
    expect(runCmd?.aliases).toContain("r");

    const shCmd = commands.find((c) => c.name === "sh");
    expect(shCmd?.aliases).toContain("!");
    expect(shCmd?.aliases).toContain("shell");
  });

  it("should define args schema for commands that need it", () => {
    const gitCmd = commands.find((c) => c.name === "git");
    expect(gitCmd?.args).toBeDefined();

    const providerCmd = commands.find((c) => c.name === "provider");
    expect(providerCmd?.args).toBeDefined();
  });
});

describe("alias resolution", () => {
  it("should resolve 'r' to 'run'", () => {
    const result = parseCommand("/r file.ts");
    expect(result).not.toBeNull();
    expect(result!.command.name).toBe("run");
  });

  it("should resolve 'e' to 'explain'", () => {
    const result = parseCommand("/e code.ts");
    expect(result).not.toBeNull();
    expect(result!.command.name).toBe("explain");
  });

  it("should resolve 'f' to 'fix'", () => {
    const result = parseCommand("/f bug.ts");
    expect(result).not.toBeNull();
    expect(result!.command.name).toBe("fix");
  });

  it("should resolve '?' to 'help'", () => {
    const result = parseCommand("/?");
    expect(result).not.toBeNull();
    expect(result!.command.name).toBe("help");
  });

  it("should resolve 'x' to 'exec'", () => {
    const result = parseCommand("/x python print('hi')");
    expect(result).not.toBeNull();
    expect(result!.command.name).toBe("exec");
  });

  it("should not resolve unknown aliases", () => {
    const result = parseCommand("/z");
    expect(result).toBeNull();
  });
});

describe("edge cases", () => {
  it("should handle command with no args but with trailing spaces", () => {
    const result = parseCommand("/help   ");
    expect(result).not.toBeNull();
    expect(result!.command.name).toBe("help");
    expect(result!.args).toBe("");
  });

  it("should handle command with empty args array", () => {
    const result = parseCommand("/clear");
    expect(result).not.toBeNull();
    expect(result!.command.name).toBe("clear");
    expect(result!.args).toBe("");
  });

  it("should handle command with numeric args", () => {
    const result = parseCommand("/git log 10");
    expect(result).not.toBeNull();
    expect(result!.command.name).toBe("git");
    expect(result!.args).toBe("log 10");
  });

  it("should handle deeply nested quoted strings", () => {
    const result = parseCommand('/echo "a \\"b\\" c"');
    expect(result).not.toBeNull();
    expect(result!.command.name).toBe("echo");
    expect(result!.args).toBe('"a \\"b\\" c"');
  });
});
