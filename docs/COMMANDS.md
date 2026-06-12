# Command Reference

ai-cli provides 50+ slash commands organized into categories. All commands start with `/` and support tab completion.

## AI Commands

### `/review [file]`
Review code for quality, security, and best practices.

**Aliases:** `/r`

**Arguments:**
- `file` (optional) - Path to file to review. If omitted, reviews current buffer.

**Examples:**
```
/review src/index.ts
/r main.py
/review
```

**Output:** Structured review with sections:
- Summary
- Issues found (critical, warning, info)
- Suggestions for improvement
- Code snippets with explanations

---

### `/explain [code]`
Explain code in plain language.

**Aliases:** `/e`

**Arguments:**
- `code` (optional) - Code to explain. If omitted, explains selected text or current buffer.

**Examples:**
```
/explain function calculateTotal() { return a + b; }
/e "useEffect(() => { fetchData(); }, [])"
/explain
```

**Output:** Natural language explanation of what the code does, how it works, and any potential issues.

---

### `/fix [issue]`
Fix code issues automatically.

**Aliases:** `/f`

**Arguments:**
- `issue` (optional) - Description of the issue to fix. If omitted, fixes issues from last review.

**Examples:**
```
/fix memory leak in processData()
/fix "unused variable"
/fix
```

**Output:** Fixed code with explanation of changes made.

---

## File Commands

### `/file [path]`
File operations (view, copy, move, delete, rename).

**Aliases:** None

**Arguments:**
- `path` - File or directory path

**Examples:**
```
/file src/utils.ts
/file ./backup
```

**Interactive:** Opens file explorer with options to view, edit, copy, move, delete.

---

### `/ls [path]`
List files in directory.

**Aliases:** None

**Arguments:**
- `path` (optional) - Directory path. Defaults to current directory.

**Examples:**
```
ls /home/user
ls src/
ls
```

**Output:** Colorized directory listing with file sizes and modification times.

---

### `/open [file]`
Open file in editor.

**Aliases:** None

**Arguments:**
- `file` - Path to file to open

**Examples:**
```
open README.md
open src/index.tsx
```

**Behavior:** Loads file into full-screen editor with syntax highlighting.

---

### `/edit [file]`
Edit file with external editor.

**Aliases:** None

**Arguments:**
- `file` (optional) - File to edit. If omitted, edits current buffer.

**Examples:**
```
edit config.json
edit
```

**Behavior:** Opens file in configured $EDITOR or nano.

---

### `/browse`
Browse files interactively.

**Aliases:** None

**Arguments:** None

**Examples:**
```
/browse
```

**Behavior:** Opens interactive file browser with search, filtering, and preview.

---

## Git Commands

### `/git [subcommand] [args...]`
Git operations with colored output.

**Aliases:** None

**Subcommands:**
- `status` - Show working tree status
- `diff` [staged] - Show changes (staged if true)
- `log` [limit] - Show commit history (default 10)
- `add` [files...] - Stage files
- `commit` [message] - Commit staged changes
- `branch` - List branches
- `checkout` [branch] - Switch branch
- `merge` [branch] - Merge branch
- `rebase` [branch] - Rebase onto branch
- `stash` [list|save|apply|pop|drop] - Stash operations
- `bisect` [start|good|bad|reset] - Binary search for bugs
- `worktree` [add|list|remove] - Manage worktrees
- `delete-branch` [branch] - Delete branch
- `rename-branch` [old] [new] - Rename branch
- `blame` [file] - Show line-by-line authorship

**Examples:**
```
/git status
/git diff
/git log 20
/git add .
/git commit "feat: add new feature"
/git branch
/git checkout feature/new-ui
/git merge main
/git stash save "WIP"
/git stash list
/git bisect start
/git bisect bad
/git bisect good abc123
/git blame src/index.tsx
```

**Output:** Colored git output with branch names, status colors, and diff highlighting.

---

## Shell Commands

### `/sh [command]`
Execute shell command.

**Aliases:** None

**Arguments:**
- `command` - Shell command to execute

**Examples:**
```
/sh ls -la
/sh pwd
/sh echo "Hello World"
```

**Behavior:** Executes via `sh -c` supporting pipes, redirects, and shell features.

---

### `/run [file]`
Run executable file.

**Aliases:** None

**Arguments:**
- `file` - Path to executable

**Examples:**
```
run ./build/app
run script.sh
run /usr/local/bin/mytool
```

**Behavior:** Executes file directly with proper permissions.

---

### `/exec [command]`
Execute command (alias for /sh).

**Aliases:** None

**Arguments:**
- `command` - Command to execute

**Examples:**
```
exec npm run build
exec make test
```

---

## Session Commands

### `/sessions`
List all saved sessions.

**Aliases:** None

**Arguments:** None

**Examples:**
```
/sessions
```

**Output:** List of sessions with ID, title, creation date, and message count.

---

### `/load [id]`
Load a saved session.

**Aliases:** None

**Arguments:**
- `id` - Session ID to load

**Examples:**
```
load abc123def456
```

**Behavior:** Restores conversation history from saved session.

---

### `/save [name]`
Save current session.

**Aliases:** None

**Arguments:**
- `name` (optional) - Session name. If omitted, uses first message as title.

**Examples:**
```
save "Debugging session"
save
```

**Behavior:** Saves current conversation to `~/.config/ai-cli/sessions/`.

---

### `/delete [id]`
Delete a saved session.

**Aliases:** None

**Arguments:**
- `id` - Session ID to delete

**Examples:**
```
delete abc123def456
```

**Behavior:** Permanently deletes session file and removes from memory.

---

## Developer Tools

### `/json [action] [data]`
JSON utilities.

**Aliases:** None

**Actions:**
- `format` [json] - Pretty print JSON
- `minify` [json] - Compact JSON
- `validate` [json] - Check if valid JSON
- `convert` [json] [format] - Convert to yaml/toml/csv
- `query` [json] [path] - Query with JSONPath

**Examples:**
```
/json format '{"a":1,"b":2}'
/json minify '{"a": 1, "b": 2}'
/json validate '{"valid": true}'
/json convert '[{"name":"Alice"}]' csv
/json query '{"users":[{"name":"Alice"}]}' '$.users[0].name'
```

---

### `/base64 [action] [data]`
Base64 encode/decode.

**Aliases:** None

**Actions:**
- `encode` [text] - Encode to base64
- `decode` [base64] - Decode from base64
- `encode-file` [path] - Encode file contents
- `decode-file` [path] [output] - Decode to file
- `url-safe` [text] - URL-safe encoding
- `is-base64` [text] - Check if valid base64

**Examples:**
```
/base64 encode "Hello World"
/base64 decode "SGVsbG8gV29ybGQ="
/base64 encode-file image.png
/base64 decode-file encoded.b64 decoded.png
```

---

### `/hash [algorithm] [data]`
Hash data.

**Aliases:** None

**Algorithms:** `md5`, `sha1`, `sha256`, `sha512`

**Examples:**
```
/hash sha256 "hello world"
/hash md5 file.txt
/hash sha512 "secret"
```

**Output:** Hex-encoded hash digest.

---

### `/uuid [version]`
Generate UUID.

**Aliases:** None

**Versions:** `v1` (time-based), `v4` (random), `v5` (namespace)

**Examples:**
```
/uuid v4
/uuid v1
/uuid v5 "example.com"
```

**Output:** UUID string.

---

### `/regex [action] [pattern] [text]`
Regex operations.

**Aliases:** None

**Actions:**
- `match` - Find matches
- `replace` [replacement] - Replace matches
- `split` - Split by pattern
- `test` - Test if pattern matches

**Examples:**
```
/regex match "\d+" "abc123def456"
/regex replace "\s+" "-" "hello world"
/regex test "^[a-z]+$" "test123"
```

---

### `/text [action] [text]`
Text utilities.

**Aliases:** None

**Actions:**
- `upper` - Convert to uppercase
- `lower` - Convert to lowercase
- `reverse` - Reverse string
- `length` - Get string length
- `trim` - Trim whitespace
- `slug` - Convert to slug
- `count-words` - Count words
- `count-lines` - Count lines

**Examples:**
```
/text upper "hello"
/text lower "HELLO"
/text reverse "abc"
/text length "hello world"
/text slug "Hello World!"
```

---

## Network Tools

### `/http [method] [url] [body]`
Make HTTP request.

**Aliases:** None

**Methods:** `GET`, `POST`, `PUT`, `DELETE`, `PATCH`

**Examples:**
```
/http GET https://api.example.com/users
/http POST https://api.example.com/users '{"name":"Alice"}'
/http GET https://httpbin.org/headers
```

**Output:** Response status, headers, and body.

---

### `/dns [hostname]`
DNS lookup.

**Aliases:** None

**Examples:**
```
/dns example.com
/dns google.com
```

**Output:** A, AAAA, CNAME, MX, TXT, NS records.

---

### `/ping [host]`
Ping host.

**Aliases:** None

**Examples:**
```
/ping google.com
/ping 8.8.8.8
```

**Output:** Latency statistics and packet loss.

---

### `/ports [host] [ports]`
Port scan.

**Aliases:** None

**Examples:**
```
/ports localhost 80,443,3000
/ports 192.168.1.1 1-1000
```

**Output:** Open ports and services.

---

### `/ssl [hostname] [port]`
SSL/TLS certificate check.

**Aliases:** None

**Examples:**
```
/ssl example.com 443
/ssl google.com
```

**Output:** Certificate details, issuer, validity, and chain.

---

## System Commands

### `/sysinfo`
Show system information.

**Aliases:** None

**Examples:**
```
/sysinfo
```

**Output:** OS, CPU, memory, disk, uptime, load average.

---

### `/top`
Show running processes.

**Aliases:** None

**Examples:**
```
/top
```

**Behavior:** Interactive process monitor (top-like) with CPU, memory, PID, command.

---

### `/kill [pid]`
Kill process by PID.

**Aliases:** None

**Examples:**
```
/kill 1234
/kill -9 5678
```

**Arguments:** PID and optional signal (default SIGTERM).

---

### `/df`
Show disk usage.

**Aliases:** None

**Examples:**
```
/df
```

**Output:** Filesystem, size, used, available, usage%, mount point.

---

### `/free`
Show memory usage.

**Aliases:** None

**Examples:**
```
/free
```

**Output:** Total, used, free, shared, cache, available memory.

---

## File Tools

### `/tree [path]`
Show directory tree.

**Aliases:** None

**Examples:**
```
/tree src/
/tree . --max-depth 3
/tree --ignore node_modules
```

**Options:**
- `--max-depth N` - Maximum depth
- `--no-files` - Show directories only
- `--ignore PATTERN` - Ignore pattern (glob)
- `--hidden` - Show hidden files
- `--icons` - Show file icons

**Output:** ASCII tree with branch characters.

---

### `/diff [file1] [file2]`
Show diff between files.

**Aliases:** None

**Examples:**
```
/diff old.js new.js
/diff file1.txt file2.txt
```

**Output:** Unified diff with +/- lines and hunk headers.

---

### `/find [path] [pattern]`
Find files.

**Aliases:** None

**Examples:**
```
find . "*.ts"
find src/ "**/*.test.ts"
find . -name "*.log"
```

**Arguments:** Path, pattern (glob or find expression).

---

### `/grep [pattern] [path]`
Search file contents.

**Aliases:** None

**Examples:**
```
/grep "TODO" src/
/grep -r "FIXME" .
/grep "console.log" src/**/*.ts
```

**Options:** `-r` recursive, `-i` ignore case, `-n` line numbers, `-l` list files only.

**Output:** Matching lines with file:line:content format.

---

### `/du [path]`
Show directory size.

**Aliases:** None

**Examples:**
```
/du src/
/du . --max-depth 2
/du -h
```

**Options:** `-h` human-readable, `--max-depth N` depth limit.

**Output:** Size per directory.

---

### `/view [file]`
View file (read-only).

**Aliases:** None

**Examples:**
```
/view README.md
/view package.json
```

**Behavior:** Opens file in read-only viewer with syntax highlighting and paging.

---

## Plugin Commands

### `/plugins`
List installed plugins.

**Aliases:** None

**Examples:**
```
/plugins
```

**Output:** Plugin name, version, description, enabled status.

---

### `/plugin install [url]`
Install plugin from URL or git repo.

**Aliases:** None

**Examples:**
```
/plugin install https://github.com/user/plugin.git
/plugin install https://example.com/plugin.tar.gz
```

**Behavior:** Downloads and installs plugin to `~/.config/ai-cli/plugins/`.

---

### `/plugin uninstall [name]`
Uninstall plugin.

**Aliases:** None

**Examples:**
```
/plugin uninstall my-plugin
```

**Behavior:** Removes plugin from plugins directory.

---

### `/plugin enable [name]`
Enable plugin.

**Aliases:** None

**Examples:**
```
/plugin enable my-plugin
```

---

### `/plugin disable [name]`
Disable plugin.

**Aliases:** None

**Examples:**
```
/plugin disable my-plugin
```

---

## Theme Commands

### `/themes`
List available themes.

**Aliases:** None

**Examples:**
```
/themes
```

**Output:** Theme names with preview colors.

---

### `/theme [name]`
Set theme.

**Aliases:** None

**Examples:**
```
/theme dark
/theme ocean
/theme custom-mytheme
```

**Behavior:** Changes theme immediately. Persists to config.

---

## Termux Commands

### `/termux status`
Check Termux environment.

**Aliases:** None

**Examples:**
```
/termux status
```

**Output:** Termux version, API level, packages, shell profile status.

---

### `/termux setup`
Setup Termux environment.

**Aliases:** None

**Examples:**
```
/termux setup
```

**Behavior:** Installs recommended packages, configures shell profile, sets up aliases.

---

## Settings

### `/provider [name]`
Set AI provider.

**Aliases:** None

**Examples:**
```
/provider nvidia
/provider openai
/provider anthropic
/provider ollama
```

**Providers:** `nvidia`, `openai`, `anthropic`, `ollama`

---

### `/alias [name] [command]`
Create command alias.

**Aliases:** None

**Examples:**
```
/alias r /review
/alias mycmd /echo "custom command"
```

**Behavior:** Creates custom shortcut for frequently used commands.

---

### `/export [var] [value]`
Set environment variable.

**Aliases:** None

**Examples:**
```
/export PATH "/usr/local/bin:$PATH"
/export MY_VAR "value"
```

**Behavior:** Sets env var for current session and persists to config.

---

### `/env`
List environment variables.

**Aliases:** None

**Examples:**
```
/env
```

**Output:** All environment variables with values.

---

### `/clear`
Clear screen.

**Aliases:** None

**Examples:**
```
/clear
```

---

### `/help`
Show help.

**Aliases:** `/?, /h`

**Examples:**
```
/help
/?
/h
```

**Output:** This command reference or command-specific help.

---

## Command Aliases Summary

| Alias | Command |
|-------|---------|
| `r` | `/review` |
| `e` | `/explain` |
| `f` | `/fix` |
| `?`, `h` | `/help` |

---

## Tips

1. **Tab Completion:** Press Tab to autocomplete commands and file paths.
2. **Command History:** Use ↑/↓ to navigate command history.
3. **Search History:** Press Ctrl+R to search past commands.
4. **Multi-line Commands:** Use Shift+Enter for newlines in command input.
5. **Cancel:** Press Esc to cancel current operation.
6. **Help:** Type `/help <command>` for command-specific help.
