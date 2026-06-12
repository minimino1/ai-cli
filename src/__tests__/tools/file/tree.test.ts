import { describe, it, expect, beforeEach, vi } from "bun:test";
import { tree, treeSync, type TreeNode } from "../tools/file/tree";

// Mock fs/promises and fs
const mockFs = {
  readdir: vi.fn(),
  stat: vi.fn(),
};

vi.mock("node:fs/promises", () => mockFs);
vi.mock("node:fs", () => ({
  Stats: class Stats {
    isDirectory(): boolean {
      return true;
    }
    isFile(): boolean {
      return false;
    }
  },
}));

// Helper to create mock directory structure
function createMockTree(
  path: string,
  structure: Record<string, any>
): Promise<{ name: string; path: string; type: "file" | "directory"; children?: TreeNode[] }> {
  const name = path.split("/").pop() || path;
  const isDir = typeof structure === "object" && structure !== null && !structure.content;

  if (isDir) {
    const children = Object.entries(structure).map(([childName, childStruct]) =>
      createMockTree(`${path}/${childName}`, childStruct as any)
    );
    return Promise.resolve({
      name,
      path,
      type: "directory",
      children: Promise.all(children),
    });
  } else {
    return Promise.resolve({
      name,
      path,
      type: "file",
    });
  }
}

describe("tree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.readdir.mockClear();
    mockFs.stat.mockClear();
  });

  it("should generate tree for simple directory", async () => {
    const mockStat = {
      isDirectory: () => true,
      isFile: () => false,
    };

    mockFs.readdir.mockResolvedValueOnce(["file1.txt", "dir1"]);
    mockFs.stat.mockResolvedValueOnce(mockStat);
    mockFs.stat.mockResolvedValueOnce(mockStat);

    const result = await tree("/test");

    expect(result).toContain("file1.txt");
    expect(result).toContain("dir1");
  });

  it("should show files when showFiles is true", async () => {
    const mockStat = {
      isDirectory: () => true,
      isFile: () => false,
    };

    mockFs.readdir.mockResolvedValueOnce(["file1.txt", "dir1"]);
    mockFs.stat.mockResolvedValueOnce(mockStat);
    mockFs.stat.mockResolvedValueOnce(mockStat);

    const result = await tree("/test", { showFiles: true });

    expect(result).toContain("file1.txt");
  });

  it("should hide files when showFiles is false", async () => {
    const mockStat = {
      isDirectory: () => true,
      isFile: () => false,
    };

    mockFs.readdir.mockResolvedValueOnce(["file1.txt", "dir1"]);
    mockFs.stat.mockResolvedValueOnce(mockStat);
    mockFs.stat.mockResolvedValueOnce(mockStat);

    const result = await tree("/test", { showFiles: false });

    expect(result).not.toContain("file1.txt");
    expect(result).toContain("dir1");
  });

  it("should respect maxDepth", async () => {
    const mockDirStat = {
      isDirectory: () => true,
      isFile: () => false,
    };
    const mockFileStat = {
      isDirectory: () => false,
      isFile: () => true,
    };

    mockFs.readdir
      .mockResolvedValueOnce(["dir1", "file1.txt"])
      .mockResolvedValueOnce(["dir2", "file2.txt"])
      .mockResolvedValueOnce(["file3.txt"])
      .mockResolvedValueOnce(["file4.txt"]);

    mockFs.stat
      .mockResolvedValueOnce(mockDirStat) // /test
      .mockResolvedValueOnce(mockFileStat) // file1.txt
      .mockResolvedValueOnce(mockDirStat) // dir1
      .mockResolvedValueOnce(mockDirStat) // /test/dir1
      .mockResolvedValueOnce(mockFileStat) // file2.txt
      .mockResolvedValueOnce(mockDirStat) // dir2
      .mockResolvedValueOnce(mockFileStat); // file3.txt

    const result = await tree("/test", { maxDepth: 1 });

    expect(result).toContain("dir1");
    expect(result).toContain("file1.txt");
    // dir2 should not appear as it's at depth 2
    expect(result).not.toContain("dir2");
  });

  it("should respect ignore patterns", async () => {
    const mockStat = {
      isDirectory: () => true,
      isFile: () => false,
    };

    mockFs.readdir.mockResolvedValueOnce(["node_modules", "src", "test.ts"]);
    mockFs.stat.mockResolvedValueOnce(mockStat);
    mockFs.stat.mockResolvedValueOnce(mockStat);
    mockFs.stat.mockResolvedValueOnce(mockStat);

    const result = await tree("/project", {
      ignorePatterns: ["node_modules", "*.ts"],
    });

    expect(result).not.toContain("node_modules");
    expect(result).not.toContain("test.ts");
    expect(result).toContain("src");
  });

  it("should show hidden files when showHidden is true", async () => {
    const mockStat = {
      isDirectory: () => true,
      isFile: () => false,
    };

    mockFs.readdir.mockResolvedValueOnce([".git", "src", ".env"]);
    mockFs.stat.mockResolvedValueOnce(mockStat);
    mockFs.stat.mockResolvedValueOnce(mockStat);
    mockFs.stat.mockResolvedValueOnce(mockStat);

    const result = await tree("/test", { showHidden: true });

    expect(result).toContain(".git");
    expect(result).toContain(".env");
  });

  it("should hide hidden files by default", async () => {
    const mockStat = {
      isDirectory: () => true,
      isFile: () => false,
    };

    mockFs.readdir.mockResolvedValueOnce([".git", "src", ".env"]);
    mockFs.stat.mockResolvedValueOnce(mockStat);
    mockFs.stat.mockResolvedValueOnce(mockStat);
    mockFs.stat.mockResolvedValueOnce(mockStat);

    const result = await tree("/test");

    expect(result).not.toContain(".git");
    expect(result).not.toContain(".env");
    expect(result).toContain("src");
  });

  it("should use icons when enabled", async () => {
    const mockStat = {
      isDirectory: () => true,
      isFile: () => false,
    };

    mockFs.readdir.mockResolvedValueOnce(["dir1", "file1.txt"]);
    mockFs.stat.mockResolvedValueOnce(mockStat);
    mockFs.stat.mockResolvedValueOnce(mockStat);

    const result = await tree("/test", { icons: true });

    expect(result).toContain("📁"); // folder icon
    expect(result).toContain("📄"); // file icon
  });

  it("should not use icons when disabled", async () => {
    const mockStat = {
      isDirectory: () => true,
      isFile: () => false,
    };

    mockFs.readdir.mockResolvedValueOnce(["dir1", "file1.txt"]);
    mockFs.stat.mockResolvedValueOnce(mockStat);
    mockFs.stat.mockResolvedValueOnce(mockStat);

    const result = await tree("/test", { icons: false });

    expect(result).not.toContain("📁");
    expect(result).not.toContain("📄");
  });

  it("should handle empty directory", async () => {
    mockFs.readdir.mockResolvedValueOnce([]);

    const result = await tree("/empty");

    expect(result).toBe(""); // or some representation of empty tree
  });

  it("should handle permission errors gracefully", async () => {
    mockFs.readdir.mockRejectedValueOnce(new Error("Permission denied"));

    await expect(tree("/restricted")).rejects.toThrow("Permission denied");
  });

  it("should handle nested directories", async () => {
    const mockDirStat = {
      isDirectory: () => true,
      isFile: () => false,
    };
    const mockFileStat = {
      isDirectory: () => false,
      isFile: () => true,
    };

    mockFs.readdir
      .mockResolvedValueOnce(["src", "README.md"])
      .mockResolvedValueOnce(["components", "utils"])
      .mockResolvedValueOnce(["Button.tsx"])
      .mockResolvedValueOnce(["helpers.ts"]);

    mockFs.stat
      .mockResolvedValueOnce(mockDirStat) // /
      .mockResolvedValueOnce(mockDirStat) // src
      .mockResolvedValueOnce(mockFileStat) // README.md
      .mockResolvedValueOnce(mockDirStat) // src
      .mockResolvedValueOnce(mockDirStat) // components
      .mockResolvedValueOnce(mockDirStat) // utils
      .mockResolvedValueOnce(mockFileStat) // Button.tsx
      .mockResolvedValueOnce(mockFileStat); // helpers.ts

    const result = await tree("/project");

    expect(result).toContain("src");
    expect(result).toContain("components");
    expect(result).toContain("Button.tsx");
    expect(result).toContain("helpers.ts");
  });

  it("should handle mixed files and directories", async () => {
    const mockDirStat = { isDirectory: () => true, isFile: () => false };
    const mockFileStat = { isDirectory: () => false, isFile: () => true };

    mockFs.readdir.mockResolvedValueOnce(["dir1", "file1.txt", "dir2", "file2.js"]);
    mockFs.stat
      .mockResolvedValueOnce(mockDirStat)
      .mockResolvedValueOnce(mockFileStat)
      .mockResolvedValueOnce(mockDirStat)
      .mockResolvedValueOnce(mockFileStat);

    const result = await tree("/mixed");

    expect(result).toContain("dir1");
    expect(result).toContain("dir2");
    expect(result).toContain("file1.txt");
    expect(result).toContain("file2.js");
  });
});

describe("treeSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.readdir.mockClear();
    mockFs.stat.mockClear();
  });

  it("should generate tree synchronously", () => {
    const mockDirStat = {
      isDirectory: () => true,
      isFile: () => false,
    };
    const mockFileStat = {
      isDirectory: () => false,
      isFile: () => true,
    };

    mockFs.readdir
      .mockResolvedValueOnce(["dir1", "file1.txt"])
      .mockResolvedValueOnce(["file2.txt"]);

    mockFs.stat
      .mockResolvedValueOnce(mockDirStat)
      .mockResolvedValueOnce(mockFileStat)
      .mockResolvedValueOnce(mockDirStat)
      .mockResolvedValueOnce(mockFileStat);

    const result = treeSync("/test");

    expect(result).toContain("dir1");
    expect(result).toContain("file1.txt");
    expect(result).toContain("file2.txt");
  });

  it("should respect options synchronously", () => {
    const mockDirStat = { isDirectory: () => true, isFile: () => false };
    const mockFileStat = { isDirectory: () => false, isFile: () => true };

    mockFs.readdir.mockResolvedValueOnce(["dir1", "file1.txt", ".git"]);
    mockFs.stat
      .mockResolvedValueOnce(mockDirStat)
      .mockResolvedValueOnce(mockFileStat)
      .mockResolvedValueOnce(mockDirStat);

    const result = treeSync("/test", {
      showHidden: false,
      ignorePatterns: [".git"],
    });

    expect(result).toContain("dir1");
    expect(result).toContain("file1.txt");
    expect(result).not.toContain(".git");
  });

  it("should handle errors synchronously", () => {
    mockFs.readdir.mockRejectedValueOnce(new Error("Not found"));

    expect(() => treeSync("/nonexistent")).toThrow("Not found");
  });
});

describe("TreeNode structure", () => {
  it("should have correct shape for file", async () => {
    const mockFileStat = {
      isDirectory: () => false,
      isFile: () => true,
    };

    mockFs.readdir.mockResolvedValueOnce([]);
    mockFs.stat.mockResolvedValueOnce(mockFileStat);

    const result = await tree("/test", { showFiles: true });

    // Result is a string, but internal structure should have correct types
    expect(typeof result).toBe("string");
  });

  it("should have correct shape for directory", async () => {
    const mockDirStat = {
      isDirectory: () => true,
      isFile: () => false,
    };

    mockFs.readdir.mockResolvedValueOnce(["subdir"]);
    mockFs.stat.mockResolvedValueOnce(mockDirStat);

    const result = await tree("/test");

    expect(typeof result).toBe("string");
    expect(result).toContain("subdir");
  });
});

describe("edge cases", () => {
  it("should handle very deep nesting", async () => {
    const mockDirStat = { isDirectory: () => true, isFile: () => false };
    const mockFileStat = { isDirectory: () => false, isFile: () => true };

    // Create a deep path: /a/b/c/d/e/f/g
    const depths = 7;
    let readdirCalls = 0;
    let statCalls = 0;

    mockFs.readdir.mockImplementation(async (path: string) => {
      readdirCalls++;
      const depth = path.split("/").filter(Boolean).length;
      if (depth < depths) {
        return [`dir${depth}`];
      } else {
        return ["file.txt"];
      }
    });

    mockFs.stat.mockImplementation(async (path: string) => {
      statCalls++;
      const isDir = !path.endsWith("file.txt");
      return isDir ? mockDirStat : mockFileStat;
    });

    const result = await tree("/", { maxDepth: depths });

    expect(result).toContain("dir1");
    expect(result).toContain("dir7");
    expect(result).toContain("file.txt");
  });

  it("should handle circular symlinks gracefully", async () => {
    const mockDirStat = { isDirectory: () => true, isFile: () => false };

    mockFs.readdir.mockResolvedValueOnce(["self"]);
    mockFs.stat.mockResolvedValueOnce(mockDirStat);

    // This would normally cause infinite recursion, but with maxDepth it should stop
    const result = await tree("/circular", { maxDepth: 3 });

    expect(result).toContain("self");
  });

  it("should handle special characters in filenames", async () => {
    const mockStat = { isDirectory: () => true, isFile: () => false };

    mockFs.readdir.mockResolvedValueOnce(["file with spaces.txt", "file[1].js", "file's.txt"]);
    mockFs.stat.mockResolvedValueOnce(mockStat);

    const result = await tree("/test");

    expect(result).toContain("file with spaces.txt");
    expect(result).toContain("file[1].js");
    expect(result).toContain("file's.txt");
  });

  it("should handle unicode filenames", async () => {
    const mockStat = { isDirectory: () => true, isFile: () => false };

    mockFs.readdir.mockResolvedValueOnce(["文件.txt", "файл.js", "파일.ts"]);
    mockFs.stat.mockResolvedValueOnce(mockStat);

    const result = await tree("/test");

    expect(result).toContain("文件.txt");
    expect(result).toContain("файл.js");
    expect(result).toContain("파일.ts");
  });

  it("should handle very large directories", async () => {
    const mockStat = { isDirectory: () => true, isFile: () => false };
    const manyFiles = Array.from({ length: 1000 }, (_, i) => `file${i}.txt`);

    mockFs.readdir.mockResolvedValueOnce(manyFiles);
    mockFs.stat.mockResolvedValueOnce(mockStat);

    const result = await tree("/large");

    expect(result).toContain("file0.txt");
    expect(result).toContain("file999.txt");
  });
});
