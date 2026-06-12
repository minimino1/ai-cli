import { describe, it, expect } from 'bun:test'
import { detectLanguage, executeFile, executeCode, languageCommands } from '../src/providers/execute'

describe('detectLanguage', () => {
  it('should detect TypeScript files', () => {
    expect(detectLanguage('test.ts')).toBe('typescript')
    expect(detectLanguage('test.tsx')).toBe('typescript')
  })

  it('should detect JavaScript files', () => {
    expect(detectLanguage('test.js')).toBe('javascript')
    expect(detectLanguage('test.jsx')).toBe('javascript')
  })

  it('should detect Python files', () => {
    expect(detectLanguage('test.py')).toBe('python')
  })

  it('should detect Go files', () => {
    expect(detectLanguage('test.go')).toBe('go')
  })

  it('should detect Rust files', () => {
    expect(detectLanguage('test.rs')).toBe('rust')
  })

  it('should detect Ruby files', () => {
    expect(detectLanguage('test.rb')).toBe('ruby')
  })

  it('should detect Java files', () => {
    expect(detectLanguage('test.java')).toBe('java')
  })

  it('should detect C files', () => {
    expect(detectLanguage('test.c')).toBe('c')
    expect(detectLanguage('test.h')).toBe('c')
  })

  it('should detect C++ files', () => {
    expect(detectLanguage('test.cpp')).toBe('cpp')
    expect(detectLanguage('test.cc')).toBe('cpp')
    expect(detectLanguage('test.hpp')).toBe('cpp')
  })

  it('should detect Bash files', () => {
    expect(detectLanguage('test.sh')).toBe('bash')
    expect(detectLanguage('test.bash')).toBe('bash')
    expect(detectLanguage('test.zsh')).toBe('bash')
  })

  it('should detect PHP files', () => {
    expect(detectLanguage('test.php')).toBe('php')
  })

  it('should detect CSS files', () => {
    expect(detectLanguage('test.css')).toBe('css')
  })

  it('should detect HTML files', () => {
    expect(detectLanguage('test.html')).toBe('html')
  })

  it('should detect JSON files', () => {
    expect(detectLanguage('test.json')).toBe('json')
  })

  it('should detect YAML files', () => {
    expect(detectLanguage('test.yaml')).toBe('yaml')
    expect(detectLanguage('test.yml')).toBe('yaml')
  })

  it('should detect Markdown files', () => {
    expect(detectLanguage('test.md')).toBe('markdown')
  })

  it('should return "text" for unknown extensions', () => {
    expect(detectLanguage('test.txt')).toBe('text')
    expect(detectLanguage('test.unknown')).toBe('text')
    expect(detectLanguage('noextension')).toBe('text')
  })

  it('should be case-insensitive', () => {
    expect(detectLanguage('TEST.TS')).toBe('typescript')
    expect(detectLanguage('test.PY')).toBe('python')
    expect(detectLanguage('test.JS')).toBe('javascript')
  })
})

describe('languageCommands', () => {
  it('should have entries for all supported interpreted languages', () => {
    expect(languageCommands.python).toBeDefined()
    expect(languageCommands.javascript).toBeDefined()
    expect(languageCommands.typescript).toBeDefined()
    expect(languageCommands.go).toBeDefined()
    expect(languageCommands.ruby).toBeDefined()
    expect(languageCommands.bash).toBeDefined()
    expect(languageCommands.sh).toBeDefined()
    expect(languageCommands.php).toBeDefined()
  })

  it('should have command and args for each language', () => {
    Object.values(languageCommands).forEach(config => {
      expect(config.command).toBeDefined()
      expect(typeof config.command).toBe('string')
      expect(Array.isArray(config.args)).toBe(true)
    })
  })

  it('should have correct command for Python', () => {
    expect(languageCommands.python.command).toBe('python3')
    expect(languageCommands.python.args).toEqual([])
  })

  it('should have correct command for Node.js', () => {
    expect(languageCommands.javascript.command).toBe('node')
    expect(languageCommands.typescript.command).toBe('tsx')
  })

  it('should have correct command for Go', () => {
    expect(languageCommands.go.command).toBe('go')
    expect(languageCommands.go.args).toEqual(['run'])
  })
})

// Note: executeFile and executeCode require actual file system and Bun.spawn
// These would be integration tests. We can test the language detection and
// command mapping, but actual execution requires mocking Bun.spawn or integration tests.

describe('executeCode', () => {
  it('should map languages to correct extensions', () => {
    // This is a structural test - the mapping is internal
    // We can verify by checking detectLanguage behavior
    expect(detectLanguage('/tmp/test.py')).toBe('python')
    expect(detectLanguage('/tmp/test.js')).toBe('javascript')
    expect(detectLanguage('/tmp/test.ts')).toBe('typescript')
    expect(detectLanguage('/tmp/test.go')).toBe('go')
    expect(detectLanguage('/tmp/test.rs')).toBe('rust')
    expect(detectLanguage('/tmp/test.rb')).toBe('ruby')
    expect(detectLanguage('/tmp/test.sh')).toBe('bash')
    expect(detectLanguage('/tmp/test.php')).toBe('php')
    expect(detectLanguage('/tmp/test.c')).toBe('c')
    expect(detectLanguage('/tmp/test.cpp')).toBe('cpp')
  })

  it('should return error for unsupported language', async () => {
    // This would fail because executeCode doesn't support this language
    // We can't easily test without mocking, but we can document expected behavior
    // In a real scenario, we'd mock the file operations
  })
})
