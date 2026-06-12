use ratatui::prelude::*;
use ratatui::widgets::{Block, Borders, Cell, Paragraph, Row, Table};

pub fn render_help_overlay(f: &mut Frame, area: Rect) {
    let help_area = Rect {
        x: area.x + area.width / 6,
        y: area.y + area.height / 6,
        width: area.width * 2 / 3,
        height: area.height * 2 / 3,
    };

    let block = Block::default()
        .title(" Help - Keybindings ")
        .title_alignment(Alignment::Center)
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::Cyan));

    let rows = vec![
        Row::new(vec![
            Cell::from("Enter"),
            Cell::from("Send message"),
        ]),
        Row::new(vec![
            Cell::from("Shift+Enter / Ctrl+Enter"),
            Cell::from("Insert newline in input"),
        ]),
        Row::new(vec![
            Cell::from("Esc"),
            Cell::from("Quit (from Chat) / Back to Chat (from other panels)"),
        ]),
        Row::new(vec![
            Cell::from("Tab"),
            Cell::from("Switch panel (Chat → Files → Commands → History)"),
        ]),
        Row::new(vec![
            Cell::from("Ctrl+P"),
            Cell::from("Open command palette"),
        ]),
        Row::new(vec![
            Cell::from("Ctrl+H"),
            Cell::from("Open history"),
        ]),
        Row::new(vec![
            Cell::from("Ctrl+U"),
            Cell::from("Clear input"),
        ]),
        Row::new(vec![
            Cell::from("?"),
            Cell::from("Toggle this help"),
        ]),
        Row::new(vec![
            Cell::from("f/e/c/r/t"),
            Cell::from("Quick actions (fix/explain/commit/review/test)"),
        ]),
        Row::new(vec![
            Cell::from("↑/↓ or k/j"),
            Cell::from("Navigate lists (files, commands, history)"),
        ]),
        Row::new(vec![
            Cell::from("y"),
            Cell::from("Copy last response (in Chat panel)"),
        ]),
        Row::new(vec![
            Cell::from("Ctrl+Q"),
            Cell::from("Quit application"),
        ]),
    ];

    let table = Table::new(rows, &[Constraint::Length(25), Constraint::Min(20)])
        .header(Row::new(vec![
            Cell::from(Span::styled("Key", Style::default().add_modifier(Modifier::BOLD))),
            Cell::from(Span::styled("Action", Style::default().add_modifier(Modifier::BOLD))),
        ]))
        .block(block)
        .column_spacing(2);

    f.render_widget(table, help_area);
}
