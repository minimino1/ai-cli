# Command Reference

ai-cli provides 100+ slash commands organized into categories. All commands start with `/` and support tab completion.

## AI Commands

### `/review [file]`
Review code for quality, security, and best practices.

**Aliases:** `r`, `rv`

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

### `/review-context <file> [--tests] [--types] [--max N]`
Review code with imported files as context.

**Aliases:** `review-c`, `rv-c`

**Arguments:**
- `file` - Path to file to review
- `--tests` - Include test files
- `--types` - Include type definition files
- `--max N` - Maximum context files (default: 20)

**Examples:**
```
/review-context src/index.ts --tests --types --max 30
/review-c app.tsx
```

**Output:** Comprehensive review considering dependencies and related files.

---

### `/review-all <file> [--max N]`
Review code with all available context (imports, tests, types).

**Aliases:** `review-a`, `rv-a`

**Arguments:**
- `file` - Path to file to review
- `--max N` - Maximum files to include (default: 30)

**Examples:**
```
/review-all src/index.ts --max 50
/review-a app.tsx
```

**Output:** Most comprehensive review including all related files.

---

### `/explain [file]`
Explain code in plain language.

**Aliases:** `e`

**Arguments:**
- `file` (optional) - File to explain. If omitted, explains selected text or current buffer.

**Examples:**
```
/explain function calculateTotal() { return a + b; }
/e "useEffect(() => { fetchData(); }, [])"
/explain
```

**Output:** Natural language explanation of what the code does, how it works, and any potential issues.

---

### `/explain-imports <file>`
Explain code with import flow analysis.

**Aliases:** `explain-i`, `e-i`

**Arguments:**
- `file` - File to explain

**Examples:**
```
/explain-imports src/index.tsx
/e-i app.tsx
```

**Output:** Explanation including imported modules and their relationships.

---

### `/explain-flow <file>`
Explain data flow through the codebase.

**Aliases:** `explain-f`, `e-flow`

**Arguments:**
- `file` - Entry point file

**Examples:**
```
/explain-flow src/index.tsx
/e-flow main.py
```

**Output:** Data flow analysis showing how data moves between modules.

---

### `/fix [file]`
Fix code issues automatically.

**Aliases:** `f`

**Arguments:**
- `file` (optional) - File to fix. If omitted, fixes issues from last review.

**Examples:**
```
/fix memory leak in processData()
/fix "unused variable"
/fix
```

**Output:** Fixed code with explanation of changes made.

---

### `/fix-context <file> [--tests] [--types]`
Auto-fix issues with full context.

**Aliases:** `fix-c`, `auto-fix`

**Arguments:**
- `file` - File to fix
- `--tests` - Include test files as context
- `--types` - Include type definitions as context

**Examples:**
```
/fix-context src/index.ts --tests --types
/fix-c app.tsx
```

**Output:** Fixed code as unified diff.

---

## File Commands

### `/file <path>`
Show file content with syntax highlighting.

**Aliases:** `cat`

**Arguments:**
- `path` - Path to file

**Examples:**
```
/file src/index.tsx
/cat package.json
```

**Output:** File content with syntax highlighting based on file extension.

---

### `/ls [path]`
List files in directory.

**Arguments:**
- `path` (optional) - Directory path. Defaults to current directory.

**Examples:**
```
/ls /home/user
/ls src/
/ls
```

**Output:** Colorized directory listing with file sizes and modification times.

---

### `/open <file>`
Open file in editor.

**Aliases:** `view`

**Arguments:**
- `file` - Path to file to open

**Examples:**
```
/open README.md
/open src/index.tsx
```

**Behavior:** Loads file into full-screen editor with syntax highlighting.

---

### `/edit <file>`
Edit file with external editor.

**Aliases:** `e`

**Arguments:**
- `file` (optional) - File to edit. If omitted, edits current buffer.

**Examples:**
```
/edit config.json
/edit
```

**Behavior:** Opens file in configured $EDITOR or nano.

---

### `/browse [path] [--ext <ext>] [--search <query>]`
Open interactive file explorer.

**Aliases:** `b`, `files`

**Arguments:**
- `path` (optional) - Starting directory (default: current)
- `--ext <ext>` - Filter by extension (e.g., `--ext ts`)
- `--search <query>` - Search filter

**Examples:**
```
/browse src/
/b . --ext ts --search "test"
/b /home/user --search "document"
```

**Behavior:** Opens interactive file browser with search, filtering, and preview.

---

### `/tree [path] [depth]`
Show directory tree.

**Aliases:** `ls-tree`, `dir-tree`

**Arguments:**
- `path` (optional) - Directory path (default: current)
- `depth` (optional) - Maximum depth

**Examples:**
```
/tree src/
/tree . 3
/tree /var/log 2
```

**Output:** ASCII tree representation with branch characters and icons.

---

### `/diff <file1> <file2>`
Compare two files.

**Aliases:** `compare`

**Arguments:**
- `file1` - First file
- `file2` - Second file

**Examples:**
```
/diff old.js new.js
/diff file1.txt file2.txt
```

**Output:** Unified diff with +/- lines and hunk headers.

---

### `/view <file>`
View file (read-only).

**Aliases:** `cat`, `open`

**Arguments:**
- `file` - Path to file

**Examples:**
```
/view README.md
/view package.json
```

**Behavior:** Opens file in read-only viewer with syntax highlighting and paging.

---

### `/find <pattern>`
Find files by glob pattern.

**Aliases:** `search`

**Arguments:**
- `pattern` - Glob pattern (e.g., `*.ts`, `**/*.test.ts`)

**Examples:**
```
/find "*.ts"
/find "**/*.test.ts"
/find . -name "*.log"
```

**Output:** List of matching files with paths.

---

### `/grep <pattern> [path]`
Search file contents.

**Aliases:** `rg`, `search-content`

**Arguments:**
- `pattern` - Search pattern (regex)
- `path` (optional) - Directory to search (default: current)

**Examples:**
```
/grep "TODO" src/
/grep "console.log" .
/grep -r "FIXME" src/
```

**Options:** `-r` recursive, `-i` ignore case, `-n` line numbers, `-l` list files only.

**Output:** Matching lines with file:line:content format.

---

### `/du [path]`
Show disk usage for path.

**Aliases:** `disk-usage`, `size`

**Arguments:**
- `path` (optional) - Directory path (default: current)

**Examples:**
```
/du src/
/du . --max-depth 2
/du -h
```

**Options:** `-h` human-readable, `--max-depth N` depth limit.

**Output:** Size per directory in human-readable format.

---

### `/analyze <path>`
Analyze directory structure and statistics.

**Aliases:** `stats`, `dir-stats`

**Arguments:**
- `path` (optional) - Directory to analyze (default: current)

**Examples:**
```
/analyze src/
/analyze .
```

**Output:** Directory statistics including file counts, sizes, types, and largest files.

---

### `/duplicates <path>`
Find duplicate files by hash.

**Aliases:** `dup`, `find-dup`

**Arguments:**
- `path` (optional) - Directory to search (default: current)

**Examples:**
```
/duplicates .
/duplicates /home/user/Documents
```

**Output:** Groups of duplicate files with hash and wasted space calculation.

---

### `/large [path] [limit]`
Find largest files.

**Aliases:** `big`, `huge`

**Arguments:**
- `path` (optional) - Directory to search (default: current)
- `limit` (optional) - Number of files to show (default: 20)

**Examples:**
```
/large . 10
/large /var/log 50
```

**Output:** Top largest files with sizes and modification dates.

---

### `/empty-dirs [path]`
Find empty directories.

**Aliases:** `empty`, `clean`

**Arguments:**
- `path` (optional) - Directory to search (default: current)

**Examples:**
```
/empty-dirs .
/empty-dirs src/
```

**Output:** List of empty directories.

---

## Git Commands

### `/git [subcommand] [args...]`
Git operations with colored output.

**Aliases:** `g`

**Subcommands:**
- `status` - Show working tree status
- `diff` [staged] - Show changes (add `staged` for staged changes)
- `log` [N] - Show commit history (default 20)
- `add` <file>... - Stage files
- `commit` -m "msg" - Commit staged changes
- `branch` - List branches
- `checkout` <branch> - Switch branch
- `merge` <branch> - Merge branch
- `rebase` <branch> - Rebase onto branch

**Examples:**
```
/git status
/git diff
/git diff staged
/git log 50
/git add .
/git commit -m "feat: add new feature"
/git branch
/git checkout feature/new-ui
/git merge main
```

**Output:** Colored git output with branch names, status colors, and diff highlighting.

---

### `/git-stash [message]`
Create a stash with optional message.

**Aliases:** `stash`

**Arguments:**
- `message` (optional) - Stash message

**Examples:**
```
/git-stash
/git-stash "WIP: feature not complete"
```

---

### `/git-stash-list`
List all stashes.

**Aliases:** `stash-list`, `stashes`

**Examples:**
```
/git-stash-list
```

---

### `/git-stash-pop [index]`
Pop a stash (apply and remove).

**Aliases:** `stash-pop`

**Arguments:**
- `index` (optional) - Stash index (default: 0)

**Examples:**
```
/git-stash-pop
/git-stash-pop 2
```

---

### `/git-stash-drop [index]`
Drop a stash.

**Aliases:** `stash-drop`

**Arguments:**
- `index` (optional) - Stash index (default: 0)

**Examples:**
```
/git-stash-drop
/git-stash-drop 1
```

---

### `/git-stash-apply [index]`
Apply a stash without removing it.

**Aliases:** `stash-apply`

**Arguments:**
- `index` (optional) - Stash index (default: 0)

**Examples:**
```
/git-stash-apply
/git-stash-apply 0
```

---

### `/git-bisect-start [good] [bad]`
Start a bisect session.

**Aliases:** `bisect-start`

**Arguments:**
- `good` (optional) - Known good commit (default: HEAD)
- `bad` (optional) - Known bad commit

**Examples:**
```
/git-bisect-start
/git-bisect-start abc123 def456
```

---

### `/git-bisect-good`
Mark current commit as good.

**Aliases:** `bisect-good`

**Examples:**
```
/git-bisect-good
```

---

### `/git-bisect-bad`
Mark current commit as bad.

**Aliases:** `bisect-bad`

**Examples:**
```
/git-bisect-bad
```

---

### `/git-bisect-reset`
Reset bisect session.

**Aliases:** `bisect-reset`

**Examples:**
```
/git-bisect-reset
```

---

### `/git-worktree-add <path> [branch]`
Add a new worktree.

**Aliases:** `worktree-add`

**Arguments:**
- `path` - Directory for new worktree
- `branch` (optional) - Branch to checkout

**Examples:**
```
/git-worktree-add ../feature-branch
/git-worktree-add /tmp/test main
```

---

### `/git-worktree-list`
List all worktrees.

**Aliases:** `worktree-list`, `worktrees`

**Examples:**
```
/git-worktree-list
```

---

### `/git-worktree-remove <path>`
Remove a worktree.

**Aliases:** `worktree-remove`

**Arguments:**
- `path` - Worktree directory to remove

**Examples:**
```
/git-worktree-remove ../feature-branch
```

---

### `/git-rebase-i <commit>`
Start interactive rebase.

**Aliases:** `rebase-i`, `git-rebase-interactive`

**Arguments:**
- `commit` - Commit to rebase (default: HEAD~10)

**Examples:**
```
/git-rebase-i HEAD~5
/git-rebase-i abc123
```

---

### `/git-blame <file>`
Show line-by-line blame for a file.

**Aliases:** `blame`

**Arguments:**
- `file` - File to blame

**Examples:**
```
/git-blame src/index.tsx
```

**Output:** Each line with author, date, and commit.

---

### `/git-blame-summary <file>`
Show blame summary by author.

**Aliases:** `blame-summary`

**Arguments:**
- `file` - File to analyze

**Examples:**
```
/git-blame-summary src/index.tsx
```

**Output:** Summary grouped by author with line counts.

---

### `/git-blame-range <file> <since> [until]`
Show blame for a date range.

**Aliases:** `blame-range`

**Arguments:**
- `file` - File to blame
- `since` - Start date (ISO or relative)
- `until` (optional) - End date (default: now)

**Examples:**
```
/git-blame-range src/index.tsx "2024-01-01"
/git-blame-range app.tsx "2 weeks ago" "1 week ago"
```

---

### `/git-log-graph [--limit N] [--since date] [--author name] [--grep pattern]`
Show git log with ASCII graph.

**Aliases:** `git-log-graph`, `log-graph`

**Arguments:**
- `--limit N` - Limit number of commits
- `--since date` - Show commits since date
- `--author name` - Filter by author
- `--grep pattern` - Filter by message pattern

**Examples:**
```
/git-log-graph --limit 30
/git-log-graph --since "1 week ago" --author "John"
```

**Output:** Graphical commit history with branches.

---

### `/git-log-stats [limit]`
Show git log with statistics (insertions/deletions).

**Aliases:** `log-stats`

**Arguments:**
- `limit` (optional) - Number of commits (default: 20)

**Examples:**
```
/git-log-stats 50
```

**Output:** Commit history with file change statistics.

---

### `/git-stats`
Show repository statistics.

**Aliases:** `repo-stats`, `git-repo-stats`

**Examples:**
```
/git-stats
```

**Output:** Total commits, authors, files, lines of code, first/last commit.

---

### `/git-contributors`
Show contributor statistics.

**Aliases:** `contributors`, `git-contribs`

**Examples:**
```
/git-contributors
```

**Output:** Contributors sorted by commit count with percentages.

---

### `/git-hotspots [n]`
Show most changed files (hotspots).

**Aliases:** `hotspots`, `git-hotspots`

**Arguments:**
- `n` (optional) - Number of files to show (default: 10)

**Examples:**
```
/git-hotspots 20
```

**Output:** Files with most commits/changes, indicating areas of high activity.

---

### `/git-branch-health`
Check branch health (ahead/behind).

**Aliases:** `branch-health`, `branch-status`

**Examples:**
```
/git-branch-health
```

**Output:** Branch status relative to upstream with ahead/behind counts.

---

### `/git-activity [days]`
Show recent activity summary.

**Aliases:** `activity`, `git-activity`

**Arguments:**
- `days` (optional) - Number of days to analyze (default: 7)

**Examples:**
```
/git-activity 30
/git-activity
```

**Output:** Commits per day, top contributors, most changed files.

---

### `/git-ownership`
Show code ownership by author.

**Aliases:** `ownership`, `code-ownership`

**Examples:**
```
/git-ownership
```

**Output:** File ownership percentages by author.

---

## Shell Commands

### `/sh <command>`
Execute shell command.

**Aliases:** `!`, `shell`

**Arguments:**
- `command` - Shell command to execute

**Examples:**
```
/sh ls -la
/sh pwd
/sh echo "Hello World"
/sh "git status && git log --oneline -5"
```

**Behavior:** Executes via `sh -c` supporting pipes, redirects, and shell features.

---

### `/run <file>`
Run executable file.

**Aliases:** `r`

**Arguments:**
- `file` - Path to executable

**Examples:**
```
/run ./build/app
/run script.sh
/run /usr/local/bin/mytool
```

**Behavior:** Executes file directly with proper permissions. Supports compiled languages (C, C++, Go, Rust, Java) with automatic compilation if needed.

---

### `/exec <language> <code>`
Execute code snippet (experimental).

**Aliases:** `x`

**Arguments:**
- `language` - Programming language (python, node, ruby, etc.)
- `code` - Code to execute

**Examples:**
```
/exec python "print('hello')"
/exec node "console.log('hi')"
/exec ruby "puts 'hello'"
```

**Behavior:** Executes code in specified language interpreter.

---

## Session Commands

### `/sessions`
List all saved sessions.

**Aliases:** `ls-sessions`, `session-list`

**Examples:**
```
/sessions
```

**Output:** List of sessions with ID, title, creation date, and message count.

---

### `/load <session-id>`
Load a saved session.

**Aliases:** `restore`

**Arguments:**
- `session-id` - Session ID to load

**Examples:**
```
/load abc123def456
```

**Behavior:** Restores conversation history from saved session.

---

### `/save [title]`
Save current session.

**Aliases:** `save-session`

**Arguments:**
- `title` (optional) - Session name. If omitted, uses first message as title.

**Examples:**
```
/save "Debugging session"
/save
```

**Behavior:** Saves current conversation to `~/.config/ai-cli/sessions/`.

---

### `/delete <session-id>`
Delete a saved session.

**Aliases:** `rm-session`, `del-session`

**Arguments:**
- `session-id` - Session ID to delete

**Examples:**
```
/delete abc123def456
```

**Behavior:** Permanently deletes session file and removes from memory.

---

## Developer Tools

### `/json <action> <data>`
JSON utilities.

**Actions:**
- `format` <json> - Pretty print JSON
- `minify` <json> - Compact JSON
- `validate` <json> - Check if valid JSON
- `convert` <json> <format> - Convert to yaml/toml/csv
- `query` <json> <path> - Query with JSONPath

**Examples:**
```
/json format '{"a":1,"b":2}'
/json minify '{"a": 1, "b": 2}'
/json validate '{"valid": true}'
/json convert '[{"name":"Alice"}]' csv
/json query '{"users":[{"name":"Alice"}]}' '$.users[0].name'
```

---

### `/base64 <action> <data>`
Base64 encode/decode.

**Actions:**
- `encode` <text> - Encode to base64
- `decode` <base64> - Decode from base64
- `encode-file` <path> - Encode file contents
- `decode-file` <path> <output> - Decode to file
- `url-safe` <text> - URL-safe encoding
- `is-base64` <text> - Check if valid base64

**Examples:**
```
/base64 encode "Hello World"
/base64 decode "SGVsbG8gV29ybGQ="
/base64 encode-file image.png
/base64 decode-file encoded.b64 decoded.png
```

---

### `/hash <algorithm> <data>`
Hash data.

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

**Versions:** `v1` (time-based), `v4` (random), `v5` (namespace)

**Examples:**
```
/uuid v4
/uuid v1
/uuid v5 "example.com"
```

**Output:** UUID string.

---

### `/regex <action> <pattern> <text>`
Regex operations.

**Actions:**
- `match` - Find matches
- `replace` <replacement> - Replace matches
- `split` - Split by pattern
- `test` - Test if pattern matches

**Examples:**
```
/regex match "\d+" "abc123def456"
/regex replace "\s+" "-" "hello world"
/regex test "^[a-z]+$" "test123"
```

---

### `/text <action> <text>`
Text utilities.

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

### `/http <method> <url> [--header key=val] [--body <body>] [--timeout <ms>] [--verbose]`
Make HTTP request.

**Aliases:** `curl`

**Methods:** `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`

**Arguments:**
- `method` - HTTP method
- `url` - Target URL
- `--header key=val` - Custom header (can be repeated)
- `--body <body>` - Request body
- `--timeout <ms>` - Timeout in milliseconds
- `--verbose` - Show detailed output
- `--auth <user:pass>` - Basic authentication

**Examples:**
```
/http GET https://api.example.com/users
/http POST https://api.example.com/users '{"name":"Alice"}' --header "Content-Type=application/json"
/http GET https://httpbin.org/headers --verbose
/http GET https://api.example.com --auth user:pass
```

**Output:** Response status, headers, and body.

---

### `/dns <domain> [type=A] [--doh]`
DNS lookup.

**Types:** `A`, `AAAA`, `MX`, `NS`, `TXT`, `CNAME`, `SOA`, `PTR`

**Arguments:**
- `domain` - Domain name to lookup
- `type` (optional) - Record type (default: A)
- `--doh` - Use DNS-over-HTTPS

**Examples:**
```
/dns example.com
/dns google.com AAAA
/dns example.com MX
/dns example.com TXT --doh
```

**Output:** DNS records with TTL and values.

---

### `/ping <host> [count=5]`
Ping host.

**Arguments:**
- `host` - Hostname or IP address
- `count` (optional) - Number of pings (default: 5)

**Examples:**
```
/ping google.com
/ping 8.8.8.8 10
```

**Output:** Latency statistics and packet loss.

---

### `/ports <host> [start-end|--common] [--timeout <ms>] [--verbose]`
Scan ports on host.

**Aliases:** `scan`

**Arguments:**
- `host` - Hostname or IP address
- `start-end` or `--common` - Port range or common ports
- `--timeout <ms>` - Timeout per port (default: 5000)
- `--verbose` - Show all ports, not just open

**Examples:**
```
/ports example.com 1-1000
/ports example.com --common
/ports 192.168.1.1 80,443,3000
/ports localhost 1-65535 --timeout 2000 --verbose
```

**Output:** Open ports with service detection.

---

### `/ssl <host> [port=443] [--expiry] [--verify] [--verbose]`
Check SSL certificate.

**Aliases:** `tls`, `cert`

**Arguments:**
- `host` - Hostname
- `port` (optional) - Port number (default: 443)
- `--expiry` - Show only expiry info
- `--verify` - Verify certificate chain
- `--verbose` - Detailed output

**Examples:**
```
/ssl example.com
/ssl google.com 443 --verbose
/ssl example.com --expiry
/ssl example.com --verify
```

**Output:** Certificate details, issuer, validity dates, chain.

---

### `/curl <url> [--header key=val] [--timeout <ms>]`
Like curl - fetch URL (GET with verbose).

**Aliases:** (alias for `/http GET` with verbose)

**Arguments:**
- `url` - URL to fetch
- `--header key=val` - Custom header
- `--timeout <ms>` - Timeout

**Examples:**
```
/curl https://api.example.com/data
/curl https://example.com --header "Accept=application/json"
```

---

### `/traceroute <host> [max-hops=30]`
Trace network path to host.

**Aliases:** `tr`

**Arguments:**
- `host` - Destination host
- `max-hops` (optional) - Maximum hops (default: 30)

**Examples:**
```
/traceroute google.com
/traceroute 8.8.8.8 20
```

**Output:** Hop-by-hop route with latency.

---

## System Commands

### `/sysinfo`
Display full system information.

**Aliases:** `info`, `system`

**Examples:**
```
/sysinfo
```

**Output:** OS, CPU, memory, disk, uptime, load average, network interfaces.

---

### `/top [n]`
Show top processes.

**Aliases:** `ps`

**Arguments:**
- `n` (optional) - Number of processes (default: 10)
- Add `mem` to sort by memory: `/top mem`

**Examples:**
```
/top
/top 20
/top mem
```

**Output:** PID, USER, NAME, %CPU, %MEM for top processes.

---

### `/kill <pid> [signal]`
Kill a process by PID.

**Aliases:** `killproc`

**Arguments:**
- `pid` - Process ID
- `signal` (optional) - Signal to send (default: SIGTERM)

**Examples:**
```
/kill 1234
/kill 5678 SIGKILL
/kill 9999 -9
```

**Output:** Success or error message.

---

### `/df`
Show disk usage.

**Aliases:** `disks`, `mounts`

**Examples:**
```
/df
```

**Output:** Filesystem, size, used, available, use%, mount point for all mounted filesystems.

---

### `/free`
Show memory usage.

**Aliases:** `mem`, `memory`

**Examples:**
```
/free
```

**Output:** Total, used, free, shared, cache, available memory and swap.

---

### `/uptime`
Show system uptime.

**Aliases:** `up`

**Examples:**
```
/uptime
```

**Output:** Uptime in human-readable format.

---

### `/netstat`
Show network interfaces.

**Aliases:** `ifconfig`, `interfaces`

**Examples:**
```
/netstat
```

**Output:** Interface name, IP address, MAC address, status.

---

### `/monitor [interval]`
Real-time system monitoring.

**Aliases:** `mon`, `stats`

**Arguments:**
- `interval` (optional) - Update interval in ms (default: 2000)

**Examples:**
```
/monitor
/monitor 1000
/monitor 5000
```

**Behavior:** Continuously updates CPU, memory, disk, and network stats. Press Ctrl+C to stop.

---

### `/ps [sort]`
List all processes.

**Aliases:** `processes`

**Arguments:**
- `sort` (optional) - Sort by `cpu` or `mem` (default: cpu)

**Examples:**
```
/ps
/ps mem
/ps cpu
```

**Output:** PID, USER, NAME, %CPU, %MEM, STATE for all processes.

---

### `/pstree`
Show process tree.

**Aliases:** `ptree`

**Examples:**
```
/pstree
```

**Output:** Hierarchical tree of all processes showing parent-child relationships.

---

## Settings & Utility Commands

### `/provider [name]`
Switch AI provider.

**Aliases:** `model`

**Arguments:**
- `name` (optional) - Provider name. If omitted, shows available providers.

**Examples:**
```
/provider nvidia
/provider openai
/provider anthropic
/provider ollama
```

**Output:** Confirmation of provider switch or list of available providers.

---

### `/theme [name]`
Switch theme.

**Arguments:**
- `name` (optional) - Theme name. If omitted, shows current theme.

**Examples:**
```
/theme dark
/theme ocean
/theme midnight
```

**Behavior:** Changes theme immediately and persists to config.

---

### `/themes`
List available themes.

**Examples:**
```
/themes
```

**Output:** All built-in and custom themes with preview colors.

---

### `/plugins`
List installed plugins.

**Aliases:** `pl`, `plugin-list`

**Examples:**
```
/plugins
```

**Output:** Plugin name, version, description, enabled/disabled status, load status.

---

### `/plugin <subcommand> [args...]`
Plugin management.

**Subcommands:**
- `install` <url|path> - Install plugin from URL or local path
- `uninstall` <name> - Uninstall plugin
- `enable` <name> - Enable plugin
- `disable` <name> - Disable plugin
- `info` <name> - Show plugin information
- `reload` [name] - Reload plugin (or all if no name)

**Examples:**
```
/plugin install https://github.com/user/plugin.git
/plugin install ~/my-plugin.ts
/plugin enable weather
/plugin disable my-plugin
/plugin info weather
/plugin reload
/plugin reload weather
```

---

### `/alias <name>=<command>`
Create command alias.

**Arguments:**
- `name=command` - Alias definition

**Examples:**
```
/alias r=/review
/alias mycmd=/echo "custom command"
/alias ll=/ls -la
```

**Behavior:** Creates custom shortcut for frequently used commands. Aliases are session-only.

---

### `/export <key>=<value>`
Set environment variable.

**Aliases:** `set`

**Arguments:**
- `key=value` - Environment variable assignment

**Examples:**
```
/export PATH="/usr/local/bin:$PATH"
/export MY_VAR="value"
/export API_KEY="secret123"
```

**Behavior:** Sets env var for current session and persists to config if it's a known config key.

---

### `/env`
List environment variables.

**Examples:**
```
/env
```

**Output:** All environment variables with values (filtered to remove internal ones).

---

### `/history`
Show command history.

**Examples:**
```
/history
```

**Output:** List of previously executed commands with indices.

---

### `/clear`
Clear screen.

**Aliases:** `cls`

**Examples:**
```
/clear
```

**Behavior:** Clears the terminal screen.

---

### `/help [command]`
Show help.

**Aliases:** `h`, `?`

**Arguments:**
- `command` (optional) - Command to get help for

**Examples:**
```
/help
/?
/h
/help review
/help git
```

**Output:** General command list or command-specific help.

---

### `/cd [path]`
Change working directory.

**Aliases:** `chdir`

**Arguments:**
- `path` (optional) - Directory path (default: HOME)

**Examples:**
```
/cd /home/user
/cd ..
/cd src/
```

**Output:** Confirmation of directory change.

---

### `/pwd`
Print current working directory.

**Examples:**
```
/pwd
```

**Output:** Absolute path of current working directory.

---

### `/sh <command>`
Execute shell command (also see `/sh` above).

**Aliases:** `!`, `shell`

---

### `/run <file>`
Execute code file (also see `/run` above).

**Aliases:** `r`

---

## File Management Commands (Summary)

| Command | Alias | Description |
|---------|-------|-------------|
| `/file` | `cat` | Show file with syntax highlighting |
| `/ls` | - | List directory contents |
| `/open` | `view` | Open file in viewer |
| `/edit` | `e` | Edit file in external editor |
| `/browse` | `b` | Interactive file explorer |
| `/tree` | - | Directory tree view |
| `/diff` | - | Compare two files |
| `/view` | - | Read-only file viewer |
| `/find` | - | Find files by pattern |
| `/grep` | `rg` | Search file contents |
| `/du` | - | Disk usage analysis |
| `/analyze` | - | Directory analysis |
| `/duplicates` | `dup` | Find duplicate files |
| `/large` | `big` | Find largest files |
| `/empty-dirs` | `empty` | Find empty directories |

---

## Git Commands (Summary)

| Command | Alias | Description |
|---------|-------|-------------|
| `/git status` | - | Show working tree status |
| `/git diff` | - | Show changes |
| `/git diff staged` | - | Show staged changes |
| `/git log` | - | Commit history |
| `/git log-graph` | - | Graphical commit history |
| `/git log-stats` | - | Commit history with stats |
| `/git add` | - | Stage files |
| `/git commit` | - | Commit changes |
| `/git branch` | - | List branches |
| `/git checkout` | - | Switch branch |
| `/git merge` | - | Merge branch |
| `/git rebase` | - | Rebase branch |
| `/git-stash` | `stash` | Create stash |
| `/git-stash-list` | - | List stashes |
| `/git-stash-pop` | - | Pop stash |
| `/git-stash-apply` | - | Apply stash |
| `/git-stash-drop` | - | Drop stash |
| `/git-bisect-start` | - | Start bisect |
| `/git-bisect-good` | - | Mark as good |
| `/git-bisect-bad` | - | Mark as bad |
| `/git-bisect-reset` | - | Reset bisect |
| `/git-worktree-add` | - | Add worktree |
| `/git-worktree-list` | - | List worktrees |
| `/git-worktree-remove` | - | Remove worktree |
| `/git-rebase-i` | - | Interactive rebase |
| `/git-blame` | `blame` | Line-by-line blame |
| `/git-blame-summary` | - | Blame summary by author |
| `/git-blame-range` | - | Blame for date range |
| `/git-stats` | - | Repository statistics |
| `/git-contributors` | - | Contributor stats |
| `/git-hotspots` | - | Most changed files |
| `/git-branch-health` | - | Branch health check |
| `/git-activity` | - | Recent activity |
| `/git-ownership` | - | Code ownership |

---

## Network Commands (Summary)

| Command | Alias | Description |
|---------|-------|-------------|
| `/http` | `curl` | HTTP request |
| `/dns` | - | DNS lookup |
| `/ping` | - | Ping host |
| `/ports` | `scan` | Port scanner |
| `/ssl` | `tls`, `cert` | SSL certificate check |
| `/traceroute` | `tr` | Trace network path |

---

## System Commands (Summary)

| Command | Alias | Description |
|---------|-------|-------------|
| `/sysinfo` | `info`, `system` | Full system information |
| `/top` | `ps` | Top processes |
| `/kill` | `killproc` | Kill process |
| `/df` | `disks`, `mounts` | Disk usage |
| `/free` | `mem`, `memory` | Memory usage |
| `/uptime` | `up` | System uptime |
| `/netstat` | `ifconfig` | Network interfaces |
| `/monitor` | `mon`, `stats` | Real-time monitoring |
| `/ps` | `processes` | List all processes |
| `/pstree` | `ptree` | Process tree |

---

## Termux Commands

### `/termux-status`
Show Termux status and environment information.

**Aliases:** `termux`, `termux-info`

**Examples:**
```
/termux-status
```

**Output:** Termux version, home dir, data dir, storage access, installed packages.

---

### `/termux-setup [--install] [--configure]`
Run Termux setup wizard.

**Aliases:** `termux-wizard`, `termux-init`

**Arguments:**
- `--install` - Install recommended packages
- `--configure` - Configure shell profile

**Examples:**
```
/termux-setup
/termux-setup --install --configure
```

**Behavior:** Installs dependencies, configures PATH, sets up shell integration and aliases.

---

### `/termux-install <package>`
Install a package using pkg.

**Aliases:** `pkg-install`, `t-install`

**Arguments:**
- `package` - Package name to install

**Examples:**
```
/termux-install python
/termux-install nodejs
```

---

### `/termux-packages`
List installed packages.

**Aliases:** `pkg-list`, `packages`

**Examples:**
```
/termux-packages
```

**Output:** List of installed Termux packages.

---

### `/termux-copy <text>`
Copy text to clipboard.

**Aliases:** `copy`, `t-copy`

**Arguments:**
- `text` - Text to copy

**Examples:**
```
/termux-copy "Hello World"
/termux-copy $OUTPUT_VAR
```

---

### `/termux-paste`
Paste text from clipboard.

**Aliases:** `paste`, `t-paste`

**Examples:**
```
/termux-paste
```

**Output:** Clipboard contents.

---

### `/termux-storage`
Setup storage access (grant permission).

**Aliases:** `storage`, `t-storage`

**Examples:**
```
/termux-storage
```

**Behavior:** Requests storage permission and sets up storage directory.

---

### `/termux-properties`
Show Termux properties and environment.

**Aliases:** `termux-props`, `t-props`

**Examples:**
```
/termux-properties
```

**Output:** Detailed Termux environment information.

---

### `/termux-integration`
Setup shell integration (aliases, completion).

**Aliases:** `termux-shell`, `t-integrate`

**Examples:**
```
/termux-integration
```

**Behavior:** Adds shell aliases and completion scripts to shell profile.

---

### `/termux-aliases`
Setup useful aliases.

**Aliases:** `t-aliases`

**Examples:**
```
/termux-aliases
```

**Behavior:** Adds common aliases to shell profile.

---

### `/termux-clipboard-info`
Show clipboard tool information.

**Aliases:** `clipboard-info`, `t-clip-info`

**Examples:**
```
/termux-clipboard-info
```

**Output:** Clipboard tool status and configuration.

---

### `/termux-quick-setup`
Quick setup: install deps, configure shell, add aliases.

**Aliases:** `t-quick`, `termux-all`

**Examples:**
```
/termux-quick-setup
```

**Behavior:** Runs all setup steps in sequence.

---

## Command Aliases Summary

### Global Aliases

| Alias | Command |
|-------|---------|
| `r` | `/review` |
| `e` | `/explain` |
| `f` | `/fix` |
| `?` | `/help` |
| `h` | `/help` |
| `!` | `/sh` |
| `b` | `/browse` |
| `cat` | `/file` |
| `view` | `/open` |
| `rg` | `/grep` |
| `pl` | `/plugins` |
| `g` | `/git` |
| `mc` | `/monitor` |

### AI Commands

| Alias | Command |
|-------|---------|
| `rv` | `/review` |
| `review-c` | `/review-context` |
| `review-a` | `/review-all` |
| `e-i` | `/explain-imports` |
| `e-flow` | `/explain-flow` |
| `fix-c` | `/fix-context` |

### Git Commands

| Alias | Command |
|-------|---------|
| `stash` | `/git-stash` |
| `stash-list` | `/git-stash-list` |
| `stash-pop` | `/git-stash-pop` |
| `stash-apply` | `/git-stash-apply` |
| `stash-drop` | `/git-stash-drop` |
| `bisect-start` | `/git-bisect-start` |
| `bisect-good` | `/git-bisect-good` |
| `bisect-bad` | `/git-bisect-bad` |
| `bisect-reset` | `/git-bisect-reset` |
| `worktree-add` | `/git-worktree-add` |
| `worktree-list` | `/git-worktree-list` |
| `worktree-remove` | `/git-worktree-remove` |
| `rebase-i` | `/git-rebase-i` |
| `blame` | `/git-blame` |
| `blame-summary` | `/git-blame-summary` |
| `blame-range` | `/git-blame-range` |
| `log-graph` | `/git-log-graph` |
| `log-stats` | `/git-log-stats` |

### File Commands

| Alias | Command |
|-------|---------|
| `ls-tree` | `/tree` |
| `dir-tree` | `/tree` |
| `search` | `/find` |
| `search-content` | `/grep` |
| `disk-usage` | `/du` |
| `size` | `/du` |
| `stats` | `/analyze` |
| `dir-stats` | `/analyze` |
| `dup` | `/duplicates` |
| `find-dup` | `/duplicates` |
| `big` | `/large` |
| `huge` | `/large` |
| `empty` | `/empty-dirs` |
| `clean` | `/empty-dirs` |

### System Commands

| Alias | Command |
|-------|---------|
| `info` | `/sysinfo` |
| `system` | `/sysinfo` |
| `killproc` | `/kill` |
| `disks` | `/df` |
| `mounts` | `/df` |
| `mem` | `/free` |
| `memory` | `/free` |
| `up` | `/uptime` |
| `ifconfig` | `/netstat` |
| `interfaces` | `/netstat` |
| `mon` | `/monitor` |
| `stats` | `/monitor` |
| `processes` | `/ps` |
| `ptree` | `/pstree` |

### Termux Commands

| Alias | Command |
|-------|---------|
| `termux` | `/termux-status` |
| `termux-info` | `/termux-status` |
| `termux-wizard` | `/termux-setup` |
| `termux-init` | `/termux-setup` |
| `pkg-install` | `/termux-install` |
| `pkg-list` | `/termux-packages` |
| `packages` | `/termux-packages` |
| `copy` | `/termux-copy` |
| `t-copy` | `/termux-copy` |
| `paste` | `/termux-paste` |
| `t-paste` | `/termux-paste` |
| `storage` | `/termux-storage` |
| `t-storage` | `/termux-storage` |
| `termux-props` | `/termux-properties` |
| `t-props` | `/termux-properties` |
| `termux-shell` | `/termux-integration` |
| `t-integrate` | `/termux-integration` |
| `t-aliases` | `/termux-aliases` |
| `clipboard-info` | `/termux-clipboard-info` |
| `t-clip-info` | `/termux-clipboard-info` |
| `t-quick` | `/termux-quick-setup` |
| `termux-all` | `/termux-quick-setup` |

### Plugin Commands

| Alias | Command |
|-------|---------|
| `pl` | `/plugins` |
| `plugin-list` | `/plugins` |
| `ls-sessions` | `/sessions` |
| `session-list` | `/sessions` |
| `restore` | `/load` |
| `save-session` | `/save` |
| `rm-session` | `/delete` |
| `del-session` | `/delete` |

---

## Tips

1. **Tab Completion:** Press Tab to autocomplete commands and file paths.
2. **Command History:** Use ↑/↓ to navigate command history.
3. **Search History:** Press Ctrl+R to search past commands.
4. **Multi-line Commands:** Use Shift+Enter for newlines in command input.
5. **Cancel:** Press Esc to cancel current operation.
6. **Help:** Type `/help <command>` for command-specific help.
7. **Batch Operations:** Many commands support multiple files: `/git add file1.ts file2.ts file3.ts`
8. **Piping:** Use `/sh` for complex shell operations: `/sh "git status && git log --oneline -5"`
9. **Context Commands:** Use `/review-context` and `/review-all` for comprehensive code reviews with dependencies.
10. **Termux:** On Android, run `/termux-quick-setup` for one-command setup.

---

## Command Categories Overview

| Category | Commands | Description |
|----------|----------|-------------|
| **AI** | 11 | Code review, explanation, fixing with context |
| **Files** | 14 | File operations, browsing, search, analysis |
| **Git** | 32 | Full git workflow including advanced operations |
| **Shell** | 3 | Command and code execution |
| **Sessions** | 4 | Save, load, manage conversation sessions |
| **Dev Tools** | 8 | JSON, base64, hash, UUID, regex, text utilities |
| **Network** | 7 | HTTP, DNS, ping, ports, SSL, traceroute |
| **System** | 10 | System info, processes, monitoring |
| **Plugins** | 6 | Plugin management |
| **Themes** | 2 | Theme switching and listing |
| **Termux** | 12 | Android/Termux integration |
| **Settings** | 11 | Configuration, aliases, environment |

**Total: 100+ commands**

---

## Getting Help

- **Command list:** `/help`
- **Command-specific help:** `/help <command>`
- **Full documentation:** See `docs/` directory
- **Issues:** https://github.com/minimino1/ai-cli/issues
- **Discord:** [Join our Discord](https://discord.gg/ai-cli)
