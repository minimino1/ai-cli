import { describe, it, expect } from "bun:test";
import { hash, hashSync, hmac, verifyHash } from "../../../tools/dev/hash";

describe("hash", () => {
  it("should hash with SHA-256 and return 64-char hex", async () => {
    const result = await hash("hello", "sha256");
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should hash with SHA-512 and return 128-char hex", async () => {
    const result = await hash("hello", "sha512");
    expect(result).toMatch(/^[a-f0-9]{128}$/);
  });

  it("should throw for unsupported algorithm", async () => {
    await expect(hash("hello", "unsupported" as any)).rejects.toThrow(
      "Unsupported algorithm"
    );
  });

  it("should handle empty string", async () => {
    const result = await hash("", "sha256");
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should handle binary data", async () => {
    const data = new Uint8Array([0x01, 0x02, 0x03]);
    const result = await hash(data as any, "sha256");
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("hashSync", () => {
  it("should hash synchronously with SHA-256", () => {
    const result = hashSync("hello", "sha256");
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should hash synchronously with SHA-1", () => {
    const result = hashSync("hello", "sha1");
    expect(result).toMatch(/^[a-f0-9]{40}$/);
  });

  it("should hash synchronously with SHA-512", () => {
    const result = hashSync("hello", "sha512");
    expect(result).toMatch(/^[a-f0-9]{128}$/);
  });

  it("should throw for unsupported algorithm synchronously", () => {
    expect(() => hashSync("hello", "unsupported" as any)).toThrow(
      "Unsupported algorithm"
    );
  });
});

describe("hmac", () => {
  it("should create HMAC with SHA-256 and return 64-char hex", async () => {
    const result = await hmac("message", "secret", "sha256");
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should throw for unsupported algorithm", async () => {
    await expect(hmac("message", "secret", "unsupported" as any)).rejects.toThrow(
      "Unsupported algorithm"
    );
  });
});

describe("verifyHash", () => {
  it("should verify correct hash", async () => {
    const correctHash = await hash("hello", "sha256");
    const result = await verifyHash("hello", correctHash, "sha256");
    expect(result).toBe(true);
  });

  it("should reject incorrect hash", async () => {
    const wrongHash = "0".repeat(64);
    const result = await verifyHash("hello", wrongHash, "sha256");
    expect(result).toBe(false);
  });
});
