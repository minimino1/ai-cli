use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use anyhow::Result;

use super::app::{ActivePanel, App};
use super::clipboard;

pub async fn handle_key(app: &mut App, key: KeyEvent) -> Result<()> {
    // Global help toggle (works in any panel)
    if key.code == KeyCode::Char('?') && key.modifiers.is_empty() {
        app.show_help = !app.show_help;
        return Ok(());
    }

    // If help is shown, any key (except '?' which is handled above) closes it
    if app.show_help && key.code != KeyCode::Char('?') {
        app.show_help = false;
        return Ok(());
    }

    // Clear session saved message on any key press
    app.clear_session_saved_message();

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

        // Toggle theme
        KeyCode::Char('t') if key.modifiers.contains(KeyModifiers::CONTROL) => {
            app.cycle_theme();
        }

        // Tab to cycle panels
        KeyCode::Tab => {
            app.active_panel = match app.active_panel {
                ActivePanel::Chat => ActivePanel::FileExplorer,
                ActivePanel::FileExplorer => ActivePanel::CommandPalette,
                ActivePanel::CommandPalette => ActivePanel::History,
                ActivePanel::History => ActivePanel::Chat,
                ActivePanel::DiffViewer => ActivePanel::Chat,
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
            } else if app.active_panel == ActivePanel::DiffViewer {
                handle_diff_viewer(app, key).await?;
            }
        }
    }

    Ok(())
}

async fn handle_chat_input(app: &mut App, key: KeyEvent) -> Result<()> {
    match key.code {
        // Send message (Enter without Shift or Ctrl)
        KeyCode::Enter if !key.modifiers.contains(KeyModifiers::SHIFT) && !key.modifiers.contains(KeyModifiers::CONTROL) => {
            app.start_send_message();
        }

        // Insert newline (Shift+Enter or Ctrl+Enter)
        KeyCode::Enter => {
            app.input.insert(app.cursor_position, '\n');
            app.cursor_position += 1;
        }

        // Copy last AI response to clipboard
        KeyCode::Char('y') => {
            if let Some(last_ai_msg) = app.messages.iter().rev().find(|msg| msg.role == "AI") {
                match clipboard::copy_to_clipboard(&last_ai_msg.content) {
                    Ok(_) => {
                        app.status_message = "Copied to clipboard!".to_string();
                    }
                    Err(e) => {
                        app.status_message = format!("Clipboard error: {}", e);
                    }
                }
            } else {
                app.status_message = "No AI response to copy".to_string();
            }
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
        KeyCode::Char('s') if key.modifiers.contains(KeyModifiers::CONTROL) => {
            if let Err(e) = app.save_session() {
                app.status_message = format!("Save failed: {}", e);
            }
        }
        KeyCode::Char('d') if app.input.is_empty() && !app.diffs.is_empty() => {
            app.show_diff_viewer();
        }

        // Clear input
        KeyCode::Char('u') if key.modifiers.contains(KeyModifiers::CONTROL) => {
            app.input.clear();
            app.cursor_position = 0;
        }

        // Diff navigation
        KeyCode::Char('n') => {
            if !app.diffs.is_empty() {
                app.next_diff();
                app.active_panel = ActivePanel::DiffViewer;
            }
        }
        KeyCode::Char('p') => {
            if !app.diffs.is_empty() {
                app.prev_diff();
                app.active_panel = ActivePanel::DiffViewer;
            }
        }
        KeyCode::Char('j') => {
            if app.active_panel == ActivePanel::DiffViewer {
                app.scroll_diff_down(1);
            }
        }
        KeyCode::Char('k') => {
            if app.active_panel == ActivePanel::DiffViewer {
                app.scroll_diff_up(1);
            }
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

async fn handle_diff_viewer(app: &mut App, key: KeyEvent) -> Result<()> {
    match key.code {
        KeyCode::Up | KeyCode::Char('k') => {
            app.scroll_diff_up(1);
        }
        KeyCode::Down | KeyCode::Char('j') => {
            app.scroll_diff_down(1);
        }
        KeyCode::Char('n') => {
            app.next_diff();
        }
        KeyCode::Char('p') => {
            app.prev_diff();
        }
        KeyCode::Esc => {
            app.active_panel = ActivePanel::Chat;
        }
        _ => {}
    }

    Ok(())
}
