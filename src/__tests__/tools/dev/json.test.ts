import { describe, it, expect } from "bun:test";
import {
  formatJSON,
  minifyJSON,
  validateJSON,
} from "../../../tools/dev/json";

describe("formatJSON", () => {
  it("should format simple object", () => {
    const result = formatJSON('{"a":1,"b":2}');
    expect(result).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  it("should format with custom indent", () => {
    const result = formatJSON('{"a":1}', 4);
    expect(result).toBe('{\n    "a": 1\n}');
  });

  it("should handle empty object", () => {
    expect(formatJSON('{}')).toBe("{}");
  });

  it("should handle arrays", () => {
    const result = formatJSON('[1,2,3]');
    expect(result).toBe('[\n  1,\n  2,\n  3\n]');
  });
});

describe("minifyJSON", () => {
  it("should minify simple object", () => {
    expect(minifyJSON('{"a":1,"b":2}')).toBe('{"a":1,"b":2}');
  });

  it("should minify nested object", () => {
    expect(minifyJSON('{"a":{"b":1}}')).toBe('{"a":{"b":1}}');
  });

  it("should handle arrays", () => {
    expect(minifyJSON('[1,2,3]')).toBe('[1,2,3]');
  });

  it("should remove all whitespace", () => {
    const result = minifyJSON('{"a": 1, "b": 2}');
    expect(result).not.toMatch(/\s/);
  });
});

describe("validateJSON", () => {
  it("should validate correct JSON", () => {
    const result = validateJSON('{"a":1}');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should validate simple values", () => {
    expect(validateJSON('true').valid).toBe(true);
    expect(validateJSON('null').valid).toBe(true);
    expect(validateJSON('"string"').valid).toBe(true);
    expect(validateJSON('123').valid).toBe(true);
  });

  it("should reject invalid JSON", () => {
    const result1 = validateJSON('{a:1}');
    expect(result1.valid).toBe(false);
    expect(result1.error).toBeDefined();

    const result2 = validateJSON('undefined');
    expect(result2.valid).toBe(false);

    const result3 = validateJSON('');
    expect(result3.valid).toBe(false);

    const result4 = validateJSON('not json');
    expect(result4.valid).toBe(false);
  });
});
