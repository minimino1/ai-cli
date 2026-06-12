use crate::config::Config;
use crate::providers::{get_provider, ChatRequest, ChatResponse, Message, Role};
use anyhow::Result;
use ratatui::text::Line;
use std::path::PathBuf;
use super::highlight;
use crate::tui::diff::Diff;
use crate::tui::theme::Theme;
use futures_util::future::FutureExt;

#[derive(Debug, Clone, PartialEq)]
pub enum ActivePanel {
    Chat,
    FileExplorer,
    CommandPalette,
    History,
    DiffViewer,
}

#[derive(Debug, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    pub timestamp: String,
    pub highlighted_lines: Vec<Line<'static>>,
}

#[derive(Debug, Clone)]
pub struct FileItem {
    pub name: String,
    pub path: PathBuf,
    pub is_dir: bool,
}

pub struct App {
    pub should_quit: bool,
    pub active_panel: ActivePanel,
    pub input: String,
    pub cursor_position: usize,
    pub messages: Vec<ChatMessage>,
    pub files: Vec<FileItem>,
    pub file_selected: usize,
    pub history: Vec<String>,
    pub history_selected: usize,
    pub commands: Vec<String>,
    pub command_selected: usize,
    pub config: Config,
    pub is_loading: bool,
    pub status_message: String,
    pub diffs: Vec<Diff>,
    pub current_diff_index: usize,
    pub diff_scroll: usize,
    pub session_saved_message: Option<String>,
    pub token_count: usize,
    pub current_theme: Theme,
    pub current_theme_index: usize,
    pub show_help: bool,
    // Non-blocking async response handling
    pub pending_request: Option<tokio::task::JoinHandle<Result<ChatResponse>>>,
}

impl App {
    pub async fn new(config: &Config) -> Result<Self> {
        let commands = vec![
            "fix".to_string(),
            "explain".to_string(),
            "commit".to_string(),
            "review".to_string(),
            "test".to_string(),
            "shell".to_string(),
            "sql".to_string(),
            "error".to_string(),
            "docs".to_string(),
            "refactor".to_string(),
        ];

        let files = list_current_dir()?;

        // Initialize theme from config or default to dark
        let themes = Theme::presets();
        let theme_name = &config.settings.theme;
        let current_theme_index = themes
            .iter()
            .position(|t| t.name.eq_ignore_ascii_case(theme_name))
            .unwrap_or(0); // Default to dark if not found
        let current_theme = themes[current_theme_index].clone();

        Ok(App {
            should_quit: false,
            active_panel: ActivePanel::Chat,
            input: String::new(),
            cursor_position: 0,
            messages: Vec::new(),
            files,
            file_selected: 0,
            history: Vec::new(),
            history_selected: 0,
            commands,
            command_selected: 0,
            config: config.clone(),
            is_loading: false,
            status_message: "Ready".to_string(),
            diffs: Vec::new(),
            current_diff_index: 0,
            diff_scroll: 0,
            session_saved_message: None,
            token_count: 0,
            current_theme,
            current_theme_index,
            show_help: false,
            pending_request: None,
        })
    }

    /// Start sending a message (non-blocking)
    pub fn start_send_message(&mut self) {
        let input = self.input.trim().to_string();
        if input.is_empty() {
            return;
        }

        // Add user message immediately
        let content = input.clone();
        let highlighted_lines = highlight::highlight_markdown(&content);
        self.messages.push(ChatMessage {
            role: "You".to_string(),
            content,
            timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
            highlighted_lines,
        });

        // Add to history
        self.history.push(input.clone());

        // Clear input
        self.input.clear();
        self.cursor_position = 0;

        // Show loading
        self.is_loading = true;
        self.status_message = "Thinking...".to_string();

        // Clone config for async task
        let config = self.config.clone();
        let messages = self.messages.clone();
        let input_clone = input;

        // Spawn async task
        let handle = tokio::spawn(async move {
            Self::get_ai_response_static(&config, &messages, &input_clone).await
        });

        self.pending_request = Some(handle);
    }

    /// Check if there's a pending response and handle it
    pub fn check_pending_response(&mut self) {
        if let Some(handle) = &self.pending_request {
            if handle.is_finished() {
                // Take the handle out
                let handle = self.pending_request.take().unwrap();
                
                // Get the result - JoinHandle returns Result<T, JoinError>
                match handle.now_or_never() {
                    Some(Ok(Ok(response))) => {
                        // Estimate tokens: ~4 chars per token
                        let tokens = response.content.len() / 4;
                        self.token_count += tokens;

                        let content = response.content;
                        let highlighted_lines = highlight::highlight_markdown(&content);
                        self.messages.push(ChatMessage {
                            role: "AI".to_string(),
                            content,
                            timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                            highlighted_lines,
                        });
                        self.status_message = "Ready".to_string();
                        self.is_loading = false;

                        // Extract diffs from AI response
                        self.extract_diffs();
                    }
                    Some(Ok(Err(e))) => {
                        let content = format!("Failed: {}", e);
                        let highlighted_lines = highlight::highlight_markdown(&content);
                        self.messages.push(ChatMessage {
                            role: "Error".to_string(),
                            content,
                            timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                            highlighted_lines,
                        });
                        self.status_message = format!("Error: {}", e);
                        self.is_loading = false;
                    }
                    Some(Err(e)) => {
                        let content = format!("Task failed: {}", e);
                        let highlighted_lines = highlight::highlight_markdown(&content);
                        self.messages.push(ChatMessage {
                            role: "Error".to_string(),
                            content,
                            timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                            highlighted_lines,
                        });
                        self.status_message = format!("Task error: {}", e);
                        self.is_loading = false;
                    }
                    None => {
                        // Still pending, not ready yet
                    }
                }
            }
        }
    }

    /// Static version of get_ai_response for spawning
    async fn get_ai_response_static(
        config: &Config,
        messages: &[ChatMessage],
        input: &str,
    ) -> Result<ChatResponse> {
        let provider_name = &config.default_provider;
        let provider_config = config.get_provider(provider_name)?;
        let provider = get_provider(provider_name, provider_config.api_key.as_deref())?;

        let mut chat_messages = Vec::new();

        // Add context from previous messages
        for msg in messages.iter().rev().take(10) {
            let role = if msg.role == "You" {
                Role::User
            } else {
                Role::Assistant
            };
            chat_messages.push(Message {
                role,
                content: msg.content.clone(),
            });
        }

        // Add current input
        chat_messages.push(Message {
            role: Role::User,
            content: input.to_string(),
        });

        let request = ChatRequest {
            messages: chat_messages,
            model: provider_config
                .model
                .clone()
                .unwrap_or_else(|| config.default_model.clone()),
            max_tokens: provider_config.max_tokens,
            temperature: provider_config.temperature,
        };

        provider.chat(request).await
    }

    pub fn next_file(&mut self) {
        if !self.files.is_empty() {
            self.file_selected = (self.file_selected + 1) % self.files.len();
        }
    }

    pub fn prev_file(&mut self) {
        if !self.files.is_empty() {
            self.file_selected = if self.file_selected == 0 {
                self.files.len() - 1
            } else {
                self.file_selected - 1
            };
        }
    }

    pub fn next_command(&mut self) {
        if !self.commands.is_empty() {
            self.command_selected = (self.command_selected + 1) % self.commands.len();
        }
    }

    pub fn prev_command(&mut self) {
        if !self.commands.is_empty() {
            self.command_selected = if self.command_selected == 0 {
                self.commands.len() - 1
            } else {
                self.command_selected - 1
            };
        }
    }

    pub fn next_history(&mut self) {
        if !self.history.is_empty() {
            self.history_selected = (self.history_selected + 1) % self.history.len();
        }
    }

    pub fn prev_history(&mut self) {
        if !self.history.is_empty() {
            self.history_selected = if self.history_selected == 0 {
                self.history.len() - 1
            } else {
                self.history_selected - 1
            };
        }
    }

    pub fn select_command(&mut self) {
        if let Some(cmd) = self.commands.get(self.command_selected) {
            self.input = format!("{} ", cmd);
            self.cursor_position = self.input.len();
            self.active_panel = ActivePanel::Chat;
        }
    }

    pub fn select_history(&mut self) {
        if let Some(cmd) = self.history.get(self.history_selected) {
            self.input = cmd.clone();
            self.cursor_position = self.input.len();
            self.active_panel = ActivePanel::Chat;
        }
    }

    pub fn select_file(&mut self) -> Result<()> {
        if let Some(file) = self.files.get(self.file_selected) {
            if file.is_dir {
                std::env::set_current_dir(&file.path)?;
                self.files = list_current_dir()?;
                self.file_selected = 0;
            } else {
                self.input = format!("explain {}", file.path.display());
                self.cursor_position = self.input.len();
                self.active_panel = ActivePanel::Chat;
            }
        }
        Ok(())
    }

    pub fn extract_diffs(&mut self) {
        use crate::tui::diff::find_diffs_in_text;

        self.diffs.clear();
        for msg in &self.messages {
            if msg.role == "AI" {
                let diffs = find_diffs_in_text(&msg.content);
                if !diffs.is_empty() {
                    self.diffs.extend(diffs);
                }
            }
        }

        if !self.diffs.is_empty() {
            self.current_diff_index = 0;
            self.diff_scroll = 0;
        }
    }

    pub fn next_diff(&mut self) {
        if !self.diffs.is_empty() {
            self.current_diff_index = (self.current_diff_index + 1) % self.diffs.len();
            self.diff_scroll = 0;
        }
    }

    pub fn prev_diff(&mut self) {
        if !self.diffs.is_empty() {
            self.current_diff_index = if self.current_diff_index == 0 {
                self.diffs.len() - 1
            } else {
                self.current_diff_index - 1
            };
            self.diff_scroll = 0;
        }
    }

    pub fn scroll_diff_down(&mut self, amount: usize) {
        if !self.diffs.is_empty() && self.current_diff_index < self.diffs.len() {
            let diff = &self.diffs[self.current_diff_index];
            let max_scroll = diff.all_lines().len().saturating_sub(1);
            self.diff_scroll = (self.diff_scroll + amount).min(max_scroll);
        }
    }

    pub fn scroll_diff_up(&mut self, amount: usize) {
        self.diff_scroll = self.diff_scroll.saturating_sub(amount);
    }

    pub fn show_diff_viewer(&mut self) {
        if !self.diffs.is_empty() {
            self.active_panel = ActivePanel::DiffViewer;
        }
    }

    pub fn save_session(&mut self) -> Result<PathBuf> {
        use crate::tui::session::save_session;

        let path = save_session(&self.messages)?;
        self.session_saved_message = Some(format!("Session saved to: {}", path.display()));
        Ok(path)
    }

    pub fn clear_session_saved_message(&mut self) {
        self.session_saved_message = None;
    }

    pub fn cycle_theme(&mut self) {
        let themes = Theme::presets();
        self.current_theme_index = (self.current_theme_index + 1) % themes.len();
        self.current_theme = themes[self.current_theme_index].clone();
    }
}

fn list_current_dir() -> Result<Vec<FileItem>> {
    let mut items = Vec::new();
    let current_dir = std::env::current_dir()?;

    // Add parent directory
    if let Some(parent) = current_dir.parent() {
        items.push(FileItem {
            name: "..".to_string(),
            path: parent.to_path_buf(),
            is_dir: true,
        });
    }

    // Read directory entries
    let mut entries: Vec<_> = std::fs::read_dir(&current_dir)?
        .filter_map(|e| e.ok())
        .collect();

    entries.sort_by(|a, b| {
        let a_is_dir = a.path().is_dir();
        let b_is_dir = b.path().is_dir();
        b_is_dir.cmp(&a_is_dir).then_with(|| a.file_name().cmp(&b.file_name()))
    });

    for entry in entries {
        let path = entry.path();
        let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();

        // Skip hidden files
        if name.starts_with('.') {
            continue;
        }

        items.push(FileItem {
            name,
            path,
            is_dir: entry.path().is_dir(),
        });
    }

    Ok(items)
}
