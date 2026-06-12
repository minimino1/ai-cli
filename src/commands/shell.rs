use super::*;
use crate::providers::{ChatRequest, Message, Role};
use crate::utils::{extract_code_block, print_info};
use anyhow::Result;
use console::style;

pub async fn run(
    config: &Config,
    description: &str,
    shell_type: &str,
    executable: bool,
) -> Result<()> {
    let provider_name = &config.default_provider;
    let provider_config = config.get_provider(provider_name)?;
    let provider = get_provider(provider_name, provider_config.api_key.as_deref())?;

    let mut messages = Vec::new();

    // System prompt for shell script generation
    let system_prompt = format!(
        "You are an expert shell scripter. Generate {} scripts based on the description.\n\n\
         Requirements:\n\
         1. Use proper {} syntax\n\
         2. Include error handling\n\
         3. Add helpful comments\n\
         4. Use proper quoting and escaping\n\
         5. Include usage/help information if applicable\n\
         6. Follow {} best practices\n\n\
         Return the script in a properly formatted code block.",
        shell_type,
        shell_type,
        shell_type
    );

    messages.push(Message {
        role: Role::System,
        content: system_prompt,
    });

    // Build user prompt
    let user_prompt = format!(
        "Create a {} script for:\n\n{}",
        shell_type, description
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

    println!("\n{}", style("Generated Script:").green().bold());
    println!("{}", response.content);

    // Extract script
    let script = extract_code_block(&response.content);
    if !script.is_empty() {
        println!("\n{}", style("Script:").yellow().bold());
        println!("```{}", shell_type);
        println!("{}", script);
        println!("```");

        // Offer to save
        let filename = format!("script.{}", match shell_type {
            "bash" | "sh" => "sh",
            "zsh" => "zsh",
            "fish" => "fish",
            "powershell" => "ps1",
            _ => "sh",
        });

        if crate::utils::confirm(&format!("Save to {}?", filename))? {
            std::fs::write(&filename, &script)?;
            println!("Script saved to {}", filename);

            if executable {
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    let mut perms = std::fs::metadata(&filename)?.permissions();
                    perms.set_mode(0o755);
                    std::fs::set_permissions(&filename, perms)?;
                    println!("Made executable");
                }
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
