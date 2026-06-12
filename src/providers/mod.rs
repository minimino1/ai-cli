pub mod openai;
pub mod anthropic;
pub mod ollama;
pub mod nvidia;

use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: Role,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Role {
    System,
    User,
    Assistant,
}

impl Role {
    pub fn as_str(&self) -> &str {
        match self {
            Role::System => "system",
            Role::User => "user",
            Role::Assistant => "assistant",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
    pub messages: Vec<Message>,
    pub model: String,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub content: String,
    pub model: String,
    pub usage: Option<Usage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[async_trait]
pub trait Provider: Send + Sync {
    fn name(&self) -> &str;
    fn models(&self) -> Vec<&str>;
    async fn chat(&self, request: ChatRequest) -> Result<ChatResponse>;
    async fn is_available(&self) -> bool;
}

pub fn get_provider(name: &str, api_key: Option<&str>) -> Result<Box<dyn Provider>> {
    match name {
        "openai" => Ok(Box::new(openai::OpenAIProvider::new(api_key)?)),
        "anthropic" => Ok(Box::new(anthropic::AnthropicProvider::new(api_key)?)),
        "ollama" => Ok(Box::new(ollama::OllamaProvider::new()?)),
        "nvidia" => Ok(Box::new(nvidia::NvidiaProvider::new(api_key)?)),
        _ => anyhow::bail!("Unknown provider: {}", name),
    }
}
