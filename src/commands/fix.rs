use super::*;
use crate::context::GitContext;
use crate::providers::{ChatRequest, Message, Role};
use crate::utils::{confirm, extract_code_block, print_error, print_info, read_file_content};
use anyhow::Result;
use console::style;
use std::path::PathBuf;

pub async fn run(
    config: &Config,
    error: Option<String>,
    file: Option<PathBuf>,
    apply: bool,
) -> Result<()> {
    let provider_name = &config.default_provider;
    let provider_config = config.get_provider(provider_name)?;
    let provider = get_provider(provider_name, provider_config.api_key.as_deref())?;

    let mut messages = Vec::new();

    // System prompt
    messages.push(Message {
        role: Role::System,
        content: "You are an expert programmer. Analyze code errors and provide fixes. Always return the fixed code in a code block with the language identifier. Explain the fix briefly.".to_string(),
    });

    // Get context
    let context = if let Ok(ctx) = GitContext::open(std::env::current_dir()?.as_path()) {
        Some(ctx)
    } else {
        None
    };

    // Build user prompt
    let mut user_prompt = String::new();

    if let Some(ref err) = error {
        user_prompt.push_str(&format!("Error to fix: {}\n\n", err));
    }

    if let Some(ref file_path) = file {
        let content = read_file_content(file_path)?;
        let language = crate::utils::detect_language(file_path);
        user_prompt.push_str(&format!(
            "File: {}\nLanguage: {}\n\n```{}\n{}\n```\n",
            file_path.display(),
            language,
            language,
            content
        ));
    } else if let Some(ref ctx) = context {
        // Get staged files
        let staged_files = ctx.get_staged_files()?;
        if staged_files.is_empty() {
            print_error("No staged files found. Stage files with 'git add' first.");
            return Ok(());
        }

        user_prompt.push_str("Staged changes:\n\n");
        for sf in &staged_files {
            user_prompt.push_str(&format!("{}: {}\n", sf.status, sf.path.display()));
        }

        let diff = ctx.get_staged_diff()?;
        if !diff.is_empty() {
            user_prompt.push_str(&format!("\nDiff:\n```diff\n{}\n```\n", diff));
        }
    } else {
        print_error("No file specified and not in a git repository.");
        println!("Usage: ai fix <file> or run in a git repo with staged changes");
        return Ok(());
    }

    if let Some(ref err) = error {
        user_prompt.push_str(&format!("\nError message: {}", err));
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

    println!("\n{}", style("Fix:").green().bold());
    println!("{}", response.content);

    // Extract code blocks
    let fixed_code = extract_code_block(&response.content);
    if !fixed_code.is_empty() && apply {
        if let Some(ref file_path) = file {
            if confirm(&format!("Apply fix to {}?", file_path.display()))? {
                std::fs::write(file_path, &fixed_code)?;
                println!("Fix applied to {}", file_path.display());
            }
        } else {
            println!("\n{}", style("Suggested fix:").yellow().bold());
            println!("```");
            println!("{}", fixed_code);
            println!("```");
        }
    }

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
