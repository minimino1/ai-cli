use ratatui::prelude::*;
use ratatui::widgets::*;

use super::app::{ActivePanel, App};
use super::diff::render_diff as render_diff_content;
use super::help;
use super::theme::Theme;

// OpenCode border characters
const SPLIT_BORDER_VERTICAL: &str = "┃";
const PROMPT_CORNER: &str = "╹";

pub fn render(f: &mut Frame, app: &mut App) {
    let area = f.area();

    // Root: horizontal split (main + sidebar)
    let root_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Min(50),   // Main content
            Constraint::Length(42), // Sidebar (OpenCode: 42px)
        ])
        .split(area);

    // Main content column
    render_main_content(f, app, root_chunks[0]);

    // Sidebar
    render_sidebar(f, app, root_chunks[1]);
}

fn render_main_content(f: &mut Frame, app: &mut App, area: Rect) {
    let theme = &app.current_theme.clone();

    // Main column: vertical (messages + prompt + footer)
    // Padding: left=2, right=2, bottom=1, gap=1
    let inner_area = Rect {
        x: area.x + 2,
        y: area.y,
        width: area.width.saturating_sub(4),
        height: area.height.saturating_sub(1),
    };

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Min(5),    // Messages (scrollbox)
            Constraint::Length(3), // Prompt input
            Constraint::Length(1), // Footer
        ])
        .split(inner_area);

    // Messages area
    match app.active_panel {
        ActivePanel::Chat => render_messages(f, app, chunks[0]),
        ActivePanel::FileExplorer => render_file_explorer(f, app, chunks[0]),
        ActivePanel::CommandPalette => render_command_palette(f, app, chunks[0]),
        ActivePanel::History => render_history(f, app, chunks[0]),
        ActivePanel::DiffViewer => render_diff_viewer(f, app, chunks[0]),
    }

    // Prompt input
    render_prompt(f, app, chunks[1]);

    // Footer
    render_footer(f, app, chunks[2]);

    // Help overlay
    if app.show_help {
        help::render_help_overlay(f, area);
    }
}

fn render_messages(f: &mut Frame, app: &App, area: Rect) {
    let theme = &app.current_theme;

    let messages: Vec<ListItem> = {
        let mut items = Vec::new();

        // Top spacer (OpenCode: height=1)
        items.push(ListItem::new(Line::from("")));

        for (idx, msg) in app.messages.iter().enumerate() {
            let (border_color, role_icon) = if msg.role == "You" {
                (theme.primary, "▸")
            } else if msg.role == "Error" {
                (theme.error, "✗")
            } else {
                (theme.success, "●")
            };

            // OpenCode: marginTop=1 for all except first
            if idx > 0 {
                items.push(ListItem::new(Line::from("")));
            }

            // Message with left border (OpenCode: border=["left"], SplitBorder)
            // paddingLeft=2 for inner content
            if msg.highlighted_lines.is_empty() {
                let line = Line::from(vec![
                    Span::styled(format!("{} ", role_icon), Style::default().fg(border_color)),
                    Span::styled(&msg.content, Style::default().fg(theme.text)),
                ]);
                items.push(ListItem::new(line));
            } else {
                // First line
                let mut first_spans = vec![
                    Span::styled(format!("{} ", role_icon), Style::default().fg(border_color)),
                ];
                first_spans.extend(msg.highlighted_lines[0].spans.clone());
                items.push(ListItem::new(Line::from(first_spans)));

                // Remaining lines with indent (paddingLeft=3 in OpenCode)
                for line in msg.highlighted_lines.iter().skip(1) {
                    let mut line_spans = vec![Span::raw("   ")];
                    line_spans.extend(line.spans.clone());
                    items.push(ListItem::new(Line::from(line_spans)));
                }
            }
        }

        items
    };

    let messages_list = List::new(messages).block(
        Block::default()
            .borders(Borders::LEFT)
            .border_style(Style::default().fg(theme.border)),
    );

    f.render_widget(messages_list, area);
}

fn render_prompt(f: &mut Frame, app: &App, area: Rect) {
    let theme = &app.current_theme;

    // Prompt with left border (OpenCode style)
    let block = Block::default()
        .borders(Borders::LEFT)
        .border_style(Style::default().fg(theme.border))
        .style(Style::default().bg(theme.background_element));

    let input_text = if app.input.is_empty() {
        Span::styled(
            "Ask anything...",
            Style::default().fg(theme.text_muted),
        )
    } else {
        Span::styled(&app.input, Style::default().fg(theme.text))
    };

    let input = Paragraph::new(input_text)
        .block(block)
        .style(Style::default().bg(theme.background_element));

    f.render_widget(input, area);

    // Cursor
    if !app.input.is_empty() {
        f.set_cursor_position((area.x + app.cursor_position as u16 + 1, area.y + 1));
    }

    // Bottom decorative border (OpenCode: height=1, horizontal="▀")
    let bottom_area = Rect {
        x: area.x,
        y: area.y + area.height - 1,
        width: area.width,
        height: 1,
    };
    let bottom_border = Paragraph::new(" ")
        .style(Style::default().bg(theme.background_element));
    f.render_widget(bottom_border, bottom_area);
}

fn render_footer(f: &mut Frame, app: &App, area: Rect) {
    let theme = &app.current_theme;

    let footer_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Min(20),   // Left: status/cwd
            Constraint::Length(30), // Right: tokens + indicators
        ])
        .split(area);

    // Left: status message
    let status_text = if let Some(ref saved_msg) = app.session_saved_message {
        saved_msg.clone()
    } else if app.is_loading {
        "● Thinking...".to_string()
    } else {
        app.status_message.clone()
    };

    let status = Paragraph::new(format!(" {} ", status_text))
        .style(Style::default().fg(theme.text_muted));
    f.render_widget(status, footer_chunks[0]);

    // Right: tokens + model info
    let right_text = format!(
        "tok:{} {} ",
        app.token_count,
        app.config.default_model
    );
    let right = Paragraph::new(right_text)
        .style(Style::default().fg(theme.text_muted))
        .alignment(Alignment::Right);
    f.render_widget(right, footer_chunks[1]);
}

fn render_sidebar(f: &mut Frame, app: &App, area: Rect) {
    let theme = &app.current_theme;

    // Sidebar with background (OpenCode: backgroundColor=backgroundPanel)
    let sidebar_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),  // Title
            Constraint::Min(5),    // Content
            Constraint::Length(3), // Footer
        ])
        .split(area);

    // Title slot
    let title = Paragraph::new(" ai-cli ")
        .style(Style::default().fg(theme.primary).add_modifier(Modifier::BOLD));
    f.render_widget(title, sidebar_chunks[0]);

    // Content: quick actions + files
    let content_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(7), // Quick actions
            Constraint::Min(3),   // Files
        ])
        .split(sidebar_chunks[1]);

    // Quick actions (OpenCode style)
    let actions = vec![
        ListItem::new(Line::from(vec![
            Span::styled(" f ", Style::default().fg(theme.accent).add_modifier(Modifier::BOLD)),
            Span::styled("Fix code", Style::default().fg(theme.text)),
        ])),
        ListItem::new(Line::from(vec![
            Span::styled(" e ", Style::default().fg(theme.accent).add_modifier(Modifier::BOLD)),
            Span::styled("Explain", Style::default().fg(theme.text)),
        ])),
        ListItem::new(Line::from(vec![
            Span::styled(" c ", Style::default().fg(theme.accent).add_modifier(Modifier::BOLD)),
            Span::styled("Commit", Style::default().fg(theme.text)),
        ])),
        ListItem::new(Line::from(vec![
            Span::styled(" r ", Style::default().fg(theme.accent).add_modifier(Modifier::BOLD)),
            Span::styled("Review", Style::default().fg(theme.text)),
        ])),
        ListItem::new(Line::from(vec![
            Span::styled(" t ", Style::default().fg(theme.accent).add_modifier(Modifier::BOLD)),
            Span::styled("Test", Style::default().fg(theme.text)),
        ])),
    ];

    let actions_list = List::new(actions)
        .block(
            Block::default()
                .title(" Quick ")
                .borders(Borders::ALL)
                .border_style(Style::default().fg(theme.border)),
        )
        .highlight_style(Style::default().fg(theme.primary));

    f.render_widget(actions_list, content_chunks[0]);

    // Files
    let files: Vec<ListItem> = app
        .files
        .iter()
        .take(8)
        .enumerate()
        .map(|(i, file)| {
            let icon = if file.is_dir { " " } else { " " };
            let style = if i == app.file_selected {
                Style::default().fg(theme.primary)
            } else {
                Style::default().fg(theme.text)
            };

            ListItem::new(Line::from(vec![
                Span::raw(format!("{} ", icon)),
                Span::styled(&file.name, style),
            ]))
        })
        .collect();

    let files_list = List::new(files).block(
        Block::default()
            .title(" Files ")
            .borders(Borders::ALL)
            .border_style(Style::default().fg(theme.border)),
    );
    f.render_widget(files_list, content_chunks[1]);

    // Footer (version + status)
    let footer_text = Paragraph::new(" v0.1.0")
        .style(Style::default().fg(theme.text_muted));
    f.render_widget(footer_text, sidebar_chunks[2]);
}

fn render_file_explorer(f: &mut Frame, app: &App, area: Rect) {
    let theme = &app.current_theme;
    let items: Vec<ListItem> = app
        .files
        .iter()
        .enumerate()
        .map(|(i, file)| {
            let icon = if file.is_dir { " " } else { " " };
            let style = if i == app.file_selected {
                Style::default().fg(theme.primary)
            } else {
                Style::default().fg(theme.text)
            };

            ListItem::new(Line::from(vec![
                Span::raw(format!("{} ", icon)),
                Span::styled(&file.name, style),
            ]))
        })
        .collect();

    let files_list = List::new(items)
        .block(
            Block::default()
                .title(" Files ")
                .borders(Borders::ALL)
                .border_style(Style::default().fg(theme.border)),
        )
        .highlight_style(Style::default().fg(theme.primary));

    f.render_widget(files_list, area);
}

fn render_command_palette(f: &mut Frame, app: &App, area: Rect) {
    let theme = &app.current_theme;
    let items: Vec<ListItem> = app
        .commands
        .iter()
        .enumerate()
        .map(|(i, cmd)| {
            let style = if i == app.command_selected {
                Style::default().fg(theme.primary)
            } else {
                Style::default().fg(theme.text)
            };

            ListItem::new(Line::from(Span::styled(cmd, style)))
        })
        .collect();

    let commands_list = List::new(items)
        .block(
            Block::default()
                .title(" Commands ")
                .borders(Borders::ALL)
                .border_style(Style::default().fg(theme.border)),
        )
        .highlight_style(Style::default().fg(theme.primary));

    f.render_widget(commands_list, area);
}

fn render_history(f: &mut Frame, app: &App, area: Rect) {
    let theme = &app.current_theme;
    let items: Vec<ListItem> = app
        .history
        .iter()
        .enumerate()
        .map(|(i, cmd)| {
            let style = if i == app.history_selected {
                Style::default().fg(theme.primary)
            } else {
                Style::default().fg(theme.text)
            };

            ListItem::new(Line::from(Span::styled(cmd, style)))
        })
        .collect();

    let history_list = if items.is_empty() {
        List::new(vec![ListItem::new(Line::from(Span::styled(
            "No history",
            Style::default().fg(theme.text_muted),
        )))])
    } else {
        List::new(items)
    }
    .block(
        Block::default()
            .title(" History ")
            .borders(Borders::ALL)
            .border_style(Style::default().fg(theme.border)),
    );

    f.render_widget(history_list, area);
}

fn render_diff_viewer(f: &mut Frame, app: &App, area: Rect) {
    let theme = &app.current_theme;
    if app.diffs.is_empty() {
        let empty = Paragraph::new("No diffs")
            .alignment(Alignment::Center)
            .block(
                Block::default()
                    .title(" Diff ")
                    .borders(Borders::ALL)
                    .border_style(Style::default().fg(theme.border)),
            );
        f.render_widget(empty, area);
        return;
    }

    let current_diff = &app.diffs[app.current_diff_index];
    let file_info = current_diff.file_path.as_deref().unwrap_or("unknown");
    let stats = format!(
        "+{} -{}",
        current_diff.additions_count(),
        current_diff.deletions_count()
    );
    let title = format!(" {} ({}) ", file_info, stats);

    let block = Block::default()
        .title(title)
        .borders(Borders::ALL)
        .border_style(Style::default().fg(theme.border));

    let inner_area = block.inner(area);
    f.render_widget(block, area);

    render_diff_content(current_diff, inner_area, f.buffer_mut(), app.diff_scroll);

    // Navigation hints
    let hint_area = Rect {
        x: area.x,
        y: area.y + area.height - 1,
        width: area.width,
        height: 1,
    };
    let hints = Paragraph::new(" n/p: diff  j/k: scroll  Esc: back")
        .style(Style::default().fg(theme.text_muted));
    f.render_widget(hints, hint_area);
}
