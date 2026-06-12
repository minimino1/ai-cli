use super::*;
use crate::context::GitContext;
use crate::providers::{ChatRequest, Message, Role};
use crate::utils::{confirm, extract_code_block, print_error, print_info};
use anyhow::Result;
use console::style;
use std::path::PathBuf;

pub async fn run(
    config: &Config,
    files: Vec<PathBuf>,
    commit_type: &str,
    scope: Option<String>,
    breaking: bool,
    auto: bool,
) -> Result<()> {
    let provider_name = &config.default_provider;
    let provider_config = config.get_provider(provider_name)?;
    let provider = get_provider(provider_name, provider_config.api_key.as_deref())?;

    let context = GitContext::open(std::env::current_dir()?.as_path())?;

    let mut messages = Vec::new();

    // System prompt for commit message generation
    messages.push(Message {
        role: Role::System,
        content: "You are an expert programmer. Generate clear, concise commit messages following Conventional Commits format.\n\nFormat:\n<type>[optional scope]: <description>\n\n[optional body]\n\n[optional footer(s)]\n\nTypes: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert".to_string(),
    });

    // Build context
    let mut user_prompt = String::new();

    // Get staged changes
    let staged_diff = context.get_staged_diff()?;
    let staged_files = context.get_staged_files()?;

    if staged_files.is_empty() && files.is_empty() {
        print_error("No staged changes found. Stage changes with 'git add' first.");
        return Ok(());
    }

    // Get recent commits for context
    let recent_commits = context.get_recent_commits(5)?;
    if !recent_commits.is_empty() {
        user_prompt.push_str("Recent commit messages:\n");
        for commit in &recent_commits {
            user_prompt.push_str(&format!("- {}\n", commit.summary));
        }
        user_prompt.push('\n');
    }

    // Add staged files info
    user_prompt.push_str("Staged files:\n");
    for sf in &staged_files {
        user_prompt.push_str(&format!("- {} ({})\n", sf.path.display(), sf.status));
    }

    // Add diff
    if !staged_diff.is_empty() {
        user_prompt.push_str(&format!("\nChanges:\n```diff\n{}\n```\n", staged_diff));
    }

    // Add type preference
    if commit_type != "auto" {
        user_prompt.push_str(&format!("\nPreferred commit type: {}", commit_type));
    }

    if let Some(ref scope) = scope {
        user_prompt.push_str(&format!("\nScope: {}", scope));
    }

    if breaking {
        user_prompt.push_str("\nThis is a BREAKING CHANGE");
    }

    messages.push(Message {
        role: Role::User,
        content: user_prompt,
    });

    // Get AI response
    print_info(&format!("Using provider: {}", provider_name));

    let request = ChatRequest {
        messages,
        model: provider_config
            .model
            .clone()
            .unwrap_or_else(|| "gpt-4o".to_string()),
        max_tokens: provider_config.max_tokens,
        temperature: provider_config.temperature,
    };

    let response = provider.chat(request).await?;

    let commit_message = extract_code_block(&response.content).trim().to_string();

    println!("\n{}", style("Suggested commit message:").green().bold());
    println!("{}", commit_message);

    // Auto-commit or prompt
    if auto {
        if confirm("Commit with this message?")? {
            let output = std::process::Command::new("git")
                .args(["commit", "-m", &commit_message])
                .output()?;

            if output.status.success() {
                println!("\n{}", style("Committed successfully!").green().bold());
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                print_error(&format!("Commit failed: {}", error));
            }
        }
    } else {
        println!("\nTo commit, run:");
        println!("  git commit -m \"{}\"", commit_message);
    }

    Ok(())
}
