use super::*;
use crate::providers::{ChatRequest, Message, Role};
use crate::utils::{detect_language, print_info, read_file_content};
use anyhow::Result;
use console::style;

pub async fn run(
    config: &Config,
    target: Option<String>,
    lines: Option<String>,
    examples: bool,
) -> Result<()> {
    let provider_name = &config.default_provider;
    let provider_config = config.get_provider(provider_name)?;
    let provider = get_provider(provider_name, provider_config.api_key.as_deref())?;

    let mut messages = Vec::new();

    // System prompt
    let system_prompt = if examples {
        "You are an expert programmer. Explain code in detail, including:\n1. What the code does\n2. How it works\n3. Key concepts used\n4. Potential improvements\n5. Usage examples\n\nBe clear and concise but thorough."
    } else {
        "You are an expert programmer. Explain code clearly and concisely. Focus on:\n1. What the code does\n2. How it works\n3. Key concepts"
    };

    messages.push(Message {
        role: Role::System,
        content: system_prompt.to_string(),
    });

    // Get target content
    let mut user_prompt = String::new();

    if let Some(ref target) = target {
        let path = std::path::Path::new(target);
        if path.exists() {
            let content = read_file_content(path)?;
            let language = detect_language(path);

            if let Some(ref line_range) = lines {
                let parts: Vec<&str> = line_range.split('-').collect();
                if parts.len() == 2 {
                    let start: usize = parts[0].parse().unwrap_or(1);
                    let end: usize = parts[1].parse().unwrap_or(usize::MAX);
                    let lines: Vec<&str> = content.lines().collect();
                    let selected = &lines[start.saturating_sub(1)..end.min(lines.len())];
                    user_prompt.push_str(&format!(
                        "File: {} (lines {}-{})\nLanguage: {}\n\n```{}\n{}\n```\n",
                        target,
                        start,
                        end,
                        language,
                        language,
                        selected.join("\n")
                    ));
                }
            } else {
                user_prompt.push_str(&format!(
                    "File: {}\nLanguage: {}\n\n```{}\n{}\n```\n",
                    target, language, language, content
                ));
            }
        } else {
            // Treat as code snippet
            user_prompt.push_str(&format!("Code to explain:\n\n```\n{}\n```\n", target));
        }
    } else {
        // Read from stdin
        print_info("Enter code to explain (Ctrl+D when done):");
        let stdin_code = crate::utils::read_stdin()?;
        user_prompt.push_str(&format!("Code to explain:\n\n```\n{}\n```\n", stdin_code));
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

    println!("\n{}", style("Explanation:").green().bold());
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
