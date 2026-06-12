pub mod fix;
pub mod explain;
pub mod commit;
pub mod review;
pub mod test;
pub mod shell;
pub mod sql;
pub mod error;
pub mod docs;
pub mod refactor;

use crate::cli::{Commands, ConfigAction, TemplateAction};
use crate::config::{Config, default_config_path, default_templates_dir};
use crate::providers::get_provider;
use anyhow::Result;

pub async fn execute(cmd: Commands, config: &Config) -> Result<()> {
    match cmd {
        Commands::Fix { error, file, apply } => {
            fix::run(config, error, file, apply).await
        }
        Commands::Explain { target, lines, examples } => {
            explain::run(config, target, lines, examples).await
        }
        Commands::Commit { files, commit_type, scope, breaking, auto } => {
            commit::run(config, files, &commit_type, scope, breaking, auto).await
        }
        Commands::Review { target, scope, severity } => {
            review::run(config, target, &scope, severity).await
        }
        Commands::Test { file, framework, test_type, edge_cases } => {
            test::run(config, file, framework, &test_type, edge_cases).await
        }
        Commands::Shell { description, shell_type, executable } => {
            shell::run(config, &description, &shell_type, executable).await
        }
        Commands::Sql { description, database, schema } => {
            sql::run(config, &description, &database, schema).await
        }
        Commands::Error { message, language, fix: show_fix } => {
            error::run(config, &message, language, show_fix).await
        }
        Commands::Docs { target, doc_type, output } => {
            docs::run(config, target, &doc_type, output).await
        }
        Commands::Refactor { target, refactor_type, apply } => {
            refactor::run(config, target, &refactor_type, apply).await
        }
        Commands::Config { action } => {
            handle_config(action).await
        }
        Commands::Models { provider } => {
            handle_models(config, provider).await
        }
        Commands::Template { action } => {
            handle_template(action).await
        }
    }
}

async fn handle_config(action: ConfigAction) -> Result<()> {
    match action {
        ConfigAction::Show => {
            let path = default_config_path();
            if path.exists() {
                let content = std::fs::read_to_string(&path)?;
                println!("{}", content);
            } else {
                println!("No config file found at {}", path.display());
                println!("Run 'ai config init' to create one.");
            }
            Ok(())
        }
        ConfigAction::Set { key, value } => {
            let mut config = Config::load(&None)?;
            let key_clone = key.clone();
            match key.as_str() {
                "default_provider" => config.default_provider = value,
                "default_model" => config.default_model = value,
                "settings.auto_apply" => config.settings.auto_apply = value.parse()?,
                "settings.verbose" => config.settings.verbose = value.parse()?,
                "settings.color" => config.settings.color = value.parse()?,
                "settings.git_context" => config.settings.git_context = value.parse()?,
                _ => anyhow::bail!("Unknown config key: {}", key),
            }
            config.save(&None)?;
            println!("Config updated: {}", key_clone);
            Ok(())
        }
        ConfigAction::ApiKey { provider, key } => {
            let mut config = Config::load(&None)?;
            config.set_api_key(&provider, key)?;
            config.save(&None)?;
            println!("API key set for provider: {}", provider);
            Ok(())
        }
        ConfigAction::Init => {
            let config = Config::default();
            config.save(&None)?;
            println!("Config file created at {}", default_config_path().display());
            Ok(())
        }
    }
}

async fn handle_models(config: &Config, provider: Option<String>) -> Result<()> {
    let provider_name = provider.as_deref().unwrap_or(&config.default_provider);
    let provider_config = config.get_provider(provider_name)?;
    let provider = get_provider(provider_name, provider_config.api_key.as_deref())?;

    println!("Models for {}:", provider_name);
    for model in provider.models() {
        println!("  - {}", model);
    }
    Ok(())
}

async fn handle_template(action: TemplateAction) -> Result<()> {
    let templates_dir = default_templates_dir();
    std::fs::create_dir_all(&templates_dir)?;

    match action {
        TemplateAction::List => {
            if templates_dir.exists() {
                let entries: Vec<_> = std::fs::read_dir(&templates_dir)?
                    .filter_map(|e| e.ok())
                    .filter(|e| e.path().extension().map(|ext| ext == "txt").unwrap_or(false))
                    .collect();

                if entries.is_empty() {
                    println!("No templates found in {}", templates_dir.display());
                } else {
                    println!("Templates:");
                    for entry in entries {
                        let name = entry.file_name().to_string_lossy().to_string();
                        println!("  - {}", name.trim_end_matches(".txt"));
                    }
                }
            } else {
                println!("Templates directory not found");
            }
            Ok(())
        }
        TemplateAction::Create { name, content, file } => {
            let template_path = templates_dir.join(format!("{}.txt", name));
            if template_path.exists() {
                anyhow::bail!("Template '{}' already exists", name);
            }

            let content = if let Some(content) = content {
                content
            } else if let Some(file) = file {
                std::fs::read_to_string(file)?
            } else {
                crate::utils::read_input("Enter template content (or use --file):")?
            };

            std::fs::write(&template_path, content)?;
            println!("Template '{}' created at {}", name, template_path.display());
            Ok(())
        }
        TemplateAction::Edit { name } => {
            let template_path = templates_dir.join(format!("{}.txt", name));
            if !template_path.exists() {
                anyhow::bail!("Template '{}' not found", name);
            }

            let content = std::fs::read_to_string(&template_path)?;
            println!("Current content of '{}':", name);
            println!("---");
            println!("{}", content);
            println!("---");
            println!("Edit the file at: {}", template_path.display());
            Ok(())
        }
        TemplateAction::Delete { name } => {
            let template_path = templates_dir.join(format!("{}.txt", name));
            if !template_path.exists() {
                anyhow::bail!("Template '{}' not found", name);
            }

            if crate::utils::confirm(&format!("Delete template '{}'?", name))? {
                std::fs::remove_file(&template_path)?;
                println!("Template '{}' deleted", name);
            }
            Ok(())
        }
        TemplateAction::Show { name } => {
            let template_path = templates_dir.join(format!("{}.txt", name));
            if !template_path.exists() {
                anyhow::bail!("Template '{}' not found", name);
            }

            let content = std::fs::read_to_string(&template_path)?;
            println!("{}", content);
            Ok(())
        }
    }
}
