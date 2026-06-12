use anyhow::Result;
use console::Term;
use std::io::{self, Read};
use std::path::Path;

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
    let term = Term::stdout();
    let mut buffer = String::new();
    io::stdin().read_line(&mut buffer)?;
    Ok(buffer.trim().to_lowercase() == "y")
}

pub fn truncate_str(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        s.to_string()
    } else {
        format!("{}...", &s[..max_len - 3])
    }
}

pub fn extract_code_block(text: &str) -> String {
    if let Some(start) = text.find("```") {
        let rest = &text[start + 3..];
        // Skip language identifier if present
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
        Some("rs") => "rust",
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

pub fn print_warning(msg: &str) {
    use colored::*;
    eprintln!("{} {}", "warning:".yellow().bold(), msg);
}

pub fn print_success(msg: &str) {
    use colored::*;
    eprintln!("{} {}", "success:".green().bold(), msg);
}

pub fn print_info(msg: &str) {
    use colored::*;
    eprintln!("{} {}", "info:".blue().bold(), msg);
}
