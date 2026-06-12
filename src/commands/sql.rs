use super::*;
use crate::providers::{ChatRequest, Message, Role};
use crate::utils::{extract_code_block, print_info, read_file_content};
use anyhow::Result;
use console::style;
use std::path::PathBuf;

pub async fn run(
    config: &Config,
    description: &str,
    database: &str,
    schema: Option<PathBuf>,
) -> Result<()> {
    let provider_name = &config.default_provider;
    let provider_config = config.get_provider(provider_name)?;
    let provider = get_provider(provider_name, provider_config.api_key.as_deref())?;

    let mut messages = Vec::new();

    // System prompt for SQL generation
    let system_prompt = format!(
        "You are an expert SQL developer. Generate {} queries based on the description.\n\n\
         Requirements:\n\
         1. Use proper {} syntax\n\
         2. Include comments explaining complex parts\n\
         3. Use proper formatting for readability\n\
         4. Consider performance implications\n\
         5. Use appropriate joins and indexes\n\n\
         Return the SQL in a properly formatted code block.",
        database, database
    );

    messages.push(Message {
        role: Role::System,
        content: system_prompt,
    });

    // Build user prompt
    let mut user_prompt = format!("Create a {} query for:\n\n{}", database, description);

    // Add schema if provided
    if let Some(ref schema_path) = schema {
        if schema_path.exists() {
            let schema_content = read_file_content(schema_path)?;
            user_prompt.push_str(&format!("\n\nSchema:\n```sql\n{}\n```", schema_content));
        }
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

    println!("\n{}", style("Generated SQL:").green().bold());
    println!("{}", response.content);

    // Extract SQL
    let sql = extract_code_block(&response.content);
    if !sql.is_empty() {
        println!("\n{}", style("SQL Query:").yellow().bold());
        println!("```sql");
        println!("{}", sql);
        println!("```");

        // Offer to save
        if crate::utils::confirm("Save to query.sql?")? {
            std::fs::write("query.sql", &sql)?;
            println!("SQL saved to query.sql");
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
