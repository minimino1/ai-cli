use super::*;
use anyhow::{Context, Result};
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};

pub struct AnthropicProvider {
    client: Client,
    api_key: String,
    base_url: String,
}

#[derive(Serialize)]
struct AnthropicRequest {
    model: String,
    max_tokens: u32,
    messages: Vec<AnthropicMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
}

#[derive(Serialize, Deserialize)]
struct AnthropicMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct AnthropicResponse {
    content: Vec<AnthropicContent>,
    usage: Option<AnthropicUsage>,
}

#[derive(Deserialize)]
struct AnthropicContent {
    text: String,
}

#[derive(Deserialize)]
struct AnthropicUsage {
    input_tokens: u32,
    output_tokens: u32,
}

impl AnthropicProvider {
    pub fn new(api_key: Option<&str>) -> Result<Self> {
        let api_key = api_key
            .or_else(|| std::env::var("ANTHROPIC_API_KEY").ok())
            .context("Anthropic API key not found. Set ANTHROPIC_API_KEY or use 'ai config apikey anthropic --key YOUR_KEY'")?
            .to_string();

        Ok(AnthropicProvider {
            client: Client::new(),
            api_key,
            base_url: "https://api.anthropic.com".to_string(),
        })
    }
}

#[async_trait]
impl Provider for AnthropicProvider {
    fn name(&self) -> &str {
        "anthropic"
    }

    fn models(&self) -> Vec<&str> {
        vec![
            "claude-sonnet-4-20250514",
            "claude-3-5-sonnet-20241022",
            "claude-3-5-haiku-20241022",
            "claude-3-opus-20240229",
        ]
    }

    async fn chat(&self, request: ChatRequest) -> Result<ChatResponse> {
        let mut system_message = None;
        let mut messages = Vec::new();

        for msg in &request.messages {
            match msg.role {
                Role::System => {
                    system_message = Some(msg.content.clone());
                }
                _ => {
                    messages.push(AnthropicMessage {
                        role: msg.role.as_str().to_string(),
                        content: msg.content.clone(),
                    });
                }
            }
        }

        let body = AnthropicRequest {
            model: request.model,
            max_tokens: request.max_tokens.unwrap_or(4096),
            messages,
            system: system_message,
            temperature: request.temperature,
        };

        let response = self
            .client
            .post(format!("{}/v1/messages", self.base_url))
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .context("Failed to send request to Anthropic")?;

        if !response.status().is_success() {
            let error = response.text().await.unwrap_or_default();
            anyhow::bail!("Anthropic API error: {}", error);
        }

        let anthropic_response: AnthropicResponse = response
            .json()
            .await
            .context("Failed to parse Anthropic response")?;

        let content = anthropic_response
            .content
            .first()
            .map(|c| c.text.clone())
            .unwrap_or_default();

        Ok(ChatResponse {
            content,
            model: request.model,
            usage: anthropic_response.usage.map(|u| Usage {
                prompt_tokens: u.input_tokens,
                completion_tokens: u.output_tokens,
                total_tokens: u.input_tokens + u.output_tokens,
            }),
        })
    }

    async fn is_available(&self) -> bool {
        self.client
            .get(format!("{}/v1/messages", self.base_url))
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .send()
            .await
            .map(|r| r.status().is_success())
            .unwrap_or(false)
    }
}
