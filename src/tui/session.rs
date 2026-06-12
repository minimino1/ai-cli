use anyhow::Result;
use chrono::Local;
use std::fs;
use std::path::PathBuf;

use super::app::ChatMessage;

const SESSIONS_DIR: &str = ".config/ai-cli/sessions";

pub fn ensure_sessions_dir() -> Result<PathBuf> {
    let home = dirs::home_dir().ok_or_else(|| anyhow::anyhow!("Could not find home directory"))?;
    let sessions_path = home.join(SESSIONS_DIR);

    if !sessions_path.exists() {
        fs::create_dir_all(&sessions_path)?;
    }

    Ok(sessions_path)
}

pub fn save_session(messages: &[ChatMessage]) -> Result<PathBuf> {
    let sessions_path = ensure_sessions_dir()?;

    // Generate filename with timestamp
    let timestamp = Local::now().format("%Y-%m-%d_%H%M%S").to_string();
    let filename = format!("session_{}.md", timestamp);
    let file_path = sessions_path.join(filename);

    // Build markdown content
    let mut content = String::new();
    content.push_str("# AI Session\n\n");
    content.push_str(&format!("**Date**: {}\n\n", Local::now().format("%Y-%m-%d %H:%M:%S")));

    for msg in messages {
        let role_header = match msg.role.as_str() {
            "You" => "## User",
            "AI" => "## AI",
            "Error" => "## Error",
            _ => &format!("## {}", msg.role),
        };

        content.push_str(role_header);
        content.push('\n');
        content.push_str(&msg.content);
        content.push_str("\n\n");
    }

    // Write to file
    fs::write(&file_path, content)?;

    Ok(file_path)
}

pub fn list_sessions() -> Result<Vec<PathBuf>> {
    let sessions_path = ensure_sessions_dir()?;

    let mut sessions = Vec::new();
    for entry in fs::read_dir(sessions_path)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("md") {
            sessions.push(path);
        }
    }

    // Sort by modification time (newest first)
    sessions.sort_by(|a, b| {
        let time_a = a.metadata()
            .and_then(|m| m.modified())
            .unwrap_or(std::time::SystemTime::UNIX_EPOCH);
        let time_b = b.metadata()
            .and_then(|m| m.modified())
            .unwrap_or(std::time::SystemTime::UNIX_EPOCH);
        time_b.cmp(&time_a)
    });

    Ok(sessions)
}

pub fn get_session_filename() -> String {
    Local::now().format("%Y-%m-%d_%H%M%S").to_string()
}
