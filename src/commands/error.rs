use super::*;
use crate::providers::{ChatRequest, Message, Role};
use crate::utils::print_info;
use anyhow::Result;
use console::style;

pub async fn run(
    config: &Config,
    message: &str,
    language: Option<String>,
    show_fix: bool,
) -> Result<()> {
    let provider_name = &config.default_provider;
    let provider_config = config.get_provider(provider_name)?;
    let provider = get_provider(provider_name, provider_config.api_key.as_deref())?;

    let mut messages = Vec::new();

    // System prompt for error translation
    let system_prompt = if show_fix {
        "You are an expert programmer. Explain error messages in plain language and provide solutions.\n\n\
         For each error:\n\
         1. Explain what the error means in simple terms\n\
         2. Identify the likely cause\n\
         3. Provide a step-by-step fix\n\
         4. Show example code if applicable\n\n\
         Be helpful and thorough."
    } else {
        "You are an expert programmer. Explain error messages in plain language.\n\n\
         For each error:\n\
         1. Explain what the error means in simple terms\n\
         2. Identify the likely cause\n\
         3. Suggest how to fix it\n\n\
         Be clear and concise."
    };

    messages.push(Message {
        role: Role::System,
        content: system_prompt.to_string(),
    });

    // Build user prompt
    let mut user_prompt = format!("Explain this error:\n\n{}", message);

    if let Some(ref lang) = language {
        user_prompt.push_str(&format!("\n\nLanguage/Context: {}", lang));
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

    println!("\n{}", style("Error Explanation:").green().bold());
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
