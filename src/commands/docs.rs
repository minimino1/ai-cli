use super::*;
use crate::providers::{ChatRequest, Message, Role};
use crate::utils::{detect_language, extract_code_block, print_info, read_file_content};
use anyhow::Result;
use console::style;
use std::path::PathBuf;

pub async fn run(
    config: &Config,
    target: Option<PathBuf>,
    doc_type: &str,
    output: Option<PathBuf>,
) -> Result<()> {
    let provider_name = &config.default_provider;
    let provider_config = config.get_provider(provider_name)?;
    let provider = get_provider(provider_name, provider_config.api_key.as_deref())?;

    let mut messages = Vec::new();

    // System prompt for documentation generation
    let system_prompt = match doc_type {
        "api" => "You are an expert API documentation writer. Generate comprehensive API documentation including:\n\
                   1. Endpoint descriptions\n\
                   2. Request/Response formats\n\
                   3. Parameters and their types\n\
                   4. Example requests and responses\n\
                   5. Error codes and handling\n\
                   6. Authentication requirements\n\n\
                   Use Markdown format.",
        "inline" => "You are an expert code documenter. Generate inline documentation including:\n\
                     1. Function/method descriptions\n\
                     2. Parameter documentation\n\
                     3. Return value descriptions\n\
                     4. Usage examples\n\
                     5. Edge cases and notes\n\n\
                     Use appropriate documentation format for the language.",
        "readme" => "You are an expert technical writer. Generate a comprehensive README.md including:\n\
                     1. Project title and description\n\
                     2. Features\n\
                     3. Installation instructions\n\
                     4. Usage examples\n\
                     5. Configuration options\n\
                     6. Contributing guidelines\n\
                     7. License\n\n\
                     Use Markdown format.",
        _ => "You are an expert technical writer. Generate comprehensive documentation.\n\
              Be thorough, clear, and provide examples.",
    };

    messages.push(Message {
        role: Role::System,
        content: system_prompt.to_string(),
    });

    // Get target content
    let mut user_prompt = String::new();

    if let Some(ref target_path) = target {
        if target_path.is_dir() {
            user_prompt.push_str(&format!(
                "Generate documentation for project in: {}\n\n",
                target_path.display()
            ));

            // Try to read README if exists
            let readme_path = target_path.join("README.md");
            if readme_path.exists() {
                let readme = read_file_content(&readme_path)?;
                user_prompt.push_str(&format!("Existing README:\n{}\n\n", readme));
            }

            // Try to read main source files
            let src_dir = target_path.join("src");
            if src_dir.exists() {
                user_prompt.push_str("Source files:\n");
                // Note: In a real implementation, we'd recursively read files
            }
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
        // Generate README for current directory
        user_prompt.push_str("Generate documentation for the current project.\n");
        user_prompt.push_str("Analyze the project structure and generate appropriate documentation.");
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

    println!("\n{}", style("Generated Documentation:").green().bold());
    println!("{}", response.content);

    // Extract and save
    let docs = extract_code_block(&response.content);
    if !docs.is_empty() {
        let output_path = output.unwrap_or_else(|| {
            match doc_type {
                "readme" => PathBuf::from("README.md"),
                "api" => PathBuf::from("API.md"),
                _ => PathBuf::from("docs.md"),
            }
        });

        if crate::utils::confirm(&format!("Save to {}?", output_path.display()))? {
            std::fs::write(&output_path, &docs)?;
            println!("Documentation saved to {}", output_path.display());
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
