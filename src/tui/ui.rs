use ratatui::prelude::*;
use ratatui::widgets::*;

use super::app::{ActivePanel, App};
use super::diff::render_diff as render_diff_content;
use super::help;
use super::theme::Theme;

pub fn render(f: &mut Frame, app: &mut App) {
    let area = f.area();

    // Main layout: vertical (header + content + footer)
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1),  // Header
            Constraint::Min(10),   // Main content
            Constraint::Length(1),  // Footer/Status bar
        ])
        .split(area);

    // Render header
    render_header(f, app, chunks[0]);

    // Render main content - horizontal split (main + sidebar)
    render_main_content(f, app, chunks[1]);

    // Render footer/status bar
    render_footer(f, app, chunks[2]);

    // Render help overlay if shown
    if app.show_help {
        help::render_help_overlay(f, area);
    }
}

fn render_header(f: &mut Frame, app: &App, area: Rect) {
    let theme = &app.current_theme;

    let header_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage(33),
            Constraint::Percentage(34),
            Constraint::Percentage(33),
        ])
        .split(area);

    // Left: provider
    let provider = Paragraph::new(format!(" {}", app.config.default_provider))
        .style(Style::default().fg(theme.primary));
    f.render_widget(provider, header_chunks[0]);

    // Center: title
    let title = Paragraph::new("ai-cli")
        .style(Style::default().fg(theme.text).add_modifier(Modifier::BOLD))
        .alignment(Alignment::Center);
    f.render_widget(title, header_chunks[1]);

    // Right: model
    let model = Paragraph::new(format!("{} ", app.config.default_model))
        .style(Style::default().fg(theme.secondary))
        .alignment(Alignment::Right);
    f.render_widget(model, header_chunks[2]);
}

fn render_main_content(f: &mut Frame, app: &mut App, area: Rect) {
    let theme = &app.current_theme.clone();

    // Horizontal split: main content (left) + sidebar (right)
    let main_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Min(50),   // Main content
            Constraint::Length(30), // Sidebar
        ])
        .split(area);

    // Main content area
    match app.active_panel {
        ActivePanel::Chat => render_chat(f, app, main_chunks[0]),
        ActivePanel::FileExplorer => render_file_explorer(f, app, main_chunks[0]),
        ActivePanel::CommandPalette => render_command_palette(f, app, main_chunks[0]),
        ActivePanel::History => render_history(f, app, main_chunks[0]),
        ActivePanel::DiffViewer => render_diff_viewer(f, app, main_chunks[0]),
    }

    // Sidebar
    render_sidebar(f, app, main_chunks[1]);
}

fn render_chat(f: &mut Frame, app: &App, area: Rect) {
    let theme = &app.current_theme;

    // Messages area (full width now)
    let messages: Vec<ListItem> = {
        let mut items = Vec::new();
        for msg in &app.messages {
            let (role_char, style) = if msg.role == "You" {
                ("▸", Style::default().fg(theme.primary))
            } else if msg.role == "Error" {
                ("✗", Style::default().fg(theme.error))
            } else {
                ("●", Style::default().fg(theme.success))
            };

            // Role indicator
            let role_span = Span::styled(format!("{} ", role_char), style);
            let role_name = Span::styled(
                format!("{}: ", msg.role),
                Style::default().fg(theme.text_muted),
            );

            if msg.highlighted_lines.is_empty() {
                let line = Line::from(vec![role_span, role_name]);
                items.push(ListItem::new(line));
            } else {
                // First line with role
                let mut first_spans = vec![role_span, role_name];
                first_spans.extend(msg.highlighted_lines[0].spans.clone());
                items.push(ListItem::new(Line::from(first_spans)));

                // Remaining lines with indent
                for line in msg.highlighted_lines.iter().skip(1) {
                    let mut line_spans = vec![Span::raw("  ")];
                    line_spans.extend(line.spans.clone());
                    items.push(ListItem::new(Line::from(line_spans)));
                }
            }
        }
        items
    };

    let messages_list = List::new(messages)
        .block(
            Block::default()
                .title(" Messages ")
                .borders(Borders::ALL)
                .border_style(Style::default().fg(theme.border)),
        )
        .highlight_style(Style::default().add_modifier(Modifier::BOLD));

    f.render_widget(messages_list, area);
}

fn render_sidebar(f: &mut Frame, app: &App, area: Rect) {
    let theme = &app.current_theme;

    let sidebar_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),  // Quick actions
            Constraint::Min(5),    // File explorer
            Constraint::Length(5), // Keyboard shortcuts
        ])
        .split(area);

    // Quick actions
    let actions = vec![
        ListItem::new(Line::from(vec![
            Span::styled("f ", Style::default().fg(theme.accent)),
            Span::styled("Fix", Style::default().fg(theme.text)),
        ])),
        ListItem::new(Line::from(vec![
            Span::styled("e ", Style::default().fg(theme.accent)),
            Span::styled("Explain", Style::default().fg(theme.text)),
        ])),
        ListItem::new(Line::from(vec![
            Span::styled("c ", Style::default().fg(theme.accent)),
            Span::styled("Commit", Style::default().fg(theme.text)),
        ])),
        ListItem::new(Line::from(vec![
            Span::styled("r ", Style::default().fg(theme.accent)),
            Span::styled("Review", Style::default().fg(theme.text)),
        ])),
        ListItem::new(Line::from(vec![
            Span::styled("t ", Style::default().fg(theme.accent)),
            Span::styled("Test", Style::default().fg(theme.text)),
        ])),
    ];

    let actions_list = List::new(actions).block(
        Block::default()
            .title(" Quick ")
            .borders(Borders::ALL)
            .border_style(Style::default().fg(theme.border)),
    );
    f.render_widget(actions_list, sidebar_chunks[0]);

    // File explorer
    let files: Vec<ListItem> = app
        .files
        .iter()
        .take(10)
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
    f.render_widget(files_list, sidebar_chunks[1]);

    // Keyboard shortcuts
    let shortcuts = vec![
        ListItem::new(Line::from(vec![
            Span::styled("Tab ", Style::default().fg(theme.accent)),
            Span::styled("panels", Style::default().fg(theme.text_muted)),
        ])),
        ListItem::new(Line::from(vec![
            Span::styled("? ", Style::default().fg(theme.accent)),
            Span::styled("help", Style::default().fg(theme.text_muted)),
        ])),
        ListItem::new(Line::from(vec![
            Span::styled("Ctrl+s ", Style::default().fg(theme.accent)),
            Span::styled("save", Style::default().fg(theme.text_muted)),
        ])),
        ListItem::new(Line::from(vec![
            Span::styled("Ctrl+t ", Style::default().fg(theme.accent)),
            Span::styled("theme", Style::default().fg(theme.text_muted)),
        ])),
    ];

    let shortcuts_list = List::new(shortcuts).block(
        Block::default()
            .title(" Keys ")
            .borders(Borders::ALL)
            .border_style(Style::default().fg(theme.border)),
    );
    f.render_widget(shortcuts_list, sidebar_chunks[2]);
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
            "No history yet",
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

fn render_footer(f: &mut Frame, app: &App, area: Rect) {
    let theme = &app.current_theme;

    let footer_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Min(20),   // Status/Input
            Constraint::Length(20), // Tokens
            Constraint::Length(20), // Loading indicator
        ])
        .split(area);

    // Left: Input/Status
    if app.is_loading {
        let loading = Paragraph::new(" ● Thinking...")
            .style(Style::default().fg(theme.warning));
        f.render_widget(loading, footer_chunks[0]);
    } else {
        let input_display = if app.input.is_empty() {
            Span::styled(
                " Press Enter to send...",
                Style::default().fg(theme.text_muted),
            )
        } else {
            Span::styled(
                format!(" {}_", app.input),
                Style::default().fg(theme.text),
            )
        };
        let input = Paragraph::new(input_display);
        f.render_widget(input, footer_chunks[0]);
    }

    // Center: Tokens
    let tokens = Paragraph::new(format!("tok:{} ", app.token_count))
        .style(Style::default().fg(theme.text_muted))
        .alignment(Alignment::Right);
    f.render_widget(tokens, footer_chunks[1]);

    // Right: Status message or saved
    let status_text = if let Some(ref saved_msg) = app.session_saved_message {
        saved_msg.clone()
    } else {
        app.status_message.clone()
    };
    let status = Paragraph::new(format!("{} ", status_text))
        .style(Style::default().fg(theme.text_muted))
        .alignment(Alignment::Right);
    f.render_widget(status, footer_chunks[2]);
}

fn render_input(f: &mut Frame, app: &App, area: Rect) {
    let theme = &app.current_theme;
    let input = Paragraph::new(app.input.as_str())
        .block(
            Block::default()
                .title(" Input ")
                .borders(Borders::ALL)
                .border_style(Style::default().fg(if app.is_loading {
                    theme.warning
                } else {
                    theme.border
                })),
        )
        .style(Style::default());

    f.render_widget(input, area);

    // Set cursor position
    f.set_cursor_position((area.x + app.cursor_position as u16 + 1, area.y + 1));
}

fn render_diff_viewer(f: &mut Frame, app: &App, area: Rect) {
    let theme = &app.current_theme;
    if app.diffs.is_empty() {
        let empty = Paragraph::new("No diffs available")
            .alignment(Alignment::Center)
            .block(
                Block::default()
                    .title(" Diff Viewer ")
                    .borders(Borders::ALL)
                    .border_style(Style::default().fg(theme.border)),
            );
        f.render_widget(empty, area);
        return;
    }

    let current_diff = &app.diffs[app.current_diff_index];

    // Build header with diff info
    let file_info = current_diff.file_path.as_deref().unwrap_or("Unknown file");
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

    // Render diff content
    render_diff_content(current_diff, inner_area, f.buffer_mut(), app.diff_scroll);

    // Show navigation hints
    let hint_area = Rect {
        x: area.x,
        y: area.y + area.height - 1,
        width: area.width,
        height: 1,
    };
    let hints = Paragraph::new(" n/p: diff  j/k: scroll  Esc: back")
        .alignment(Alignment::Center)
        .style(Style::default().fg(theme.text_muted));
    f.render_widget(hints, hint_area);
}
