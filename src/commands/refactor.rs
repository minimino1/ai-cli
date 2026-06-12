use super::*;
use crate::providers::{ChatRequest, Message, Role};
use crate::utils::{detect_language, extract_code_block, print_error, print_info, read_file_content};
use anyhow::Result;
use console::style;
use std::path::PathBuf;

pub async fn run(
    config: &Config,
    target: Option<PathBuf>,
    refactor_type: &str,
    apply: bool,
) -> Result<()> {
    let provider_name = &config.default_provider;
    let provider_config = config.get_provider(provider_name)?;
    let provider = get_provider(provider_name, provider_config.api_key.as_deref())?;

    let mut messages = Vec::new();

    // System prompt for refactoring
    let system_prompt = match refactor_type {
        "performance" => "You are a performance optimization expert. Analyze code and suggest performance improvements.\n\n\
                          Focus on:\n\
                          1. Algorithm efficiency (Big O)\n\
                          2. Memory usage optimization\n\
                          3. Caching opportunities\n\
                          4. Database query optimization\n\
                          5. Parallel processing\n\
                          6. Lazy loading\n\
                          7. Resource pooling\n\n\
                          Provide the refactored code with explanations.",
        "readability" => "You are a code readability expert. Analyze code and suggest improvements for readability.\n\n\
                          Focus on:\n\
                          1. Variable/function naming\n\
                          2. Code organization\n\
                          3. Comments and documentation\n\
                          4. DRY principle\n\
                          5. Single responsibility\n\
                          6. Magic number elimination\n\
                          7. Proper indentation and formatting\n\n\
                          Provide the refactored code with explanations.",
        "architecture" => "You are a software architecture expert. Analyze code and suggest architectural improvements.\n\n\
                           Focus on:\n\
                           1. Design patterns\n\
                           2. Separation of concerns\n\
                           3. Dependency injection\n\
                           4. Interface segregation\n\
                           5. SOLID principles\n\
                           6. Module organization\n\
                           7. Testability\n\n\
                           Provide the refactored code with explanations.",
        _ => "You are a code quality expert. Analyze code and suggest improvements.\n\n\
              Focus on:\n\
              1. Performance\n\
              2. Readability\n\
              3. Maintainability\n\
              4. Best practices\n\
              5. Design patterns\n\
              6. Error handling\n\
              7. Testing considerations\n\n\
              Provide the refactored code with explanations.",
    };

    messages.push(Message {
        role: Role::System,
        content: system_prompt.to_string(),
    });

    // Get target content
    let mut user_prompt = String::new();

    if let Some(ref target_path) = target {
        if !target_path.exists() {
            print_error(&format!("File not found: {}", target_path.display()));
            return Ok(());
        }

        let content = read_file_content(target_path)?;
        let language = detect_language(target_path);

        user_prompt.push_str(&format!(
            "Refactor this code:\n\nFile: {}\nLanguage: {}\n\n```{}\n{}\n```",
            target_path.display(),
            language,
            language,
            content
        ));
    } else {
        print_error("Please specify a file to refactor");
        println!("Usage: ai refactor <file>");
        return Ok(());
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

    println!("\n{}", style("Refactoring Suggestions:").green().bold());
    println!("{}", response.content);

    // Extract refactored code
    let refactored_code = extract_code_block(&response.content);
    if !refactored_code.is_empty() && apply {
        if let Some(ref target_path) = target {
            if crate::utils::confirm(&format!("Apply refactoring to {}?", target_path.display()))? {
                std::fs::write(target_path, &refactored_code)?;
                println!("Refactoring applied to {}", target_path.display());
            }
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
