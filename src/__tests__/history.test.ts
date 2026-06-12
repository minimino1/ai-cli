import { describe, it, expect, beforeEach, vi, afterEach } from "bun:test";
import { SessionManager } from "../history";
import type { Session } from "../types";

// Mock fs/promises
const mockFs = {
  mkdir: vi.fn(),
  access: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
  unlink: vi.fn(),
  readdir: vi.fn(),
};

vi.mock("node:fs/promises", () => mockFs);

// Mock node:path
vi.mock("node:path", () => ({
  join: vi.fn((...args) => args.join("/")),
  dirname: vi.fn((p) => p.split("/").slice(0, -1).join("/")),
  basename: vi.fn((p) => p.split("/").pop()),
}));

// Mock expandHomeDir
vi.mock("../utils", () => ({
  expandHomeDir: vi.fn((path) => path.replace("~", "/home/user")),
}));

describe("SessionManager", () => {
  let manager: SessionManager;
  const mockSessionsDir = "/home/user/.config/ai-cli/sessions";

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton
    vi.mocked(SessionManager.getInstance).mockClear();
    manager = SessionManager.getInstance();
  });

  describe("singleton pattern", () => {
    it("should return the same instance", () => {
      const instance1 = SessionManager.getInstance();
      const instance2 = SessionManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should initialize with empty sessions map", () => {
      expect(manager.sessions.size).toBe(0);
    });
  });

  describe("generateId", () => {
    it("should generate unique IDs", () => {
      const id1 = manager.generateId();
      const id2 = manager.generateId();
      expect(id1).not.toBe(id2);
    });

    it("should generate 32-character hex strings", () => {
      const id = manager.generateId();
      expect(id).toMatch(/^[a-f0-9]{32}$/);
    });

    it("should generate different IDs on each call", () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(manager.generateId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe("extractTitle", () => {
    it("should extract title from first non-empty line", () => {
      const content = "This is the title\nSecond line\nThird line";
      expect(manager.extractTitle(content)).toBe("This is the title");
    });

    it("should return empty string for empty content", () => {
      expect(manager.extractTitle("")).toBe("");
    });

    it("should trim whitespace from title", () => {
      const content = "   Title with spaces   \nNext line";
      expect(manager.extractTitle(content)).toBe("Title with spaces");
    });

    it("should handle single line content", () => {
      expect(manager.extractTitle("Single line")).toBe("Single line");
    });

    it("should skip empty first lines", () => {
      const content = "\n\n  \nActual title\nNext";
      expect(manager.extractTitle(content)).toBe("Actual title");
    });

    it("should truncate long titles", () => {
      const longTitle = "A".repeat(200);
      const content = longTitle + "\nNext line";
      const title = manager.extractTitle(content);
      expect(title.length).toBeLessThanOrEqual(100);
    });
  });

  describe("saveSession", () => {
    const mockSession: Session = {
      id: "test123",
      title: "Test Session",
      messages: [],
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
    };

    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it("should write session to file", async () => {
      await manager.saveSession(mockSession);

      expect(mockFs.mkdir).toHaveBeenCalledWith(mockSessionsDir, { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        `${mockSessionsDir}/test123.json`,
        expect.any(String)
      );
    });

    it("should store session in memory cache", async () => {
      await manager.saveSession(mockSession);
      expect(manager.sessions.get("test123")).toBe(mockSession);
    });

    it("should serialize dates correctly", async () => {
      await manager.saveSession(mockSession);

      const writtenContent = mockFs.writeFile.mock.calls[0][1] as string;
      const parsed = JSON.parse(writtenContent);

      expect(parsed.createdAt).toBe("2024-01-01T00:00:00.000Z");
      expect(parsed.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("should handle save errors gracefully", async () => {
      mockFs.writeFile.mockRejectedValueOnce(new Error("Write failed"));

      await expect(manager.saveSession(mockSession)).rejects.toThrow("Write failed");
    });
  });

  describe("loadSession", () => {
    const mockSessionData = JSON.stringify({
      id: "test456",
      title: "Loaded Session",
      messages: [],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });

    beforeEach(() => {
      mockFs.readFile.mockResolvedValue(mockSessionData);
    });

    it("should load session from file", async () => {
      const session = await manager.loadSession("test456");

      expect(session).toBeDefined();
      expect(session?.id).toBe("test456");
      expect(session?.title).toBe("Loaded Session");
    });

    it("should parse dates from ISO strings", async () => {
      const session = await manager.loadSession("test456");

      expect(session?.createdAt instanceof Date).toBe(true);
      expect(session?.updatedAt instanceof Date).toBe(true);
    });

    it("should cache loaded session", async () => {
      await manager.loadSession("test456");
      await manager.loadSession("test456");

      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
    });

    it("should return undefined for non-existent session", async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error("File not found"));
      const session = await manager.loadSession("nonexistent");
      expect(session).toBeUndefined();
    });

    it("should handle corrupted JSON", async () => {
      mockFs.readFile.mockResolvedValueOnce("invalid json{");
      const session = await manager.loadSession("corrupted");
      expect(session).toBeUndefined();
    });
  });

  describe("listSessions", () => {
    it("should return all sessions sorted by updatedAt descending", async () => {
      const now = new Date();
      const session1: Session = {
        id: "1",
        title: "Old",
        messages: [],
        createdAt: now,
        updatedAt: new Date(now.getTime() - 1000),
      };
      const session2: Session = {
        id: "2",
        title: "New",
        messages: [],
        createdAt: now,
        updatedAt: new Date(now.getTime() + 1000),
      };
      const session3: Session = {
        id: "3",
        title: "Middle",
        messages: [],
        createdAt: now,
        updatedAt: now,
      };

      manager.sessions.set("1", session1);
      manager.sessions.set("2", session2);
      manager.sessions.set("3", session3);

      const list = await manager.listSessions();

      expect(list).toHaveLength(3);
      expect(list[0].id).toBe("2"); // newest
      expect(list[1].id).toBe("3");
      expect(list[2].id).toBe("1"); // oldest
    });

    it("should return empty array when no sessions", async () => {
      const list = await manager.listSessions();
      expect(list).toEqual([]);
    });

    it("should not modify original sessions map", async () => {
      manager.sessions.set("1", {
        id: "1",
        title: "Test",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.listSessions();
      expect(manager.sessions.size).toBe(1);
    });
  });

  describe("deleteSession", () => {
    beforeEach(() => {
      mockFs.unlink.mockResolvedValue(undefined);
    });

    it("should remove session from memory", async () => {
      manager.sessions.set("test", {
        id: "test",
        title: "Test",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.deleteSession("test");
      expect(manager.sessions.has("test")).toBe(false);
    });

    it("should delete session file", async () => {
      await manager.deleteSession("test");
      expect(mockFs.unlink).toHaveBeenCalledWith(`${mockSessionsDir}/test.json`);
    });

    it("should handle non-existent session gracefully", async () => {
      await expect(manager.deleteSession("nonexistent")).rejects.toThrow("Session not found");
    });

    it("should handle file deletion errors", async () => {
      mockFs.unlink.mockRejectedValueOnce(new Error("Permission denied"));
      manager.sessions.set("test", {
        id: "test",
        title: "Test",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(manager.deleteSession("test")).rejects.toThrow("Permission denied");
    });
  });

  describe("autoSave", () => {
    it("should start auto-save timer", () => {
      vi.useFakeTimers();

      manager.startAutoSave();
      expect(manager.autoSaveTimer).toBeDefined();

      vi.runAllTimers();
      expect(mockFs.writeFile).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("should stop auto-save timer", () => {
      manager.startAutoSave();
      expect(manager.autoSaveTimer).not.toBeNull();

      manager.stopAutoSave();
      expect(manager.autoSaveTimer).toBeNull();
    });

    it("should not start multiple timers", () => {
      manager.startAutoSave();
      const firstTimer = manager.autoSaveTimer;

      manager.startAutoSave();
      expect(manager.autoSaveTimer).toBe(firstTimer);
    });
  });

  describe("saveOnExit", () => {
    it("should register exit handler", () => {
      const mockOnExit = vi.fn();
      manager.saveOnExit(mockOnExit);

      expect(manager.exitHandler).toBe(mockOnExit);
    });

    it("should save all sessions on exit", async () => {
      const session1 = {
        id: "1",
        title: "Session 1",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const session2 = {
        id: "2",
        title: "Session 2",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      manager.sessions.set("1", session1);
      manager.sessions.set("2", session2);

      const mockOnExit = vi.fn();
      manager.saveOnExit(mockOnExit);
      await manager.exitHandler!();

      expect(mockFs.writeFile).toHaveBeenCalledTimes(2);
      expect(mockOnExit).toHaveBeenCalled();
    });
  });

  describe("ensureDir", () => {
    it("should create sessions directory if not exists", async () => {
      mockFs.access.mockResolvedValue(false);
      await manager.ensureDir();
      expect(mockFs.mkdir).toHaveBeenCalledWith(mockSessionsDir, { recursive: true });
    });

    it("should not create directory if already exists", async () => {
      mockFs.access.mockResolvedValue(true);
      await manager.ensureDir();
      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });
  });
});
