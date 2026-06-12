use crate::config::Config;
use crate::providers::{get_provider, ChatRequest, ChatResponse, Message, Role};
use anyhow::Result;
use std::path::PathBuf;

#[derive(Debug, Clone, PartialEq)]
pub enum ActivePanel {
    Chat,
    FileExplorer,
    CommandPalette,
    History,
}

#[derive(Debug, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    pub timestamp: String,
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
        })
    }

    pub async fn send_message(&mut self) -> Result<()> {
        let input = self.input.trim().to_string();
        if input.is_empty() {
            return Ok(());
        }

        // Add user message
        self.messages.push(ChatMessage {
            role: "You".to_string(),
            content: input.clone(),
            timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
        });

        // Add to history
        self.history.push(input.clone());

        // Clear input
        self.input.clear();
        self.cursor_position = 0;

        // Show loading
        self.is_loading = true;
        self.status_message = "Thinking...".to_string();

        // Get AI response
        let response = self.get_ai_response(&input).await;

        self.is_loading = false;

        match response {
            Ok(response) => {
                self.messages.push(ChatMessage {
                    role: "AI".to_string(),
                    content: response.content,
                    timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                });
                self.status_message = "Ready".to_string();
            }
            Err(e) => {
                self.messages.push(ChatMessage {
                    role: "Error".to_string(),
                    content: format!("Failed: {}", e),
                    timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                });
                self.status_message = format!("Error: {}", e);
            }
        }

        Ok(())
    }

    async fn get_ai_response(&self, input: &str) -> Result<ChatResponse> {
        let provider_name = &self.config.default_provider;
        let provider_config = self.config.get_provider(provider_name)?;
        let provider = get_provider(provider_name, provider_config.api_key.as_deref())?;

        let mut messages = Vec::new();

        // Add context from previous messages
        for msg in self.messages.iter().rev().take(10) {
            let role = if msg.role == "You" {
                Role::User
            } else {
                Role::Assistant
            };
            messages.push(Message {
                role,
                content: msg.content.clone(),
            });
        }

        // Add current input
        messages.push(Message {
            role: Role::User,
            content: input.to_string(),
        });

        let request = ChatRequest {
            messages,
            model: provider_config
                .model
                .clone()
                .unwrap_or_else(|| self.config.default_model.clone()),
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
