use super::*;
use crate::providers::{ChatRequest, Message, Role};
use crate::utils::{detect_language, extract_code_block, print_error, print_info, read_file_content};
use anyhow::Result;
use console::style;
use std::path::PathBuf;

pub async fn run(
    config: &Config,
    file: PathBuf,
    framework: Option<String>,
    test_type: &str,
    edge_cases: bool,
) -> Result<()> {
    let provider_name = &config.default_provider;
    let provider_config = config.get_provider(provider_name)?;
    let provider = get_provider(provider_name, provider_config.api_key.as_deref())?;

    if !file.exists() {
        print_error(&format!("File not found: {}", file.display()));
        return Ok(());
    }

    let content = read_file_content(&file)?;
    let language = detect_language(&file);

    let mut messages = Vec::new();

    // System prompt for test generation
    let system_prompt = format!(
        "You are an expert test writer. Generate comprehensive tests for the given code.\n\n\
         Language: {}\n\
         Test type: {}\n\
         {}\n\n\
         Generate tests that:\n\
         1. Cover main functionality\n\
         2. Include edge cases\n\
         3. Test error handling\n\
         4. Are well-organized\n\
         5. Follow {} testing best practices\n\n\
         Return the test code in a properly formatted code block.",
        language,
        test_type,
        if edge_cases {
            "Include comprehensive edge cases."
        } else {
            "Focus on main functionality."
        },
        framework.as_deref().unwrap_or(&language)
    );

    messages.push(Message {
        role: Role::System,
        content: system_prompt,
    });

    // Build user prompt
    let user_prompt = format!(
        "Generate tests for:\n\nFile: {}\n\n```{}\n{}\n```",
        file.display(),
        language,
        content
    );

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

    println!("\n{}", style("Generated Tests:").green().bold());
    println!("{}", response.content);

    // Extract and optionally save tests
    let test_code = extract_code_block(&response.content);
    if !test_code.is_empty() {
        // Determine test file name
        let test_file = match test_type {
            "unit" => file.with_extension(format!("test.{}", language)),
            "integration" => file.with_extension(format!("integration.{}", language)),
            _ => file.with_extension(format!("spec.{}", language)),
        };

        println!("\n{}", style("Test file:").yellow().bold());
        println!("{}", test_file.display());

        if crate::utils::confirm(&format!("Save tests to {}?", test_file.display()))? {
            std::fs::write(&test_file, &test_code)?;
            println!("Tests saved to {}", test_file.display());
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
