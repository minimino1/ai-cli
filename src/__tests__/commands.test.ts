import { describe, it, expect, beforeEach, vi } from "bun:test";
import { parseCommand, createContext, commands, commandHistory } from "../commands";
import type { CommandContext } from "../types";

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
  streamToAI: vi.fn(),
}));

describe("parseCommand", () => {
  beforeEach(() => {
    commandHistory.length = 0;
  });

  it("should parse simple command without args", () => {
    const result = parseCommand("/help");
    expect(result).not.toBeNull();
    expect(result!.command).toBe("help");
    expect(result!.args).toEqual([]);
    expect(result!.raw).toBe("/help");
  });

  it("should parse command with single arg", () => {
    const result = parseCommand("/review file.ts");
    expect(result).not.toBeNull();
    expect(result!.command).toBe("review");
    expect(result!.args).toEqual(["file.ts"]);
  });

  it("should parse command with multiple args", () => {
    const result = parseCommand("/git add file1.ts file2.ts");
    expect(result).not.toBeNull();
    expect(result!.command).toBe("git");
    expect(result!.args).toEqual(["add", "file1.ts", "file2.ts"]);
  });

  it("should parse command with flags", () => {
    const result = parseCommand("/ls -la /home");
    expect(result).not.toBeNull();
    expect(result!.command).toBe("ls");
    expect(result!.args).toEqual(["-la", "/home"]);
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
    expect(result!.command).toBe("git");
    expect(result!.args).toEqual(["commit", "-m", "fix: bug"]);
  });

  it("should be case-sensitive for command name", () => {
    const result = parseCommand("/HELP");
    expect(result).toBeNull(); // commands are lowercase
  });

  it("should trim whitespace", () => {
    const result = parseCommand("  /help  ");
    expect(result).not.toBeNull();
    expect(result!.command).toBe("help");
  });

  it("should handle command with only slash", () => {
    const result = parseCommand("/");
    expect(result).toBeNull();
  });

  it("should handle command with special characters in args", () => {
    const result = parseCommand("/grep "error|warning"");
    expect(result).not.toBeNull();
    expect(result!.command).toBe("grep");
    expect(result!.args).toEqual(["error|warning"]);
  });
});

describe("createContext", () => {
  it("should create context with required dependencies", () => {
    const config = { activeProvider: "nvidia" };
    const cwd = "/home/user";
    const context = createContext(config, cwd);

    expect(context.config).toBe(config);
    expect(context.cwd).toBe(cwd);
    expect(typeof context.readFile).toBe("function");
    expect(typeof context.listFiles).toBe("function");
    expect(typeof context.sendToAI).toBe("function");
    expect(typeof context.writeFileContent).toBe("function");
    expect(typeof context.getFileInfo).toBe("function");
  });

  it("should include SessionManager in context", () => {
    const context = createContext({}, "/");
    expect(context.sessions).toBeDefined();
    expect(typeof context.saveSession).toBe("function");
    expect(typeof context.loadSession).toBe("function");
  });

  it("should include provider functions in context", () => {
    const context = createContext({}, "/");
    expect(context.executeFile).toBeDefined();
    expect(context.executeCode).toBeDefined();
    expect(context.runShell).toBeDefined();
    expect(context.gitStatus).toBeDefined();
  });

  it("should include tool functions in context", () => {
    const context = createContext({}, "/");
    expect(context.formatJSON).toBeDefined();
    expect(context.hash).toBeDefined();
    expect(context.generateUUID).toBeDefined();
    expect(context.tree).toBeDefined();
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

    const reviewCmd = commands.find((c) => c.name === "review");
    expect(reviewCmd?.aliases).toContain("r");

    const explainCmd = commands.find((c) => c.name === "explain");
    expect(explainCmd?.aliases).toContain("e");

    const fixCmd = commands.find((c) => c.name === "fix");
    expect(fixCmd?.aliases).toContain("f");
  });

  it("should define args schema for commands that need it", () => {
    const gitCmd = commands.find((c) => c.name === "git");
    expect(gitCmd?.args).toBeDefined();

    const providerCmd = commands.find((c) => c.name === "provider");
    expect(providerCmd?.args).toBeDefined();
  });
});

describe("commandHistory", () => {
  it("should track executed commands", async () => {
    const context = createContext({}, "/");
    const helpCmd = commands.find((c) => c.name === "help")!;

    await helpCmd.run([], context);

    expect(commandHistory).toContain("/help");
  });

  it("should respect max history size (1000)", () => {
    // Fill history beyond limit
    for (let i = 0; i < 1100; i++) {
      commandHistory.push(`/test${i}`);
    }

    // Should keep only last 1000
    expect(commandHistory.length).toBeLessThanOrEqual(1000);
  });

  it("should not duplicate consecutive commands", () => {
    const context = createContext({}, "/");
    const helpCmd = commands.find((c) => c.name === "help")!;

    // Execute same command multiple times
    for (let i = 0; i < 5; i++) {
      await helpCmd.run([], context);
    }

    // Should only have one entry (last one replaces previous)
    const helpCount = commandHistory.filter((cmd) => cmd === "/help").length;
    expect(helpCount).toBe(1);
  });
});

describe("alias resolution", () => {
  it("should resolve 'r' to 'review'", () => {
    const result = parseCommand("/r file.ts");
    expect(result).not.toBeNull();
    expect(result!.command).toBe("review");
  });

  it("should resolve 'e' to 'explain'", () => {
    const result = parseCommand("/e code.ts");
    expect(result).not.toBeNull();
    expect(result!.command).toBe("explain");
  });

  it("should resolve 'f' to 'fix'", () => {
    const result = parseCommand("/f bug.ts");
    expect(result).not.toBeNull();
    expect(result!.command).toBe("fix");
  });

  it("should resolve '?' to 'help'", () => {
    const result = parseCommand("/?");
    expect(result).not.toBeNull();
    expect(result!.command).toBe("help");
  });

  it("should not resolve unknown aliases", () => {
    const result = parseCommand("/x");
    expect(result).toBeNull();
  });
});

describe("edge cases", () => {
  it("should handle command with no args but with trailing spaces", () => {
    const result = parseCommand("/help   ");
    expect(result).not.toBeNull();
    expect(result!.args).toEqual([]);
  });

  it("should handle command with empty args array", () => {
    const result = parseCommand("/clear");
    expect(result).not.toBeNull();
    expect(result!.args).toEqual([]);
  });

  it("should handle command with numeric args", () => {
    const result = parseCommand("/git log 10");
    expect(result).not.toBeNull();
    expect(result!.command).toBe("git");
    expect(result!.args).toEqual(["log", "10"]);
  });

  it("should handle deeply nested quoted strings", () => {
    const result = parseCommand('/echo "a \\"b\\" c"');
    expect(result).not.toBeNull();
    expect(result!.command).toBe("echo");
    expect(result!.args).toEqual(['a "b" c']);
  });
});
