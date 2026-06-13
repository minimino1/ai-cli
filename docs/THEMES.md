# Theme Guide

ai-cli features a flexible theming system with 7 built-in themes and full support for custom themes. Themes control all colors used throughout the TUI.

## Built-in Themes

### dark (Default)
Dark background with blue accents. Optimized for low-light environments.

```
Background: #0d1117
Foreground: #c9d1d9
Primary: #58a6ff
Secondary: #8b949e
Accent: #f78166
Error: #f85149
Warning: #d29922
Success: #3fb950
Info: #58a6ff
```

**Usage:** `/theme dark`

---

### light
Light background with dark text. Great for bright environments or printing.

```
Background: #ffffff
Foreground: #1f2328
Primary: #0969da
Secondary: #6e7781
Accent: #cf222e
Error: #cf222e
Warning: #9a6700
Success: #1a7f37
Info: #0969da
```

**Usage:** `/theme light`

---

### midnight
Deep blue/black with purple accents. Easy on the eyes at night.

```
Background: #0d1117
Foreground: #c9d1d9
Primary: #58a6ff
Secondary: #bc8cff
Accent: #ff7b72
Error: #ff7b72
Warning: #d29922
Success: #3fb950
Info: #58a6ff
```

**Usage:** `/theme midnight`

---

### ocean
Teal and cyan ocean colors. Calming and refreshing.

```
Background: #0b1622
Foreground: #a0c4e4
Primary: #48bb78
Secondary: #4299e1
Accent: #9f7aea
Error: #fc8181
Warning: #f6ad55
Success: #48bb78
Info: #4299e1
```

**Usage:** `/theme ocean`

---

### forest
Green nature theme. Earthy and organic.

```
Background: #0a1a0a
Foreground: #a8d5a8
Primary: #68d391
Secondary: #4fd1c5
Accent: #b794f4
Error: #fc8181
Warning: #f6e05e
Success: #68d391
Info: #4fd1c5
```

**Usage:** `/theme forest`

---

### sunset
Orange and purple sunset gradient. Warm and vibrant.

```
Background: #1a0a0a
Foreground: #f5d0a9
Primary: #f6ad55
Secondary: #ed8936
Accent: #d69e2e
Error: #e53e3e
Warning: #f6ad55
Success: #48bb78
Info: #4299e1
```

**Usage:** `/theme sunset`

---

### neon
Bright neon on black. High contrast, cyberpunk style.

```
Background: #0a0a0a
Foreground: #00ff00
Primary: #ff00ff
Secondary: #00ffff
Accent: #ffff00
Error: #ff0000
Warning: #ffaa00
Success: #00ff00
Info: #00ffff
```

**Usage:** `/theme neon`

---

## Theme Structure

Themes are JSON files with this complete structure:

```json
{
  "name": "custom-theme",
  "colors": {
    "primary": "#58a6ff",
    "secondary": "#8b949e",
    "accent": "#f78166",
    "error": "#f85149",
    "warning": "#d29922",
    "success": "#3fb950",
    "info": "#56b6c2",
    "text": "#eeeeee",
    "textMuted": "#808080",
    "background": "#0a0a0a",
    "backgroundPanel": "#141414",
    "backgroundElement": "#1e1e1e",
    "backgroundMenu": "#1e1e1e",
    "border": "#484848",
    "borderActive": "#606060",
    "borderSubtle": "#3c3c3c",
    "diffAdded": "#4fd6be",
    "diffAddedBg": "#20303b",
    "diffRemoved": "#c53b53",
    "diffRemovedBg": "#37222c",
    "diffContext": "#828bb8",
    "diffHighlightAdded": "#b8db87",
    "diffHighlightRemoved": "#e26a75",
    "reviewError": "#e06c75",
    "reviewWarning": "#f5a742",
    "reviewInfo": "#56b6c2",
    "reviewSuggestion": "#9d7cd8"
  },
  "styles": {
    "bold": true,
    "italic": true,
    "underline": true
  }
}
```

### Color Roles Reference

| Color Role | Usage | Example |
|------------|-------|---------|
| `primary` | Primary actions, links, highlights | Command names, active items |
| `secondary` | Secondary text, less important elements | Descriptions, subtitles |
| `accent` | Special highlights, call-to-action | Buttons, important badges |
| `error` | Error messages, validation failures | Error text, failed operations |
| `warning` | Warnings, cautions | Warning messages |
| `success` | Success messages, positive indicators | Success confirmations |
| `info` | Informational messages, hints | Info boxes, tips |
| `text` | Default text color | Body text, normal content |
| `textMuted` | Disabled text, placeholders | Dimmed text, hints |
| `background` | Main background | App background |
| `backgroundPanel` | Panel backgrounds | Sidebar, panels |
| `backgroundElement` | Element backgrounds | Input fields, cards |
| `backgroundMenu` | Menu backgrounds | Dropdowns, context menus |
| `border` | Borders, dividers | Panel borders, separators |
| `borderActive` | Active/focused borders | Focused input borders |
| `borderSubtle` | Subtle borders | Inner borders, dividers |
| `diffAdded` | Added lines in diffs | Green diff lines |
| `diffAddedBg` | Background for added lines | Diff added line background |
| `diffRemoved` | Removed lines in diffs | Red diff lines |
| `diffRemovedBg` | Background for removed lines | Diff removed line background |
| `diffContext` | Context lines in diffs | Gray diff context lines |
| `diffHighlightAdded` | Highlighted additions | Important added code |
| `diffHighlightRemoved` | Highlighted removals | Important removed code |
| `reviewError` | Review error severity | Critical review issues |
| `reviewWarning` | Review warning severity | Warning review issues |
| `reviewInfo` | Review info severity | Informational review notes |
| `reviewSuggestion` | Review suggestion severity | Suggestions for improvement |

### Styles

The `styles` object controls text styling defaults:

```json
{
  "styles": {
    "bold": true,
    "italic": true,
    "underline": true
  }
}
```

---

## Creating Custom Themes

### 1. Create theme file

Location: `~/.config/ai-cli/themes/my-theme.json`

```json
{
  "name": "my-theme",
  "description": "My custom theme",
  "colors": {
    "background": "#1a1a1a",
    "foreground": "#e0e0e0",
    "primary": "#00ff00",
    "secondary": "#0088ff",
    "accent": "#ff00ff",
    "error": "#ff4444",
    "warning": "#ffaa00",
    "success": "#44ff44",
    "info": "#4444ff",
    "muted": "#888888",
    "border": "#333333",
    "header": "#222222",
    "highlight": "#2a2a2a",
    "selection": "#004400"
  }
}
```

**Note:** The theme file uses `foreground` as an alias for `text` for compatibility. Both work.

### 2. Validate theme

```bash
# Check JSON is valid
jq . ~/.config/ai-cli/themes/my-theme.json

# Test theme in ai-cli
/theme my-theme
```

### 3. Share theme

```bash
# Copy to other machines
scp ~/.config/ai-cli/themes/my-theme.json user@host:~/.config/ai-cli/themes/

# Or share via gist/github
```

---

## Theme Development Tips

### Start from existing theme

Copy a built-in theme and modify:

```bash
# Find built-in themes (in source)
ls /usr/share/ai-cli/themes/  # if installed system-wide

# Or copy from config after using a theme
cp ~/.config/ai-cli/config.json ~/.config/ai-cli/themes/my-theme.json
# Edit my-theme.json
```

### Use color picker tools

- https://colorpicker.me/
- https://coolors.co/
- https://paletton.com/
- https://www.colorhexa.com/

### Test contrast ratios

Ensure text is readable:
- Normal text: contrast ratio ≥ 4.5:1
- Large text: contrast ratio ≥ 3:1
- Tools: https://webaim.org/resources/contrastchecker/

### Consider terminal limitations

- Not all terminals support true color (24-bit)
- Fallback to 256-color or 16-color if needed
- Test in different terminals (kitty, alacritty, iTerm2, Windows Terminal)
- Enable true color: `export COLORTERM=truecolor`

### Use semantic color names

Don't hardcode colors in components. Use theme roles:

```typescript
// Good
const style = {
  color: theme.colors.foreground,
  background: theme.colors.background,
  border: theme.colors.border,
}

// Bad
const style = {
  color: "#c9d1d9",  // Hardcoded
}
```

---

## Theme API

### Access theme in components

```typescript
import { useTheme } from '../theme'

function MyComponent() {
  const theme = useTheme()

  return <Text color={theme.colors.primary}>Hello</Text>
}
```

### Theme context

Themes are provided via React context at app root. All components can access via `useTheme()`.

### Theme Manager API

```typescript
import { getTheme, setTheme, listThemes, createCustomTheme } from '../theme'

// Get theme by name
const theme = getTheme('dark')

// Set current theme
await setTheme('ocean')

// List all available themes
const themes = listThemes()
// Returns: [{ name: 'dark', type: 'builtin' }, { name: 'my-theme', type: 'custom' }]

// Create custom theme programmatically
await createCustomTheme('my-theme', {
  primary: '#ff00ff',
  background: '#1a1a1a',
})
```

---

## Theme Previews

### Preview in terminal

```bash
# Show all built-in themes
for theme in dark light midnight ocean forest sunset neon; do
  echo "=== $theme ==="
  ai-cli --theme "$theme" --preview 2>/dev/null || echo "Preview not available"
done
```

### Generate preview image

```bash
# Capture theme preview
ai-cli --theme ocean --preview | tee theme-preview.txt
```

---

## Theme Distribution

### Share as single file

```json
// my-theme.json
{
  "name": "my-theme",
  "colors": { ... }
}
```

Users install:
```
# Copy to themes directory
cp my-theme.json ~/.config/ai-cli/themes/

# Or use /plugin install for theme plugins
```

### Package as plugin

Create a plugin that installs theme:

`manifest.json`:
```json
{
  "name": "theme-my-theme",
  "version": "1.0.0",
  "description": "My custom theme",
  "ai-cli": {
    "commands": [
      {
        "name": "install-theme",
        "description": "Install my theme",
        "run": "installTheme"
      }
    ]
  }
}
```

`index.ts`:
```typescript
export default {
  manifest: {
    name: 'theme-my-theme',
    version: '1.0.0',
  },

  onLoad: async (ctx) => {
    // Theme file is bundled in plugin
    // Copy to ~/.config/ai-cli/themes/
  },
}
```

---

## Theme Troubleshooting

### Theme not applying
- Check theme name matches filename (without .json)
- Validate JSON: `jq . ~/.config/ai-cli/themes/theme-name.json`
- Restart ai-cli after adding theme files
- Check permissions: `chmod 644 ~/.config/ai-cli/themes/*.json`

### Colors look wrong
- Terminal may not support true color
- Set `COLORTERM=truecolor` in shell
- Test with: `echo -e "\e[38;2;255;0;0mRed\e[0m"`
- Use 256-color palette as fallback

### Theme breaks UI
- Missing required color roles
- Invalid hex color format (use #RRGGBB)
- Check logs: `~/.config/ai-cli/logs/`

---

## Color Palette Reference

### Built-in palette (darkScale)

The `darkScale` palette provides consistent shades:

```typescript
const darkScale = {
  50: "#f6f8fa",
  100: "#eaeef2",
  200: "#d0d7de",
  300: "#afb8c1",
  400: "#8b949e",
  500: "#6e7681",
  600: "#57606a",
  700: "#424a53",
  800: "#30363d",
  900: "#21262d",
  950: "#0d1117",
};
```

Use these for muted, border, header colors.

---

## Theme Examples

### High contrast theme

```json
{
  "name": "high-contrast",
  "colors": {
    "background": "#000000",
    "foreground": "#ffffff",
    "primary": "#00ff00",
    "secondary": "#ffff00",
    "accent": "#ff00ff",
    "error": "#ff0000",
    "warning": "#ffaa00",
    "success": "#00ff00",
    "info": "#00aaff",
    "muted": "#888888",
    "border": "#ffffff",
    "header": "#000000",
    "highlight": "#333333",
    "selection": "#005500"
  }
}
```

### Solarized-inspired

```json
{
  "name": "solarized",
  "colors": {
    "background": "#002b36",
    "foreground": "#839496",
    "primary": "#268bd2",
    "secondary": "#586e75",
    "accent": "#cb4b16",
    "error": "#dc322f",
    "warning": "#b58900",
    "success": "#859900",
    "info": "#2aa198",
    "muted": "#657b83",
    "border": "#073642",
    "header": "#002b36",
    "highlight": "#073642",
    "selection": "#004055"
  }
}
```

### Monochrome

```json
{
  "name": "mono",
  "colors": {
    "background": "#000000",
    "foreground": "#ffffff",
    "primary": "#cccccc",
    "secondary": "#888888",
    "accent": "#ffffff",
    "error": "#ff0000",
    "warning": "#ffff00",
    "success": "#00ff00",
    "info": "#00aaff",
    "muted": "#444444",
    "border": "#666666",
    "header": "#111111",
    "highlight": "#222222",
    "selection": "#444444"
  }
}
```

---

## Contributing Themes

Submit your theme to the official collection:

1. Create theme following this guide
2. Test in multiple terminals
3. Add to `src/themes/` in ai-cli repo
4. Submit PR with:
   - Theme file
   - Screenshot
   - Description
   - Attribution (if not yours)

---

## Resources

- **Color schemes:** https://github.com/chriskempson/base16
- **Terminal colors:** https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
- **Contrast checkers:** https://webaim.org/resources/contrastchecker/
- **Color pickers:** https://colorpicker.me/, https://coolors.co/
- **Terminal palettes:** https://github.com/mbadolato/iTerm2-Color-Schemes
- **True color test:** https://gist.github.com/XVilka/8346728

---

## Getting Help

- **Built-in themes:** `/themes`
- **Apply theme:** `/theme <name>`
- **Issues:** https://github.com/minimino1/ai-cli/issues
- **Discord:** [Join our Discord](https://discord.gg/ai-cli)
