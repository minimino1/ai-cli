# Command Reference

This document provides a complete reference for all slash commands available in ai-cli.

## Command Categories

Commands are organized into the following categories:

- **AI Commands** - Interact with AI providers
- **File Commands** - Browse, view, and edit files
- **Git Commands** - Git operations
- **Shell Commands** - Execute shell commands and code
- **Session Commands** - Manage chat sessions
- **Editor Commands** - Editor and environment controls

## Command Syntax

```
/command [arguments] [options]
```

- Commands are case-insensitive
- Use Tab for autocomplete
- Some commands have aliases (shorter versions)

---

## AI Commands

### `/review` (alias: `rv`)

Review code for issues, bugs, and best practices.

**Syntax:**
```
/review [file]
```

**Arguments:**
- `file` (optional) - Path to file to review. If omitted, reviews the last code block in chat.

**Examples:**
```
/review src/app.tsx
/review
```

**Description:**
Sends the specified file (or last code block) to the AI for comprehensive code review. The AI analyzes for:
- Potential bugs and errors
- Security vulnerabilities
- Performance issues
- Code style and best practices
- Suggestions for improvement

---

### `/explain` (alias: `e`)

Explain how code works.

**Syntax:**
```
/explain [file]
```

**Arguments:**
- `file` (optional) - Path to file to explain. If omitted, explains the last code block in chat.

**Examples:**
```
/explain src/commands.ts
/explain
```

**Description:**
Requests the AI to provide a detailed explanation of the specified code. The explanation includes:
- Overall purpose and functionality
- Line-by-line breakdown
- Key concepts and patterns used
- Potential edge cases

---

### `/fix` (alias: `f`)

Fix issues in code.

**Syntax:**
```
/fix [file]
```

**Arguments:**
- `file` (optional) - Path to file to fix. If omitted, fixes the last code block in chat.

**Examples:**
```
/fix src/utils/validation.ts
/fix
```

**Description:**
Asks the AI to identify and fix problems in the code. Returns corrected code with explanations of changes made.

---

### `/provider` (alias: `model`)

Switch AI provider or model.

**Syntax:**
```
/provider [provider] [model]
```

**Arguments:**
- `provider` (optional) - Provider ID: `nvidia`, `openai`, `anthropic`, `ollama`
- `model` (optional) - Model name for the selected provider

**Examples:**
```
/provider openai
/provider anthropic claude-3-sonnet
/provider
```

**Description:**
Switches the active AI provider. Without arguments, shows current provider and available options. With provider only, switches to that provider's default model. With both arguments, switches provider and sets the specified model.

**Note:** Provider must be configured in `~/.config/ai-cli/config.json` with appropriate API keys.

---

## File Commands

### `/file` (alias: `cat`)

Show file content with syntax highlighting.

**Syntax:**
```
/file <file>
```

**Arguments:**
- `file` (required) - Path to file to display

**Examples:**
```
/file package.json
/file src/app.tsx
```

**Description:**
Displays the contents of the specified file with syntax highlighting based on file extension. The file content is shown in a scrollable view with line numbers.

---

### `/open` (alias: `view`)

View file content (read-only).

**Syntax:**
```
/open <file>
```

**Arguments:**
- `file` (required) - Path to file to view

**Examples:**
```
/open README.md
/open src/types.ts
```

**Description:**
Similar to `/file` but optimized for quick viewing. Opens the file in a dedicated viewer pane.

---

### `/edit`

Open file in full-screen editor.

**Syntax:**
```
/edit <file>
```

**Arguments:**
- `file` (required) - Path to file to edit

**Examples:**
```
/edit src/commands.ts
/edit config.json
```

**Description:**
Opens the specified file in the built-in full-screen editor. The editor supports:
- Vim-like keybindings (optional)
- Syntax highlighting
- Search functionality
- Save and discard changes

**Editor Controls:**
- `Ctrl+S` - Save changes
- `Ctrl+Q` - Quit without saving
- `Ctrl+F` - Search
- `Arrow keys` - Navigate

---

### `/ls`

List files in directory.

**Syntax:**
```
/ls [path]
```

**Arguments:**
- `path` (optional) - Directory path to list. Defaults to current working directory.

**Examples:**
```
/ls
/ls src/
/ls /home/user/projects
```

**Description:**
Lists files and directories in the specified path. Shows file sizes, modification dates, and permissions (where available). Directories are marked with a trailing `/`.

---

### `/browse` (aliases: `b`, `files`)

Open interactive file explorer to select files.

**Syntax:**
```
/browse [path] [--ext <ext>] [--search <query>]
```

**Arguments:**
- `path` (optional) - Starting directory. Defaults to current working directory.
- `--ext <ext>` - Filter by file extension (e.g., `--ext ts`, `--ext js,tsx`)
- `--search <query>` - Filter by filename containing query string

**Examples:**
```
/browse
/browse src/
/browse --ext ts,tsx
/browse --search component
/browse src/ --ext tsx --search Button
```

**Description:**
Opens an interactive file browser where you can:
- Navigate directories with arrow keys
- Filter files by extension or search query
- Select files to use with other commands
- Press Enter to choose a file
- Press Escape to cancel

**File Explorer Controls:**
- `Arrow Up/Down` - Navigate file list
- `Arrow Left/Right` - Navigate directories (when focused on path)
- `Enter` - Select file
- `Escape` - Close browser
- `/` - Start typing to filter

---

### `/cd` (alias: `chdir`)

Change working directory.

**Syntax:**
```
/cd [path]
```

**Arguments:**
- `path` (optional) - Directory path. If omitted, changes to home directory.

**Examples:**
```
/cd /home/user/projects
/cd src/
/cd ..
/cd
```

**Description:**
Changes the current working directory for subsequent commands. Affects relative paths in other commands. Without arguments, changes to the home directory.

---

### `/pwd`

Print current working directory.

**Syntax:**
```
/pwd
```

**Arguments:**
None

**Examples:**
```
/pwd
```

**Description:**
Displays the absolute path of the current working directory.

---

## Git Commands

### `/git` (alias: `g`)

Execute git commands.

**Syntax:**
```
/git <subcommand> [args...]
```

**Subcommands:**
- `status` - Show working tree status
- `diff` - Show changes (use `diff HEAD` for staged + unstaged)
- `log` - Show commit history
- `add` - Add files to staging
- `commit` - Commit staged changes
- `branch` - List or create branches
- `checkout` - Switch branches
- `pull` - Pull from remote
- `push` - Push to remote
- `clone` - Clone a repository
- `init` - Initialize repository

**Examples:**
```
/git status
/git diff HEAD
/git log --oneline -10
/git add src/
/git commit -m "feat: add new feature"
/git branch
/git checkout feature-branch
/git pull origin main
/git push
```

**Description:**
Executes git commands from within ai-cli. Output is formatted and displayed in the chat. Common workflows:

1. **Check status**: `/git status`
2. **Review changes**: `/git diff HEAD`
3. **Stage files**: `/git add <file>`
4. **Commit**: `/git commit -m "message"`
5. **Push**: `/git push`

**Note:** Git commands run in the current working directory. Ensure you're in a git repository.

---

## Shell Commands

### `/sh` (aliases: `!`, `shell`)

Execute shell command.

**Syntax:**
```
/sh <command>
```

**Arguments:**
- `command` (required) - Shell command to execute

**Examples:**
```
/sh ls -la
/sh npm install
/sh ps aux | grep node
/sh echo $PATH
```

**Description:**
Executes an arbitrary shell command and displays the output. Useful for:
- Running system commands
- Checking processes
- File operations
- Package management
- Any command-line tool

**Note:** Commands run in the current working directory. Use absolute paths for clarity.

---

### `/run` (alias: `r`)

Execute a code file.

**Syntax:**
```
/run <file> [args...]
```

**Arguments:**
- `file` (required) - Path to executable file
- `args` (optional) - Arguments to pass to the program

**Examples:**
```
/run script.py
/run app.js --port 3000
/run main.go
/run Cargo.toml  # Runs cargo if in Rust project
```

**Description:**
Executes a code file using the appropriate interpreter or runtime. ai-cli auto-detects the language based on file extension:

| Extension | Interpreter |
|-----------|-------------|
| `.py` | `python` or `python3` |
| `.js` | `node` |
| `.ts` | `tsx` or `bun` |
| `.go` | `go run` |
| `.rs` | `cargo run` (if Cargo.toml exists) |
| `.rb` | `ruby` |
| `.php` | `php` |
| `.sh` | `bash` |
| `.lua` | `lua` |

**Note:** The interpreter must be in your PATH.

---

### `/exec` (alias: `x`)

Execute code snippet (experimental).

**Syntax:**
```
/exec <language> <code>
```

**Arguments:**
- `language` (required) - Programming language identifier
- `code` (required) - Code to execute

**Examples:**
```
/exec python print("Hello, World!")
/exec js console.log("Hello")
/exec bash echo $HOME
```

**Description:**
Executes a code snippet directly without creating a file. Useful for quick tests and experiments.

**Supported Languages:**
- `python` / `py`
- `javascript` / `js`
- `typescript` / `ts`
- `bash` / `sh`
- `go`
- `ruby` / `rb`
- `php`
- `lua`

**Note:** This feature is experimental and may have security implications. Only execute trusted code.

---

## Session Commands

### `/sessions` (aliases: `ls-sessions`, `session-list`)

List all saved sessions.

**Syntax:**
```
/sessions
```

**Arguments:**
None

**Examples:**
```
/sessions
```

**Description:**
Displays a list of all saved chat sessions with:
- Session ID
- Title (if saved with `/save`)
- Creation date
- Message count
- Duration

Sessions are auto-saved every 60 seconds and on exit to `~/.local/share/ai-cli/sessions/`.

---

### `/save` (alias: `save-session`)

Save current chat session.

**Syntax:**
```
/save [title]
```

**Arguments:**
- `title` (optional) - Custom title for the session

**Examples:**
```
/save
/save "Debugging API issue"
/save "React component design"
```

**Description:**
Saves the current chat session to disk. If no title is provided, uses a timestamp-based title. Saved sessions can be restored later with `/load`.

**Storage Location:**
`~/.local/share/ai-cli/sessions/`

---

### `/load` (alias: `restore`)

Load a saved session by ID.

**Syntax:**
```
/load <session-id>
```

**Arguments:**
- `session-id` (required) - Session ID from `/sessions` list

**Examples:**
```
/load abc123def456
```

**Description:**
Restores a previously saved session, loading all chat messages and context. The current session is saved automatically before loading a new one.

**Note:** Session IDs are shown in the `/sessions` list.

---

### `/delete` (aliases: `rm-session`, `del-session`)

Delete a saved session.

**Syntax:**
```
/delete <session-id>
```

**Arguments:**
- `session-id` (required) - Session ID to delete

**Examples:**
```
/delete abc123def456
```

**Description:**
Permanently deletes a saved session from disk. Cannot be undone. Use `/sessions` to list available session IDs.

---

## Editor & Environment Commands

### `/clear` (alias: `cls`)

Clear chat history.

**Syntax:**
```
/clear
```

**Arguments:**
None

**Examples:**
```
/clear
```

**Description:**
Clears all messages from the current chat session. The session remains active but all previous context is removed. Useful for starting fresh without creating a new session.

**Note:** This does not delete saved sessions; it only clears the current chat view.

---

### `/history`

Show command history.

**Syntax:**
```
/history
```

**Arguments:**
None

**Examples:**
```
/history
```

**Description:**
Displays a list of recently executed slash commands. Shows command, arguments, and timestamp. Use arrow keys (Up/Down) in the input field to navigate history.

---

### `/alias`

Create command alias.

**Syntax:**
```
/alias name=command
```

**Arguments:**
- `name=command` (required) - Alias definition

**Examples:**
```
/alias rv=/review
/alias py=/run *.py
/alias gs=/git status
```

**Description:**
Creates a custom alias for frequently used commands. Aliases are saved in the config file and persist across sessions.

**Note:** Aliases are simple text substitutions. Complex aliases with arguments may not work as expected.

---

### `/env`

Show environment variables.

**Syntax:**
```
/env
```

**Arguments:**
None

**Examples:**
```
/env
```

**Description:**
Displays all environment variables that ai-cli can see. Useful for debugging API key configuration and PATH issues.

**Note:** Sensitive values like API keys are masked with `***` for security.

---

### `/export` (alias: `set`)

Set environment variable.

**Syntax:**
```
/export KEY=value
```

**Arguments:**
- `KEY=value` (required) - Environment variable to set

**Examples:**
```
/export OPENAI_API_KEY=sk-...
/export DEBUG=true
```

**Description:**
Sets an environment variable for the current session. Variables set this way are not persisted after exit. For permanent configuration, use the config file or shell profile.

**Note:** API keys set via `/export` override config file settings for the current session only.

---

## Command Aliases Summary

| Command | Aliases |
|---------|---------|
| `/help` | `h`, `?` |
| `/file` | `cat` |
| `/review` | `rv` |
| `/explain` | `e` |
| `/fix` | `f` |
| `/edit` | `e` |
| `/provider` | `model` |
| `/git` | `g` |
| `/sh` | `!`, `shell` |
| `/run` | `r` |
| `/exec` | `x` |
| `/open` | `view` |
| `/cd` | `chdir` |
| `/export` | `set` |
| `/browse` | `b`, `files` |
| `/sessions` | `ls-sessions`, `session-list` |
| `/save` | `save-session` |
| `/load` | `restore` |
| `/delete` | `rm-session`, `del-session` |
| `/clear` | `cls` |

---

## Tips & Best Practices

1. **Use Tab autocomplete**: Start typing `/` and press Tab to see matching commands.
2. **Review before fixing**: Use `/review` first to understand issues before `/fix`.
3. **Save important sessions**: Use `/save` with a descriptive title for important work.
4. **Configure providers**: Set up your AI provider in config before heavy usage.
5. **Use `/browse` for files**: It's faster than typing full paths manually.
6. **Git workflow**: `/git status` → `/git diff` → `/git add` → `/git commit` → `/git push`.
7. **Shell commands**: Use `/sh` for quick system checks; use `/run` for executing code files.
8. **Session management**: Sessions auto-save every 60s, but manually save important ones.
9. **Keyboard shortcuts**: `Ctrl+B` toggles sidebar for more chat space.
10. **Provider switching**: Use `/provider` to switch between AI models for different tasks.

---

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| `Provider not configured` | No API key in config | Add provider to `~/.config/ai-cli/config.json` |
| `File not found` | Invalid path | Check path with `/ls` or `/pwd` |
| `Permission denied` | No read/write access | Use `chmod` or run with appropriate permissions |
| `Command not found` | Invalid command | Use `/help` to see available commands |
| `Not a git repository` | Not in a git repo | `cd` to a git repository or run `/git init` |
| `Interpreter not found` | Language runtime not in PATH | Install the required runtime (python, node, etc.) |
| `API error` | Invalid API key or network issue | Check API key, internet connection, provider status |
