import { describe, it, expect } from "bun:test";
import { detectLanguage } from "../../providers/execute";

describe("detectLanguage", () => {
  it("should detect TypeScript files", () => {
    expect(detectLanguage("test.ts")).toBe("typescript");
    expect(detectLanguage("test.tsx")).toBe("typescript");
  });

  it("should detect JavaScript files", () => {
    expect(detectLanguage("test.js")).toBe("javascript");
    expect(detectLanguage("test.jsx")).toBe("javascript");
  });

  it("should detect Python files", () => {
    expect(detectLanguage("test.py")).toBe("python");
  });

  it("should detect Go files", () => {
    expect(detectLanguage("test.go")).toBe("go");
  });

  it("should detect Rust files", () => {
    expect(detectLanguage("test.rs")).toBe("rust");
  });

  it("should detect Ruby files", () => {
    expect(detectLanguage("test.rb")).toBe("ruby");
  });

  it("should detect Java files", () => {
    expect(detectLanguage("test.java")).toBe("java");
  });

  it("should detect C files", () => {
    expect(detectLanguage("test.c")).toBe("c");
    expect(detectLanguage("test.h")).toBe("c");
  });

  it("should detect C++ files", () => {
    expect(detectLanguage("test.cpp")).toBe("cpp");
    expect(detectLanguage("test.cc")).toBe("cpp");
    expect(detectLanguage("test.hpp")).toBe("cpp");
  });

  it("should detect Bash files", () => {
    expect(detectLanguage("test.sh")).toBe("bash");
    expect(detectLanguage("test.bash")).toBe("bash");
    expect(detectLanguage("test.zsh")).toBe("bash");
  });

  it("should detect PHP files", () => {
    expect(detectLanguage("test.php")).toBe("php");
  });

  it("should detect Perl files", () => {
    // Perl not in language map, returns 'text'
    expect(detectLanguage("script.pl")).toBe("text");
  });

  it("should return 'text' for unknown extensions", () => {
    expect(detectLanguage("file.unknown")).toBe("text");
  });

  it("should return 'text' for files without extension", () => {
    expect(detectLanguage("Makefile")).toBe("text");
  });

  it("should handle uppercase extensions", () => {
    expect(detectLanguage("script.PY")).toBe("python");
    expect(detectLanguage("app.JS")).toBe("javascript");
  });
});
