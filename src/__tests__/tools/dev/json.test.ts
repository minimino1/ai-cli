import { describe, it, expect, beforeEach, vi } from "bun:test";
import {
  formatJSON,
  minifyJSON,
  validateJSON,
  convertJSON,
  queryJSONPath,
} from "../tools/dev/json";

// Mock external dependencies for convertJSON
vi.mock("yaml", () => ({
  stringify: vi.fn((obj) => `yaml: ${JSON.stringify(obj)}`),
}));

vi.mock("toml", () => ({
  stringify: vi.fn((obj) => `toml: ${JSON.stringify(obj)}`),
}));

vi.mock("csv-stringify/sync", () => ({
  stringify: vi.fn((arr) => `csv: ${arr.map((r: string[]) => r.join(",")).join("\n")}`),
}));

vi.mock("csv-parse/sync", () => ({
  parse: vi.fn((str) => JSON.parse(str.replace("csv: ", ""))),
}));

describe("formatJSON", () => {
  it("should format simple object with default indent", () => {
    const input = { a: 1, b: 2 };
    const result = formatJSON(input);
    expect(result).toBe(`{\n  "a": 1,\n  "b": 2\n}`);
  });

  it("should format with custom indent", () => {
    const input = { a: 1, b: 2 };
    const result = formatJSON(input, 4);
    expect(result).toBe(`{\n    "a": 1,\n    "b": 2\n}`);
  });

  it("should format nested objects", () => {
    const input = { a: { b: { c: 1 } } };
    const result = formatJSON(input);
    expect(result).toContain('"a":');
    expect(result).toContain('"b":');
    expect(result).toContain('"c": 1');
  });

  it("should format arrays", () => {
    const input = [1, 2, 3];
    const result = formatJSON(input);
    expect(result).toBe(`[\n  1,\n  2,\n  3\n]`);
  });

  it("should handle empty object", () => {
    const result = formatJSON({});
    expect(result).toBe("{}");
  });

  it("should handle empty array", () => {
    const result = formatJSON([]);
    expect(result).toBe("[]");
  });

  it("should preserve string values with special characters", () => {
    const input = { text: "Hello\nWorld\t!" };
    const result = formatJSON(input);
    expect(result).toContain("Hello\\nWorld\\t!");
  });

  it("should format boolean and null values", () => {
    const input = { bool: true, nullVal: null, num: 42, str: "text" };
    const result = formatJSON(input);
    expect(result).toContain("true");
    expect(result).toContain("null");
    expect(result).toContain("42");
    expect(result).toContain('"text"');
  });
});

describe("minifyJSON", () => {
  it("should minify simple object", () => {
    const input = { a: 1, b: 2 };
    const result = minifyJSON(input);
    expect(result).toBe('{"a":1,"b":2}');
  });

  it("should minify nested object", () => {
    const input = { a: { b: { c: 1 } } };
    const result = minifyJSON(input);
    expect(result).toBe('{"a":{"b":{"c":1}}}');
  });

  it("should minify array", () => {
    const input = [1, 2, 3];
    const result = minifyJSON(input);
    expect(result).toBe("[1,2,3]");
  });

  it("should minify mixed types", () => {
    const input = { a: 1, b: "text", c: true, d: null };
    const result = minifyJSON(input);
    expect(result).toBe('{"a":1,"b":"text","c":true,"d":null}');
  });

  it("should handle empty structures", () => {
    expect(minifyJSON({})).toBe("{}");
    expect(minifyJSON([])).toBe("[]");
  });

  it("should remove all whitespace", () => {
    const input = { a: 1, b: { c: 2, d: [3, 4] } };
    const result = minifyJSON(input);
    expect(result).not.toMatch(/\s/);
  });
});

describe("validateJSON", () => {
  it("should validate correct JSON object", () => {
    expect(validateJSON('{"a":1,"b":2}')).toBe(true);
  });

  it("should validate correct JSON array", () => {
    expect(validateJSON('[1,2,3]')).toBe(true);
  });

  it("should validate simple values", () => {
    expect(validateJSON('"string"')).toBe(true);
    expect(validateJSON('123')).toBe(true);
    expect(validateJSON('true')).toBe(true);
    expect(validateJSON('null')).toBe(true);
  });

  it("should reject invalid JSON", () => {
    expect(validateJSON('{a:1}')).toBe(false);
    expect(validateJSON('undefined')).toBe(false);
    expect(validateJSON('')).toBe(false);
    expect(validateJSON('not json')).toBe(false);
    expect(validateJSON('{unclosed}')).toBe(false);
  });

  it("should handle empty string", () => {
    expect(validateJSON("")).toBe(false);
  });

  it("should handle trailing commas", () => {
    expect(validateJSON('{"a":1,}')).toBe(false);
    expect(validateJSON('[,]')).toBe(false);
  });
});

describe("convertJSON", () => {
  it("should convert to YAML", () => {
    const input = { a: 1, b: "text" };
    const result = convertJSON(input, "yaml");
    expect(result).toContain("yaml:");
    expect(result).toContain("a");
    expect(result).toContain("1");
  });

  it("should convert to TOML", () => {
    const input = { a: 1, b: "text" };
    const result = convertJSON(input, "toml");
    expect(result).toContain("toml:");
    expect(result).toContain("a");
    expect(result).toContain("1");
  });

  it("should convert array to CSV", () => {
    const input = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ];
    const result = convertJSON(input, "csv");
    expect(result).toContain("csv:");
    expect(result).toContain("Alice");
    expect(result).toContain("Bob");
  });

  it("should throw for unsupported format", () => {
    const input = { a: 1 };
    expect(() => convertJSON(input, "xml")).toThrow("Unsupported format");
  });

  it("should throw for invalid JSON input", () => {
    expect(() => convertJSON("invalid", "yaml")).toThrow("Invalid JSON");
  });

  it("should handle empty object conversion", () => {
    const result = convertJSON({}, "yaml");
    expect(result).toBeDefined();
  });

  it("should handle nested objects in YAML", () => {
    const input = { a: { b: { c: 1 } } };
    const result = convertJSON(input, "yaml");
    expect(result).toContain("a");
    expect(result).toContain("b");
  });

  it("should handle arrays of primitives in CSV", () => {
    const input = [[1, 2, 3], [4, 5, 6]];
    const result = convertJSON(input, "csv");
    expect(result).toContain("1,2,3");
    expect(result).toContain("4,5,6");
  });
});

describe("queryJSONPath", () => {
  it("should query simple property", () => {
    const obj = { a: 1, b: 2 };
    const result = queryJSONPath(obj, "$.a");
    expect(result).toBe(1);
  });

  it("should query nested property", () => {
    const obj = { a: { b: { c: 1 } } };
    const result = queryJSONPath(obj, "$.a.b.c");
    expect(result).toBe(1);
  });

  it("should query array index", () => {
    const obj = { items: [10, 20, 30] };
    const result = queryJSONPath(obj, "$.items[1]");
    expect(result).toBe(20);
  });

  it("should query array with wildcard", () => {
    const obj = { items: [1, 2, 3] };
    const result = queryJSONPath(obj, "$.items[*]");
    expect(result).toEqual([1, 2, 3]);
  });

  it("should return undefined for non-existent path", () => {
    const obj = { a: 1 };
    const result = queryJSONPath(obj, "$.b");
    expect(result).toBeUndefined();
  });

  it("should handle root query", () => {
    const obj = { a: 1 };
    const result = queryJSONPath(obj, "$");
    expect(result).toEqual(obj);
  });

  it("should query multiple properties with wildcard", () => {
    const obj = { a: { x: 1, y: 2 }, b: { x: 3, y: 4 } };
    const result = queryJSONPath(obj, "$.*.x");
    expect(result).toEqual([1, 3]);
  });

  it("should handle complex nested arrays", () => {
    const obj = { matrix: [[1, 2], [3, 4]] };
    const result = queryJSONPath(obj, "$.matrix[0][1]");
    expect(result).toBe(2);
  });

  it("should handle array slice", () => {
    const obj = { items: [1, 2, 3, 4, 5] };
    const result = queryJSONPath(obj, "$.items[1:4]");
    expect(result).toEqual([2, 3, 4]);
  });

  it("should handle filter expressions", () => {
    const obj = { items: [{ age: 25 }, { age: 30 }, { age: 35 }] };
    const result = queryJSONPath(obj, "$.items[?(@.age > 28)]");
    expect(result).toHaveLength(2);
    expect(result[0].age).toBe(30);
    expect(result[1].age).toBe(35);
  });

  it("should throw for invalid JSONPath syntax", () => {
    const obj = { a: 1 };
    expect(() => queryJSONPath(obj, "$.[")).toThrow("Invalid JSONPath");
  });

  it("should handle empty array results", () => {
    const obj = { items: [] };
    const result = queryJSONPath(obj, "$.items[*]");
    expect(result).toEqual([]);
  });
});

describe("edge cases", () => {
  describe("formatJSON edge cases", () => {
    it("should handle very deep nesting", () => {
      const deep = { a: { b: { c: { d: { e: { f: { g: 1 } } } } } };
      const result = formatJSON(deep);
      expect(result).toContain('"g": 1');
    });

    it("should handle very long strings", () => {
      const longStr = "a".repeat(10000);
      const input = { long: longStr };
      const result = formatJSON(input);
      expect(result).toContain(longStr);
    });

    it("should handle unicode characters", () => {
      const input = { emoji: "🎉", chinese: "你好", arabic: "مرحبا" };
      const result = formatJSON(input);
      expect(result).toContain("🎉");
      expect(result).toContain("你好");
      expect(result).toContain("مرحبا");
    });
  });

  describe("minifyJSON edge cases", () => {
    it("should handle large objects efficiently", () => {
      const large = { a: 1, b: 2, c: 3, d: 4, e: 5 };
      for (let i = 0; i < 100; i++) {
        large[`key${i}`] = i;
      }
      const result = minifyJSON(large);
      expect(result).not.toMatch(/\s/);
      expect(JSON.parse(result)).toEqual(large);
    });
  });

  describe("validateJSON edge cases", () => {
    it("should handle BOM characters", () => {
      const withBom = "\uFEFF{}";
      expect(validateJSON(withBom)).toBe(true);
    });

    it("should handle numbers in scientific notation", () => {
      expect(validateJSON('1.23e4')).toBe(true);
      expect(validateJSON('1.23E-4')).toBe(true);
    });
  });

  describe("queryJSONPath edge cases", () => {
    it("should handle null values in arrays", () => {
      const obj = { items: [1, null, 3] };
      const result = queryJSONPath(obj, "$.items[1]");
      expect(result).toBeNull();
    });

    it("should handle boolean values", () => {
      const obj = { flags: { active: true, debug: false } };
      expect(queryJSONPath(obj, "$.flags.active")).toBe(true);
      expect(queryJSONPath(obj, "$.flags.debug")).toBe(false);
    });
  });
});
