use anyhow::Result;
use std::io::{self, Read};
use std::path::{Path, PathBuf};

pub fn read_file_content(path: &Path) -> Result<String> {
    let content = std::fs::read_to_string(path)?;
    Ok(content)
}

pub fn read_stdin() -> Result<String> {
    let mut buffer = String::new();
    io::stdin().read_to_string(&mut buffer)?;
    Ok(buffer)
}

pub fn read_input(prompt: &str) -> Result<String> {
    eprint!("{} ", prompt);
    let mut buffer = String::new();
    io::stdin().read_line(&mut buffer)?;
    Ok(buffer.trim().to_string())
}

pub fn confirm(prompt: &str) -> Result<bool> {
    eprint!("{} [y/N] ", prompt);
    let mut buffer = String::new();
    io::stdin().read_line(&mut buffer)?;
    Ok(buffer.trim().to_lowercase() == "y")
}

pub fn extract_code_block(text: &str) -> String {
    if let Some(start) = text.find("```") {
        let rest = &text[start + 3..];
        let code_start = rest.find('\n').map(|n| n + 1).unwrap_or(0);
        if let Some(end) = rest[code_start..].find("```") {
            return rest[code_start..code_start + end].to_string();
        }
    }
    text.to_string()
}

pub fn detect_language(path: &Path) -> String {
    match path.extension().and_then(|e| e.to_str()) {
        Some("rs") => "rust",
        Some("py") => "python",
        Some("js") => "javascript",
        Some("ts") => "typescript",
        Some("jsx") => "javascript",
        Some("tsx") => "typescript",
        Some("go") => "go",
        Some("c") => "c",
        Some("cpp" | "cc" | "cxx") => "c++",
        Some("java") => "java",
        Some("rb") => "ruby",
        Some("php") => "php",
        Some("swift") => "swift",
        Some("kt" | "kts") => "kotlin",
        Some("sh" | "bash") => "bash",
        Some("zsh") => "zsh",
        Some("fish") => "fish",
        Some("sql") => "sql",
        Some("html") => "html",
        Some("css") => "css",
        Some("json") => "json",
        Some("yaml" | "yml") => "yaml",
        Some("toml") => "toml",
        Some("md") => "markdown",
        Some("xml") => "xml",
        Some("proto") => "protobuf",
        Some("dart") => "dart",
        Some("lua") => "lua",
        Some("r") => "r",
        Some("R") => "r",
        Some("ex" | "exs") => "elixir",
        Some("erl" | "hrl") => "erlang",
        Some("hs") => "haskell",
        Some("clj" | "cljs") => "clojure",
        Some("scala") => "scala",
        Some("sol") => "solidity",
        _ => "text",
    }
    .to_string()
}

pub fn print_error(msg: &str) {
    use colored::*;
    eprintln!("{} {}", "error:".red().bold(), msg);
}

pub fn print_info(msg: &str) {
    use colored::*;
    eprintln!("{} {}", "info:".blue().bold(), msg);
}

/// Load a template by name. Checks user config dir first, then falls back to default.
pub fn load_template(name: &str) -> String {
    // Try user config dir first
    if let Some(config_dir) = dirs::config_dir() {
        let user_template = config_dir.join("ai-cli").join("templates").join(format!("{}.txt", name));
        if let Ok(content) = std::fs::read_to_string(&user_template) {
            return content;
        }
    }
    
    // Default templates (embedded at compile time)
    match name {
        "fix" => include_str!("../templates/fix.txt").to_string(),
        "explain" => include_str!("../templates/explain.txt").to_string(),
        "commit" => include_str!("../templates/commit.txt").to_string(),
        _ => format!("You are an expert programmer. Help with the following task:\n\n{{}}"),
    }
}
