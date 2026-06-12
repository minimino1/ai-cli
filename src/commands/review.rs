use super::*;
use crate::context::GitContext;
use crate::providers::{ChatRequest, Message, Role};
use crate::utils::{detect_language, print_error, print_info, read_file_content};
use anyhow::Result;
use console::style;
use std::path::PathBuf;

pub async fn run(
    config: &Config,
    target: Option<PathBuf>,
    scope: &str,
    severity: Option<String>,
) -> Result<()> {
    let provider_name = &config.default_provider;
    let provider_config = config.get_provider(provider_name)?;
    let provider = get_provider(provider_name, provider_config.api_key.as_deref())?;

    let mut messages = Vec::new();

    // System prompt for code review
    let system_prompt = match scope {
        "security" => "You are a security expert. Review code for security vulnerabilities, potential exploits, and security best practices. Focus on:\n1. SQL injection\n2. XSS vulnerabilities\n3. Authentication/Authorization issues\n4. Secret exposure\n5. Input validation\n\nProvide severity (Critical/High/Medium/Low) for each issue.",
        "performance" => "You are a performance expert. Review code for performance issues and optimization opportunities. Focus on:\n1. Algorithm efficiency\n2. Memory usage\n3. Database queries\n4. Caching opportunities\n5. Async/parallel processing\n\nProvide severity (Critical/High/Medium/Low) for each issue.",
        "style" => "You are a code style expert. Review code for style issues, readability, and maintainability. Focus on:\n1. Naming conventions\n2. Code organization\n3. Comments and documentation\n4. DRY principle\n5. SOLID principles\n\nProvide severity (Critical/High/Medium/Low) for each issue.",
        _ => "You are an expert code reviewer. Review code for:\n1. Bugs and errors\n2. Security issues\n3. Performance problems\n4. Code style and readability\n5. Best practices\n\nProvide severity (Critical/High/Medium/Low) for each issue.",
    };

    messages.push(Message {
        role: Role::System,
        content: system_prompt.to_string(),
    });

    // Get target content
    let mut user_prompt = String::new();

    if let Some(ref target_path) = target {
        if target_path.is_dir() {
            // Review all files in directory
            user_prompt.push_str(&format!("Reviewing directory: {}\n\n", target_path.display()));
            // Note: In a real implementation, we'd recursively read files
            user_prompt.push_str("Note: Directory review - please review the code structure and patterns.\n");
        } else {
            let content = read_file_content(target_path)?;
            let language = detect_language(target_path);
            user_prompt.push_str(&format!(
                "File: {}\nLanguage: {}\n\n```{}\n{}\n```\n",
                target_path.display(),
                language,
                language,
                content
            ));
        }
    } else {
        // Review git context
        let context = GitContext::open(std::env::current_dir()?.as_path())?;
        let staged_diff = context.get_staged_diff()?;
        let staged_files = context.get_staged_files()?;

        if staged_files.is_empty() {
            print_error("No staged changes found. Specify a file or stage changes.");
            return Ok(());
        }

        user_prompt.push_str("Reviewing staged changes:\n\n");
        for sf in &staged_files {
            user_prompt.push_str(&format!("- {} ({})\n", sf.path.display(), sf.status));
        }

        if !staged_diff.is_empty() {
            user_prompt.push_str(&format!("\nDiff:\n```diff\n{}\n```\n", staged_diff));
        }
    }

    // Add severity filter
    if let Some(ref sev) = severity {
        user_prompt.push_str(&format!("\nOnly report issues with severity: {}", sev));
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
            .unwrap_or_else(|| config.default_model.clone()),
        max_tokens: provider_config.max_tokens,
        temperature: provider_config.temperature,
    };

    let response = provider.chat(request).await?;

    println!("\n{}", style("Code Review:").green().bold());
    println!("{}", response.content);

    // Show usage if available
    if let Some(usage) = &response.usage {
        println!(
            "\n{} tokens: {} prompt, {} completion",
            style("Usage:").dim(),
            usage.prompt_tokens,
            usage.completion_tokens
        );
    }

    Ok(())
}
