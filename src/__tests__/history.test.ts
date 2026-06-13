import { describe, it, expect, beforeEach } from "bun:test";
import { SessionManager } from "../history";
import type { Message } from "../types";

describe("SessionManager", () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = SessionManager.getInstance();
  });

  describe("singleton pattern", () => {
    it("should return the same instance", () => {
      const instance1 = SessionManager.getInstance();
      const instance2 = SessionManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("generateId", () => {
    it("should generate unique IDs", () => {
      const id1 = manager.generateId();
      const id2 = manager.generateId();
      expect(id1).not.toBe(id2);
    });

    it("should generate IDs with correct format", () => {
      const id = manager.generateId();
      expect(id).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    it("should generate different IDs on each call", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(manager.generateId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe("extractTitle", () => {
    it("should extract title from first user message text", () => {
      const messages: Message[] = [
        {
          id: "1",
          role: "user",
          parts: [{ type: "text", text: "This is the title" }],
          timestamp: new Date(),
        },
      ];
      expect(manager.extractTitle(messages)).toBe("This is the title");
    });

    it("should return 'Untitled Session' for empty messages", () => {
      expect(manager.extractTitle([])).toBe("Untitled Session");
    });

    it("should return 'Untitled Session' when no user message", () => {
      const messages: Message[] = [
        {
          id: "1",
          role: "assistant",
          parts: [{ type: "text", text: "Hello" }],
          timestamp: new Date(),
        },
      ];
      expect(manager.extractTitle(messages)).toBe("Untitled Session");
    });

    it("should return 'Untitled Session' when user message has no text part", () => {
      const messages: Message[] = [
        {
          id: "1",
          role: "user",
          parts: [{ type: "code", language: "ts", code: "console.log('hi')" }],
          timestamp: new Date(),
        },
      ];
      expect(manager.extractTitle(messages)).toBe("Untitled Session");
    });

    it("should truncate long titles to 50 characters", () => {
      const longText = "A".repeat(60);
      const messages: Message[] = [
        {
          id: "1",
          role: "user",
          parts: [{ type: "text", text: longText }],
          timestamp: new Date(),
        },
      ];
      const title = manager.extractTitle(messages);
      expect(title.length).toBe(53); // 50 + "..."
      expect(title.endsWith("...")).toBe(true);
    });

    it("should not truncate short titles", () => {
      const messages: Message[] = [
        {
          id: "1",
          role: "user",
          parts: [{ type: "text", text: "Short title" }],
          timestamp: new Date(),
        },
      ];
      expect(manager.extractTitle(messages)).toBe("Short title");
    });

    it("should trim whitespace from title", () => {
      const messages: Message[] = [
        {
          id: "1",
          role: "user",
          parts: [{ type: "text", text: "   Title with spaces   " }],
          timestamp: new Date(),
        },
      ];
      expect(manager.extractTitle(messages)).toBe("Title with spaces");
    });
  });
});
