use ratatui::prelude::*;
use syntect::{
    easy::HighlightLines,
    highlighting::{FontStyle, Theme, ThemeSet},
    parsing::SyntaxSet,
};
use std::sync::OnceLock;

static SYNTAX_SET: OnceLock<SyntaxSet> = OnceLock::new();
static THEME: OnceLock<Theme> = OnceLock::new();

fn get_syntax_set() -> &'static SyntaxSet {
    SYNTAX_SET.get_or_init(|| SyntaxSet::load_defaults_newlines())
}

fn get_theme() -> &'static Theme {
    THEME.get_or_init(|| {
        let theme_set = ThemeSet::default();
        theme_set.themes["base16-ocean.dark"].clone()
    })
}

/// Parse markdown content and return a vector of ratatui::text::Line with syntax highlighting
/// for code blocks. Plain text is returned as-is.
pub fn highlight_markdown(content: &str) -> Vec<Line<'static>> {
    let mut lines = Vec::new();
    let mut in_code_block = false;
    let mut code_language = String::new();
    let mut code_content = String::new();

    for line in content.lines() {
        let trimmed = line.trim();

        if trimmed.starts_with("```") {
            if !in_code_block {
                // Entering code block
                in_code_block = true;
                code_language = trimmed[3..].trim().to_lowercase();
                code_content.clear();
            } else {
                // Exiting code block
                in_code_block = false;

                if !code_content.is_empty() {
                    if !code_language.is_empty() {
                        if let Some(highlighted) = highlight_code(&code_content, &code_language) {
                            lines.extend(highlighted);
                        } else {
                            // Fallback: plain text with markers
                            lines.push(Line::from(Span::styled(
                                format!("```{}", code_language),
                                Style::default().fg(Color::Yellow),
                            )));
                            for code_line in code_content.lines() {
                                lines.push(Line::from(Span::raw(code_line.to_string())));
                            }
                            lines.push(Line::from(Span::styled(
                                "```".to_string(),
                                Style::default().fg(Color::Yellow),
                            )));
                        }
                    } else {
                        // No language specified, treat as plain code block
                        lines.push(Line::from(Span::styled(
                            "```".to_string(),
                            Style::default().fg(Color::Yellow),
                        )));
                        for code_line in code_content.lines() {
                            lines.push(Line::from(Span::raw(code_line.to_string())));
                        }
                        lines.push(Line::from(Span::styled(
                            "```".to_string(),
                            Style::default().fg(Color::Yellow),
                        )));
                    }
                }

                code_language.clear();
                code_content.clear();
            }
        } else if in_code_block {
            code_content.push_str(line);
            code_content.push('\n');
        } else {
            // Regular text line
            lines.push(Line::from(Span::raw(line.to_string())));
        }
    }

    // Handle unclosed code block
    if in_code_block && !code_content.is_empty() {
        if !code_language.is_empty() {
            if let Some(highlighted) = highlight_code(&code_content, &code_language) {
                lines.extend(highlighted);
            } else {
                lines.push(Line::from(Span::styled(
                    format!("```{}", code_language),
                    Style::default().fg(Color::Yellow),
                )));
                for code_line in code_content.lines() {
                    lines.push(Line::from(Span::raw(code_line.to_string())));
                }
            }
        } else {
            lines.push(Line::from(Span::styled(
                "```".to_string(),
                Style::default().fg(Color::Yellow),
            )));
            for code_line in code_content.lines() {
                lines.push(Line::from(Span::raw(code_line.to_string())));
            }
        }
    }

    lines
}

fn highlight_code(code: &str, language: &str) -> Option<Vec<Line<'static>>> {
    let syntax = get_syntax_set()
        .find_syntax_by_token(language)
        .or_else(|| get_syntax_set().find_syntax_by_extension(language));

    let syntax = match syntax {
        Some(s) => s,
        None => return None,
    };

    let mut highlighter = HighlightLines::new(syntax, get_theme());
    let mut lines = Vec::new();

    for line in code.lines() {
        let mut line_spans = Vec::new();
        for (style, text) in highlighter.highlight_line(line, get_syntax_set()).ok()? {
            let mut ratatui_style = Style::default().fg(Color::Rgb(
                style.foreground.r,
                style.foreground.g,
                style.foreground.b,
            ));

            if style.font_style.contains(FontStyle::BOLD) {
                ratatui_style = ratatui_style.add_modifier(Modifier::BOLD);
            }
            if style.font_style.contains(FontStyle::ITALIC) {
                ratatui_style = ratatui_style.add_modifier(Modifier::ITALIC);
            }
            if style.font_style.contains(FontStyle::UNDERLINE) {
                ratatui_style = ratatui_style.add_modifier(Modifier::UNDERLINED);
            }

            line_spans.push(Span::styled(text.to_string(), ratatui_style));
        }
        lines.push(Line::from(line_spans));
    }

    Some(lines)
}
