use super::*;
use anyhow::{Context, Result};
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};

pub struct NvidiaProvider {
    client: Client,
    api_key: String,
    base_url: String,
}

#[derive(Serialize)]
struct NvidiaRequest {
    model: String,
    messages: Vec<NvidiaMessage>,
    max_tokens: Option<u32>,
    temperature: Option<f32>,
    stream: bool,
}

#[derive(Serialize, Deserialize)]
struct NvidiaMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct NvidiaResponse {
    choices: Vec<NvidiaChoice>,
    usage: Option<NvidiaUsage>,
}

#[derive(Deserialize)]
struct NvidiaChoice {
    message: NvidiaMessage,
}

#[derive(Deserialize)]
struct NvidiaUsage {
    prompt_tokens: u32,
    completion_tokens: u32,
    total_tokens: u32,
}

impl NvidiaProvider {
    pub fn new(api_key: Option<&str>) -> Result<Self> {
        let api_key = api_key
            .or_else(|| std::env::var("NVIDIA_API_KEY").ok())
            .context("NVIDIA API key not found. Set NVIDIA_API_KEY or use 'ai config apikey nvidia --key YOUR_KEY'")?
            .to_string();

        Ok(NvidiaProvider {
            client: Client::new(),
            api_key,
            base_url: "https://integrate.api.nvidia.com/v1".to_string(),
        })
    }
}

#[async_trait]
impl Provider for NvidiaProvider {
    fn name(&self) -> &str {
        "nvidia"
    }

    fn models(&self) -> Vec<&str> {
        vec![
            "nvidia/llama-3.1-nemotron-70b-instruct",
            "nvidia/llama-3.1-8b-instruct",
            "nvidia/mistral-nemo-12b-instruct",
            "meta/llama-3.1-405b-instruct",
            "meta/llama-3.1-70b-instruct",
            "meta/llama-3.1-8b-instruct",
        ]
    }

    async fn chat(&self, request: ChatRequest) -> Result<ChatResponse> {
        let messages: Vec<NvidiaMessage> = request
            .messages
            .iter()
            .map(|m| NvidiaMessage {
                role: m.role.as_str().to_string(),
                content: m.content.clone(),
            })
            .collect();

        let body = NvidiaRequest {
            model: request.model,
            messages,
            max_tokens: request.max_tokens,
            temperature: request.temperature,
            stream: false,
        };

        let response = self
            .client
            .post(format!("{}/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .context("Failed to send request to NVIDIA")?;

        if !response.status().is_success() {
            let error = response.text().await.unwrap_or_default();
            anyhow::bail!("NVIDIA API error: {}", error);
        }

        let nvidia_response: NvidiaResponse = response
            .json()
            .await
            .context("Failed to parse NVIDIA response")?;

        let content = nvidia_response
            .choices
            .first()
            .map(|c| c.message.content.clone())
            .unwrap_or_default();

        Ok(ChatResponse {
            content,
            model: request.model,
            usage: nvidia_response.usage.map(|u| Usage {
                prompt_tokens: u.prompt_tokens,
                completion_tokens: u.completion_tokens,
                total_tokens: u.total_tokens,
            }),
        })
    }

    async fn is_available(&self) -> bool {
        self.client
            .get(format!("{}/models", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await
            .map(|r| r.status().is_success())
            .unwrap_or(false)
    }
}
