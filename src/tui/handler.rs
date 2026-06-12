use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use anyhow::Result;

use super::app::{ActivePanel, App};

pub async fn handle_key(app: &mut App, key: KeyEvent) -> Result<()> {
    match key.code {
        // Quit
        KeyCode::Char('q') if key.modifiers.contains(KeyModifiers::CONTROL) => {
            app.should_quit = true;
        }
        KeyCode::Esc => {
            match app.active_panel {
                ActivePanel::Chat => app.should_quit = true,
                _ => app.active_panel = ActivePanel::Chat,
            }
        }

        // Tab to cycle panels
        KeyCode::Tab => {
            app.active_panel = match app.active_panel {
                ActivePanel::Chat => ActivePanel::FileExplorer,
                ActivePanel::FileExplorer => ActivePanel::CommandPalette,
                ActivePanel::CommandPalette => ActivePanel::History,
                ActivePanel::History => ActivePanel::Chat,
            };
        }

        // Panel-specific shortcuts
        _ => {
            if app.active_panel == ActivePanel::Chat {
                handle_chat_input(app, key).await?;
            } else if app.active_panel == ActivePanel::FileExplorer {
                handle_file_explorer(app, key).await?;
            } else if app.active_panel == ActivePanel::CommandPalette {
                handle_command_palette(app, key).await?;
            } else if app.active_panel == ActivePanel::History {
                handle_history(app, key).await?;
            }
        }
    }

    Ok(())
}

async fn handle_chat_input(app: &mut App, key: KeyEvent) -> Result<()> {
    match key.code {
        // Send message
        KeyCode::Enter => {
            app.send_message().await?;
        }

        // Quick actions
        KeyCode::Char('f') if app.input.is_empty() => {
            app.input = "fix ".to_string();
            app.cursor_position = app.input.len();
        }
        KeyCode::Char('e') if app.input.is_empty() => {
            app.input = "explain ".to_string();
            app.cursor_position = app.input.len();
        }
        KeyCode::Char('c') if app.input.is_empty() => {
            app.input = "commit ".to_string();
            app.cursor_position = app.input.len();
        }
        KeyCode::Char('r') if app.input.is_empty() => {
            app.input = "review ".to_string();
            app.cursor_position = app.input.len();
        }
        KeyCode::Char('t') if app.input.is_empty() => {
            app.input = "test ".to_string();
            app.cursor_position = app.input.len();
        }

        // Panel switching
        KeyCode::Char('p') if key.modifiers.contains(KeyModifiers::CONTROL) => {
            app.active_panel = ActivePanel::CommandPalette;
        }
        KeyCode::Char('h') if key.modifiers.contains(KeyModifiers::CONTROL) => {
            app.active_panel = ActivePanel::History;
        }

        // Clear input
        KeyCode::Char('u') if key.modifiers.contains(KeyModifiers::CONTROL) => {
            app.input.clear();
            app.cursor_position = 0;
        }

        // Input handling
        KeyCode::Char(c) => {
            app.input.insert(app.cursor_position, c);
            app.cursor_position += 1;
        }
        KeyCode::Backspace => {
            if app.cursor_position > 0 {
                app.cursor_position -= 1;
                app.input.remove(app.cursor_position);
            }
        }
        KeyCode::Delete => {
            if app.cursor_position < app.input.len() {
                app.input.remove(app.cursor_position);
            }
        }
        KeyCode::Left => {
            if app.cursor_position > 0 {
                app.cursor_position -= 1;
            }
        }
        KeyCode::Right => {
            if app.cursor_position < app.input.len() {
                app.cursor_position += 1;
            }
        }
        KeyCode::Home => {
            app.cursor_position = 0;
        }
        KeyCode::End => {
            app.cursor_position = app.input.len();
        }

        _ => {}
    }

    Ok(())
}

async fn handle_file_explorer(app: &mut App, key: KeyEvent) -> Result<()> {
    match key.code {
        KeyCode::Up | KeyCode::Char('k') => {
            app.prev_file();
        }
        KeyCode::Down | KeyCode::Char('j') => {
            app.next_file();
        }
        KeyCode::Enter => {
            app.select_file()?;
        }
        KeyCode::Esc => {
            app.active_panel = ActivePanel::Chat;
        }
        _ => {}
    }

    Ok(())
}

async fn handle_command_palette(app: &mut App, key: KeyEvent) -> Result<()> {
    match key.code {
        KeyCode::Up | KeyCode::Char('k') => {
            app.prev_command();
        }
        KeyCode::Down | KeyCode::Char('j') => {
            app.next_command();
        }
        KeyCode::Enter => {
            app.select_command();
        }
        KeyCode::Esc => {
            app.active_panel = ActivePanel::Chat;
        }
        _ => {}
    }

    Ok(())
}

async fn handle_history(app: &mut App, key: KeyEvent) -> Result<()> {
    match key.code {
        KeyCode::Up | KeyCode::Char('k') => {
            app.prev_history();
        }
        KeyCode::Down | KeyCode::Char('j') => {
            app.next_history();
        }
        KeyCode::Enter => {
            app.select_history();
        }
        KeyCode::Esc => {
            app.active_panel = ActivePanel::Chat;
        }
        _ => {}
    }

    Ok(())
}
