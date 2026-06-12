use ratatui::prelude::*;
use ratatui::widgets::*;

use super::app::{ActivePanel, App};

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
    }

    // Render input
    render_input(f, app, chunks[2]);

    // Render status bar
    render_status_bar(f, app, chunks[3]);
}

fn render_header(f: &mut Frame, app: &App, area: Rect) {
    let header = Block::default()
        .title(" ai-cli v0.1.0 ")
        .title_alignment(Alignment::Center)
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::Cyan));

    let provider_text = format!("Provider: {}", app.config.default_provider);
    let model_text = format!("Model: {}", app.config.default_model);

    let header_content = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage(33),
            Constraint::Percentage(33),
            Constraint::Percentage(34),
        ])
        .split(area);

    f.render_widget(header, area);

    let provider = Paragraph::new(provider_text)
        .alignment(Alignment::Center)
        .style(Style::default().fg(Color::Yellow));
    f.render_widget(provider, header_content[0]);

    let model = Paragraph::new(model_text)
        .alignment(Alignment::Center)
        .style(Style::default().fg(Color::Green));
    f.render_widget(model, header_content[1]);

    let panel_name = match app.active_panel {
        ActivePanel::Chat => "Chat",
        ActivePanel::FileExplorer => "Files",
        ActivePanel::CommandPalette => "Commands",
        ActivePanel::History => "History",
    };
    let panel = Paragraph::new(format!("Panel: {}", panel_name))
        .alignment(Alignment::Center)
        .style(Style::default().fg(Color::Magenta));
    f.render_widget(panel, header_content[2]);
}

fn render_chat(f: &mut Frame, app: &App, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(70), Constraint::Percentage(30)])
        .split(area);

    // Messages area
    let messages: Vec<ListItem> = app
        .messages
        .iter()
        .map(|msg| {
            let style = if msg.role == "You" {
                Style::default().fg(Color::Cyan)
            } else if msg.role == "Error" {
                Style::default().fg(Color::Red)
            } else {
                Style::default().fg(Color::Green)
            };

            let line = Line::from(vec![
                Span::styled(format!("[{}] ", msg.timestamp), Style::default().fg(Color::DarkGray)),
                Span::styled(format!("{}: ", msg.role), style),
                Span::raw(&msg.content),
            ]);
            ListItem::new(line)
        })
        .collect();

    let messages_list = List::new(messages)
        .block(Block::default().title(" Messages ").borders(Borders::ALL))
        .highlight_style(Style::default().add_modifier(Modifier::BOLD));

    f.render_widget(messages_list, chunks[0]);

    // Quick actions
    let actions = vec![
        ListItem::new(Line::from(Span::styled("[f] Fix", Style::default().fg(Color::Yellow)))),
        ListItem::new(Line::from(Span::styled("[e] Explain", Style::default().fg(Color::Yellow)))),
        ListItem::new(Line::from(Span::styled("[c] Commit", Style::default().fg(Color::Yellow)))),
        ListItem::new(Line::from(Span::styled("[r] Review", Style::default().fg(Color::Yellow)))),
        ListItem::new(Line::from(Span::styled("[t] Test", Style::default().fg(Color::Yellow)))),
        ListItem::new(Line::from("")),
        ListItem::new(Line::from(Span::styled("[Tab] Files", Style::default().fg(Color::Cyan)))),
        ListItem::new(Line::from(Span::styled("[Ctrl+P] Commands", Style::default().fg(Color::Cyan)))),
        ListItem::new(Line::from(Span::styled("[Ctrl+H] History", Style::default().fg(Color::Cyan)))),
        ListItem::new(Line::from(Span::styled("[q] Quit", Style::default().fg(Color::Red)))),
    ];

    let actions_list = List::new(actions)
        .block(Block::default().title(" Quick Actions ").borders(Borders::ALL));

    f.render_widget(actions_list, chunks[1]);
}

fn render_file_explorer(f: &mut Frame, app: &App, area: Rect) {
    let items: Vec<ListItem> = app
        .files
        .iter()
        .enumerate()
        .map(|(i, file)| {
            let icon = if file.is_dir { "📁" } else { "📄" };
            let style = if i == app.file_selected {
                Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD)
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
        .highlight_style(Style::default().fg(Color::Cyan));

    f.render_widget(files_list, area);
}

fn render_command_palette(f: &mut Frame, app: &App, area: Rect) {
    let items: Vec<ListItem> = app
        .commands
        .iter()
        .enumerate()
        .map(|(i, cmd)| {
            let style = if i == app.command_selected {
                Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD)
            } else {
                Style::default()
            };

            ListItem::new(Line::from(Span::styled(cmd, style)))
        })
        .collect();

    let commands_list = List::new(items)
        .block(Block::default().title(" Commands ").borders(Borders::ALL))
        .highlight_style(Style::default().fg(Color::Cyan));

    f.render_widget(commands_list, area);
}

fn render_history(f: &mut Frame, app: &App, area: Rect) {
    let items: Vec<ListItem> = app
        .history
        .iter()
        .enumerate()
        .map(|(i, cmd)| {
            let style = if i == app.history_selected {
                Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD)
            } else {
                Style::default()
            };

            ListItem::new(Line::from(Span::styled(cmd, style)))
        })
        .collect();

    let history_list = if items.is_empty() {
        List::new(vec![ListItem::new(Line::from(Span::styled(
            "No history yet",
            Style::default().fg(Color::DarkGray),
        )))])
    } else {
        List::new(items)
    }
    .block(Block::default().title(" History ").borders(Borders::ALL));

    f.render_widget(history_list, area);
}

fn render_input(f: &mut Frame, app: &App, area: Rect) {
    let input = Paragraph::new(app.input.as_str())
        .block(
            Block::default()
                .title(" Input (Enter to send) ")
                .borders(Borders::ALL)
                .border_style(Style::default().fg(if app.is_loading {
                    Color::Yellow
                } else {
                    Color::Cyan
                })),
        )
        .style(Style::default());

    f.render_widget(input, area);

    // Set cursor position
    f.set_cursor_position((area.x + app.cursor_position as u16 + 1, area.y + 1));
}

fn render_status_bar(f: &mut Frame, app: &App, area: Rect) {
    let status = Paragraph::new(app.status_message.as_str())
        .style(Style::default().fg(Color::DarkGray))
        .alignment(Alignment::Left);

    f.render_widget(status, area);
}
