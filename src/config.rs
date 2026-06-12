use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub default_provider: String,
    pub default_model: String,
    pub providers: HashMap<String, ProviderConfig>,
    pub templates: TemplateConfig,
    pub settings: Settings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub model: Option<String>,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateConfig {
    pub dir: Option<PathBuf>,
    pub builtin: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub auto_apply: bool,
    pub verbose: bool,
    pub color: bool,
    pub git_context: bool,
}

impl Default for Config {
    fn default() -> Self {
        let mut providers = HashMap::new();

        providers.insert(
            "openai".to_string(),
            ProviderConfig {
                api_key: None,
                base_url: Some("https://api.openai.com/v1".to_string()),
                model: Some("gpt-4o".to_string()),
                max_tokens: Some(4096),
                temperature: Some(0.7),
            },
        );

        providers.insert(
            "anthropic".to_string(),
            ProviderConfig {
                api_key: None,
                base_url: Some("https://api.anthropic.com".to_string()),
                model: Some("claude-sonnet-4-20250514".to_string()),
                max_tokens: Some(4096),
                temperature: Some(0.7),
            },
        );

        providers.insert(
            "ollama".to_string(),
            ProviderConfig {
                api_key: None,
                base_url: Some("http://localhost:11434".to_string()),
                model: Some("llama3.2".to_string()),
                max_tokens: Some(4096),
                temperature: Some(0.7),
            },
        );

        providers.insert(
            "nvidia".to_string(),
            ProviderConfig {
                api_key: None,
                base_url: Some("https://integrate.api.nvidia.com/v1".to_string()),
                model: Some("nvidia/llama-3.1-nemotron-70b-instruct".to_string()),
                max_tokens: Some(4096),
                temperature: Some(0.7),
            },
        );

        Config {
            default_provider: "ollama".to_string(),
            default_model: "llama3.2".to_string(),
            providers,
            templates: TemplateConfig {
                dir: None,
                builtin: true,
            },
            settings: Settings {
                auto_apply: false,
                verbose: false,
                color: true,
                git_context: true,
            },
        }
    }
}

impl Config {
    pub fn load(config_path: &Option<PathBuf>) -> Result<Self> {
        let path = config_path
            .clone()
            .unwrap_or_else(default_config_path);

        if path.exists() {
            let content = fs::read_to_string(&path)
                .context("Failed to read config file")?;
            let config: Config = toml::from_str(&content)
                .context("Failed to parse config file")?;
            Ok(config)
        } else {
            Ok(Config::default())
        }
    }

    pub fn save(&self, config_path: &Option<PathBuf>) -> Result<()> {
        let path = config_path
            .clone()
            .unwrap_or_else(default_config_path);

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        let content = toml::to_string_pretty(self)?;
        fs::write(path, content)?;
        Ok(())
    }

    pub fn get_provider(&self, name: &str) -> Result<&ProviderConfig> {
        self.providers
            .get(name)
            .with_context(|| format!("Provider '{}' not found", name))
    }

    pub fn set_api_key(&mut self, provider: &str, key: String) -> Result<()> {
        if let Some(config) = self.providers.get_mut(provider) {
            config.api_key = Some(key);
        } else {
            anyhow::bail!("Provider '{}' not found", provider);
        }
        Ok(())
    }
}

pub fn default_config_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ai-cli")
        .join("config.toml")
}

pub fn default_templates_dir() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ai-cli")
        .join("templates")
}
