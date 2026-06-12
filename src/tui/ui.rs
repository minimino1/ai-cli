use ratatui::prelude::*;
use ratatui::widgets::*;

use super::app::{ActivePanel, App};
use super::diff::render_diff as render_diff_content;
use super::help;
use super::theme::Theme;

pub fn render(f: &mut Frame, app: &mut App) {
    let area = f.area();

    // Create main layout
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),  // Header
            Constraint::Min(10),   // Main content
            Constraint::Length(3),  // Input
            Constraint::Length(1),  // Status bar
        ])
        .split(area);

    // Render header
    render_header(f, app, chunks[0]);

    // Render main content based on active panel
    match app.active_panel {
        ActivePanel::Chat => render_chat(f, app, chunks[1]),
        ActivePanel::FileExplorer => render_file_explorer(f, app, chunks[1]),
        ActivePanel::CommandPalette => render_command_palette(f, app, chunks[1]),
        ActivePanel::History => render_history(f, app, chunks[1]),
        ActivePanel::DiffViewer => render_diff_viewer(f, app, chunks[1]),
    }

    // Render input
    render_input(f, app, chunks[2]);

    // Render status bar
    render_status_bar(f, app, chunks[3]);

    // Render help overlay if shown
    if app.show_help {
        help::render_help_overlay(f, area);
    }
}

fn render_header(f: &mut Frame, app: &App, area: Rect) {
    let theme = &app.current_theme;

    let header_content = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage(33),
            Constraint::Percentage(33),
            Constraint::Percentage(34),
        ])
        .split(area);

    let header = Block::default()
        .title(" ai-cli v0.1.0 ")
        .title_alignment(Alignment::Center)
        .borders(Borders::ALL)
        .border_style(Style::default().fg(theme.border));
    f.render_widget(header, area);

    let provider_text = format!("Provider: {}", app.config.default_provider);
    let provider = Paragraph::new(provider_text)
        .alignment(Alignment::Center)
        .style(Style::default().fg(theme.accent));
    f.render_widget(provider, header_content[0]);

    let model_text = format!("Model: {}", app.config.default_model);
    let model = Paragraph::new(model_text)
        .alignment(Alignment::Center)
        .style(Style::default().fg(theme.success));
    f.render_widget(model, header_content[1]);

    let panel_name = match app.active_panel {
        ActivePanel::Chat => "Chat",
        ActivePanel::FileExplorer => "Files",
        ActivePanel::CommandPalette => "Commands",
        ActivePanel::History => "History",
        ActivePanel::DiffViewer => "Diffs",
    };
    let panel = Paragraph::new(format!("Panel: {}", panel_name))
        .alignment(Alignment::Center)
        .style(Style::default().fg(theme.accent));
    f.render_widget(panel, header_content[2]);
}

fn render_chat(f: &mut Frame, app: &App, area: Rect) {
    let theme = &app.current_theme;
    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(70), Constraint::Percentage(30)])
        .split(area);

    // Messages area
    let messages: Vec<ListItem> = {
        let mut items = Vec::new();
        for msg in &app.messages {
            let style = if msg.role == "You" {
                Style::default().fg(Color::Cyan)
            } else if msg.role == "Error" {
                Style::default().fg(Color::Red)
            } else {
                Style::default().fg(Color::Green)
            };

            let prefix = format!("[{}] {}: ", msg.timestamp, msg.role);
            let timestamp_span = Span::styled(
                format!("[{}] ", msg.timestamp),
                Style::default().fg(Color::DarkGray),
            );
            let role_span = Span::styled(format!("{}: ", msg.role), style);

            if msg.highlighted_lines.is_empty() {
                // No content, just show prefix
                let line = Line::from(vec![timestamp_span, role_span]);
                items.push(ListItem::new(line));
            } else {
                // First line: prefix + first highlighted line
                let mut first_spans = Vec::new();
                first_spans.push(timestamp_span.clone());
                first_spans.push(role_span.clone());
                first_spans.extend(msg.highlighted_lines[0].spans.clone());
                items.push(ListItem::new(Line::from(first_spans)));

                // Remaining lines: indent + highlighted line
                let prefix_len = prefix.len();
                let indent = " ".repeat(prefix_len);
                for line in msg.highlighted_lines.iter().skip(1) {
                    let mut line_spans = Vec::new();
                    line_spans.push(Span::raw(indent.clone()));
                    line_spans.extend(line.spans.clone());
                    items.push(ListItem::new(Line::from(line_spans)));
                }
            }
        }
        items
    };

    let messages_list = List::new(messages)
        .block(Block::default().title(" Messages ").borders(Borders::ALL))
        .highlight_style(Style::default().add_modifier(Modifier::BOLD));

    f.render_widget(messages_list, chunks[0]);

    // Quick actions
    let actions = vec![
        ListItem::new(Line::from(Span::styled("[f] Fix", Style::default().fg(theme.accent)))),
        ListItem::new(Line::from(Span::styled("[e] Explain", Style::default().fg(theme.accent)))),
        ListItem::new(Line::from(Span::styled("[c] Commit", Style::default().fg(theme.accent)))),
        ListItem::new(Line::from(Span::styled("[r] Review", Style::default().fg(theme.accent)))),
        ListItem::new(Line::from(Span::styled("[t] Test", Style::default().fg(theme.accent)))),
        ListItem::new(Line::from("")),
        ListItem::new(Line::from(Span::styled("[Tab] Files", Style::default().fg(theme.accent)))),
        ListItem::new(Line::from(Span::styled("[Ctrl+P] Commands", Style::default().fg(theme.accent)))),
        ListItem::new(Line::from(Span::styled("[Ctrl+H] History", Style::default().fg(theme.accent)))),
        ListItem::new(Line::from(Span::styled("[Ctrl+S] Save", Style::default().fg(theme.accent)))),
        ListItem::new(Line::from(Span::styled("[n/p] Diffs", Style::default().fg(theme.accent)))),
        ListItem::new(Line::from(Span::styled("[q] Quit", Style::default().fg(theme.error)))),
    ];

    let actions_list = List::new(actions)
        .block(Block::default().title(" Quick Actions ").borders(Borders::ALL));

    f.render_widget(actions_list, chunks[1]);
}

fn render_file_explorer(f: &mut Frame, app: &App, area: Rect) {
    let theme = &app.current_theme;
    let items: Vec<ListItem> = app
        .files
        .iter()
        .enumerate()
        .map(|(i, file)| {
            let icon = if file.is_dir { "📁" } else { "📄" };
            let style = if i == app.file_selected {
                Style::default().fg(theme.accent).add_modifier(Modifier::BOLD)
            } else {
                Style::default()
            };

            ListItem::new(Line::from(vec![
                Span::raw(format!("{} ", icon)),
                Span::styled(&file.name, style),
            ]))
        })
        .collect();

    let files_list = List::new(items)
        .block(Block::default().title(" Files ").borders(Borders::ALL))
        .highlight_style(Style::default().fg(theme.accent));

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
                Style::default().fg(theme.accent).add_modifier(Modifier::BOLD)
            } else {
                Style::default()
            };

            ListItem::new(Line::from(Span::styled(cmd, style)))
        })
        .collect();

    let commands_list = List::new(items)
        .block(Block::default().title(" Commands ").borders(Borders::ALL))
        .highlight_style(Style::default().fg(theme.accent));

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
                Style::default().fg(theme.accent).add_modifier(Modifier::BOLD)
            } else {
                Style::default()
            };

            ListItem::new(Line::from(Span::styled(cmd, style)))
        })
        .collect();

    let history_list = if items.is_empty() {
        List::new(vec![ListItem::new(Line::from(Span::styled(
            "No history yet",
            Style::default().fg(theme.dim),
        )))])
    } else {
        List::new(items)
    }
    .block(Block::default().title(" History ").borders(Borders::ALL));

    f.render_widget(history_list, area);
}

fn render_input(f: &mut Frame, app: &App, area: Rect) {
    let theme = &app.current_theme;
    let input = Paragraph::new(app.input.as_str())
        .block(
            Block::default()
                .title(" Input (Enter to send) ")
                .borders(Borders::ALL)
                .border_style(Style::default().fg(if app.is_loading {
                    theme.error
                } else {
                    theme.border
                })),
        )
        .style(Style::default());

    f.render_widget(input, area);

    // Set cursor position
    f.set_cursor_position((area.x + app.cursor_position as u16 + 1, area.y + 1));
}

fn render_status_bar(f: &mut Frame, app: &App, area: Rect) {
    let theme = &app.current_theme;
    
    let mut status_parts = vec![];
    
    // Show loading indicator
    if app.is_loading {
        status_parts.push(Span::styled("● Processing... ", Style::default().fg(theme.error)));
    }
    
    status_parts.push(Span::styled(app.status_message.as_str(), Style::default().fg(theme.dim)));
    status_parts.push(Span::raw(" | "));
    
    let token_text = format!("Tokens: {}", app.token_count);
    status_parts.push(Span::styled(token_text, Style::default().fg(theme.accent)));

    if let Some(ref saved_msg) = app.session_saved_message {
        status_parts.push(Span::raw(" | "));
        status_parts.push(Span::styled(saved_msg, Style::default().fg(theme.success)));
    }

    let status = Line::from(status_parts);

    let paragraph = Paragraph::new(status)
        .alignment(Alignment::Left);

    f.render_widget(paragraph, area);
}

fn render_diff_viewer(f: &mut Frame, app: &App, area: Rect) {
    let theme = &app.current_theme;
    if app.diffs.is_empty() {
        let empty = Paragraph::new("No diffs available")
            .alignment(Alignment::Center)
            .block(Block::default().title(" Diff Viewer ").borders(Borders::ALL));
        f.render_widget(empty, area);
        return;
    }

    let current_diff = &app.diffs[app.current_diff_index];

    // Build header with diff info
    let file_info = current_diff.file_path.as_deref().unwrap_or("Unknown file");
    let stats = format!("+{} -{}", current_diff.additions_count(), current_diff.deletions_count());
    let title = format!(" Diff Viewer: {} ({}) ", file_info, stats);

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
    let hints = Paragraph::new(
        "[n/p] Next/Prev diff  [j/k] Scroll  [Esc] Back"
    )
    .alignment(Alignment::Center)
    .style(Style::default().fg(theme.dim));
    f.render_widget(hints, hint_area);
}
