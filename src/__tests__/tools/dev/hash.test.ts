import { describe, it, expect, beforeEach, vi } from "bun:test";
import {
  hash,
  hashFile,
  hmac,
  verifyHash,
  hashSync,
  ALGORITHMS,
} from "../tools/dev/hash";

// Mock Web Crypto API
const mockDigest = vi.fn();
const mockSubtleCrypto = {
  digest: mockDigest,
};

vi.stubGlobal("crypto", {
  subtle: mockSubtleCrypto,
  getRandomValues: vi.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
});

// Mock fs/promises
const mockFs = {
  readFile: vi.fn(),
};

vi.mock("node:fs/promises", () => mockFs);

// Helper to convert ArrayBuffer to hex
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("hash", () => {
  beforeEach(() => {
    mockDigest.mockClear();
    vi.clearAllMocks();
  });

  it("should hash with MD5", async () => {
    mockDigest.mockResolvedValueOnce(new ArrayBuffer(16));
    const result = await hash("hello", "md5");
    expect(mockDigest).toHaveBeenCalledWith("MD5", expect.any(Uint8Array));
    expect(typeof result).toBe("string");
  });

  it("should hash with SHA-1", async () => {
    mockDigest.mockResolvedValueOnce(new ArrayBuffer(20));
    const result = await hash("hello", "sha1");
    expect(mockDigest).toHaveBeenCalledWith("SHA-1", expect.any(Uint8Array));
    expect(result.length).toBe(40); // 20 bytes = 40 hex chars
  });

  it("should hash with SHA-256", async () => {
    mockDigest.mockResolvedValueOnce(new ArrayBuffer(32));
    const result = await hash("hello", "sha256");
    expect(mockDigest).toHaveBeenCalledWith("SHA-256", expect.any(Uint8Array));
    expect(result.length).toBe(64); // 32 bytes = 64 hex chars
  });

  it("should hash with SHA-512", async () => {
    mockDigest.mockResolvedValueOnce(new ArrayBuffer(64));
    const result = await hash("hello", "sha512");
    expect(mockDigest).toHaveBeenCalledWith("SHA-512", expect.any(Uint8Array));
    expect(result.length).toBe(128); // 64 bytes = 128 hex chars
  });

  it("should throw for unsupported algorithm", async () => {
    await expect(hash("hello", "unsupported" as any)).rejects.toThrow(
      "Unsupported algorithm"
    );
  });

  it("should handle empty string", async () => {
    mockDigest.mockResolvedValueOnce(new ArrayBuffer(32));
    const result = await hash("", "sha256");
    expect(mockDigest).toHaveBeenCalledWith("SHA-256", expect.any(Uint8Array));
    expect(result).toBeDefined();
  });

  it("should handle binary data", async () => {
    const data = new Uint8Array([0x01, 0x02, 0x03]);
    mockDigest.mockResolvedValueOnce(new ArrayBuffer(32));
    const result = await hash(data, "sha256");
    expect(mockDigest).toHaveBeenCalledWith("SHA-256", data);
    expect(result).toBeDefined();
  });

  it("should convert string to Uint8Array correctly", async () => {
    mockDigest.mockResolvedValueOnce(new ArrayBuffer(32));
    await hash("test", "sha256");
    const passedData = mockDigest.mock.calls[0][1] as Uint8Array;
    expect(passedData).toBeInstanceOf(Uint8Array);
    expect(Array.from(passedData)).toEqual([116, 101, 115, 116]); // "test"
  });

  it("should list available algorithms", () => {
    expect(ALGORITHMS).toContain("md5");
    expect(ALGORITHMS).toContain("sha1");
    expect(ALGORITHMS).toContain("sha256");
    expect(ALGORITHMS).toContain("sha512");
  });
});

describe("hashSync", () => {
  beforeEach(() => {
    mockDigest.mockClear();
  });

  it("should hash synchronously with MD5", () => {
    mockDigest.mockReturnValue(new ArrayBuffer(16));
    const result = hashSync("hello", "md5");
    expect(mockDigest).toHaveBeenCalledWith("MD5", expect.any(Uint8Array));
    expect(typeof result).toBe("string");
  });

  it("should hash synchronously with SHA-256", () => {
    mockDigest.mockReturnValue(new ArrayBuffer(32));
    const result = hashSync("hello", "sha256");
    expect(mockDigest).toHaveBeenCalledWith("SHA-256", expect.any(Uint8Array));
    expect(result.length).toBe(64);
  });

  it("should throw for unsupported algorithm synchronously", () => {
    expect(() => hashSync("hello", "unsupported" as any)).toThrow(
      "Unsupported algorithm"
    );
  });

  it("should handle binary data synchronously", () => {
    const data = new Uint8Array([0x01, 0x02, 0x03]);
    mockDigest.mockReturnValue(new ArrayBuffer(32));
    const result = hashSync(data, "sha256");
    expect(mockDigest).toHaveBeenCalledWith("SHA-256", data);
    expect(result).toBeDefined();
  });
});

describe("hashFile", () => {
  beforeEach(() => {
    mockFs.readFile.mockClear();
    mockDigest.mockClear();
  });

  it("should hash file with default algorithm", async () => {
    mockFs.readFile.mockResolvedValueOnce(Buffer.from("file content"));
    mockDigest.mockResolvedValueOnce(new ArrayBuffer(32));

    const result = await hashFile("/path/to/file");

    expect(mockFs.readFile).toHaveBeenCalledWith("/path/to/file");
    expect(mockDigest).toHaveBeenCalledWith("SHA-256", expect.any(Uint8Array));
    expect(result).toBeDefined();
  });

  it("should hash file with specified algorithm", async () => {
    mockFs.readFile.mockResolvedValueOnce(Buffer.from("file content"));
    mockDigest.mockResolvedValueOnce(new ArrayBuffer(20));

    const result = await hashFile("/path/to/file", "sha1");

    expect(mockDigest).toHaveBeenCalledWith("SHA-1", expect.any(Uint8Array));
    expect(result.length).toBe(40);
  });

  it("should handle file read errors", async () => {
    mockFs.readFile.mockRejectedValueOnce(new Error("File not found"));
    await expect(hashFile("/nonexistent")).rejects.toThrow("File not found");
  });

  it("should handle large files", async () => {
    const largeContent = Buffer.alloc(1000000, "a");
    mockFs.readFile.mockResolvedValueOnce(largeContent);
    mockDigest.mockResolvedValueOnce(new ArrayBuffer(32));

    const result = await hashFile("/large/file");
    expect(result).toBeDefined();
    expect(mockFs.readFile).toHaveBeenCalledWith("/large/file");
  });

  it("should handle empty file", async () => {
    mockFs.readFile.mockResolvedValueOnce(Buffer.alloc(0));
    mockDigest.mockResolvedValueOnce(new ArrayBuffer(32));

    const result = await hashFile("/empty");
    expect(result).toBeDefined();
  });
});

describe("hmac", () => {
  beforeEach(() => {
    mockDigest.mockClear();
  });

  it("should create HMAC with MD5", async () => {
    mockDigest.mockResolvedValueOnce(new ArrayBuffer(16));
    const result = await hmac("message", "secret", "md5");
    expect(mockDigest).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it("should create HMAC with SHA-256", async () => {
    mockDigest.mockResolvedValueOnce(new ArrayBuffer(32));
    const result = await hmac("message", "secret", "sha256");
    expect(mockDigest).toHaveBeenCalled();
    expect(result.length).toBe(64);
  });

  it("should create HMAC with SHA-512", async () => {
    mockDigest.mockResolvedValueOnce(new ArrayBuffer(64));
    const result = await hmac("message", "secret", "sha512");
    expect(mockDigest).toHaveBeenCalled();
    expect(result.length).toBe(128);
  });

  it("should throw for unsupported algorithm", async () => {
    await expect(
      hmac("message", "secret", "unsupported" as any)
    ).rejects.toThrow("Unsupported algorithm");
  });

  it("should handle binary key", async () => {
    const key = new Uint8Array([1, 2, 3, 4, 5]);
    mockDigest.mockResolvedValueOnce(new ArrayBuffer(32));
    const result = await hmac("message", key, "sha256");
    expect(result).toBeDefined();
  });
});

describe("verifyHash", () => {
  beforeEach(() => {
    mockDigest.mockClear();
  });

  it("should verify correct hash", async () => {
    const expectedHash = "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3";
    mockDigest.mockResolvedValueOnce(
      Buffer.from(expectedHash, "hex").buffer
    );

    const result = await verifyHash("hello", expectedHash, "sha256");
    expect(result).toBe(true);
  });

  it("should reject incorrect hash", async () => {
    const actualHash = "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3";
    const wrongHash = "0000000000000000000000000000000000000000000000000000000000000000";
    mockDigest.mockResolvedValueOnce(Buffer.from(actualHash, "hex").buffer);

    const result = await verifyHash("hello", wrongHash, "sha256");
    expect(result).toBe(false);
  });

  it("should handle different algorithms", async () => {
    const md5Hash = "5d41402abc4b2a76b9719d911017c592";
    mockDigest.mockResolvedValueOnce(Buffer.from(md5Hash, "hex").buffer);

    const result = await verifyHash("hello", md5Hash, "md5");
    expect(result).toBe(true);
  });

  it("should throw for unsupported algorithm", async () => {
    await expect(
      verifyHash("hello", "hash", "unsupported" as any)
    ).rejects.toThrow("Unsupported algorithm");
  });

  it("should handle binary data verification", async () => {
    const data = new Uint8Array([0x01, 0x02, 0x03]);
    const expectedHash = "0beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a33";
    mockDigest.mockResolvedValueOnce(Buffer.from(expectedHash, "hex").buffer);

    const result = await verifyHash(data, expectedHash, "sha256");
    expect(result).toBe(true);
  });
});

describe("algorithm support", () => {
  it("should support MD5", () => {
    expect(ALGORITHMS).toContain("md5");
  });

  it("should support SHA-1", () => {
    expect(ALGORITHMS).toContain("sha1");
  });

  it("should support SHA-256", () => {
    expect(ALGORITHMS).toContain("sha256");
  });

  it("should support SHA-512", () => {
    expect(ALGORITHMS).toContain("sha512");
  });

  it("should not include unsupported algorithms", () => {
    expect(ALGORITHMS).not.toContain("sha224");
    expect(ALGORITHMS).not.toContain("sha384");
  });
});

describe("edge cases", () => {
  it("should handle very long input", async () => {
    const longInput = "a".repeat(1000000);
    mockDigest.mockResolvedValueOnce(new ArrayBuffer(32));
    const result = await hash(longInput, "sha256");
    expect(result).toBeDefined();
    expect(result.length).toBe(64);
  });

  it("should handle empty input", async () => {
    mockDigest.mockResolvedValueOnce(new ArrayBuffer(32));
    const result = await hash("", "sha256");
    expect(result).toBeDefined();
  });

  it("should handle unicode characters", async () => {
    const unicode = "Hello 世界 🌍";
    mockDigest.mockResolvedValueOnce(new ArrayBuffer(32));
    const result = await hash(unicode, "sha256");
    expect(result).toBeDefined();
  });

  it("should handle binary buffers", async () => {
    const buffer = new Uint8Array([0, 1, 2, 255]);
    mockDigest.mockResolvedValueOnce(new ArrayBuffer(32));
    const result = await hash(buffer, "sha256");
    expect(result).toBeDefined();
  });

  it("should handle zero-length file", async () => {
    mockFs.readFile.mockResolvedValueOnce(Buffer.alloc(0));
    mockDigest.mockResolvedValueOnce(new ArrayBuffer(32));
    const result = await hashFile("/empty");
    expect(result).toBeDefined();
  });
});
