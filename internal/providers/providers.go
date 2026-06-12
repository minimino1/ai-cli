package providers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	Messages    []Message `json:"messages"`
	Model       string    `json:"model"`
	MaxTokens   int       `json:"max_tokens,omitempty"`
	Temperature float64   `json:"temperature,omitempty"`
}

type ChatResponse struct {
	Content string
}

type Provider interface {
	Chat(req ChatRequest) (*ChatResponse, error)
	Name() string
}

func GetProvider(name, apiKey string) Provider {
	switch name {
	case "nvidia":
		return &NvidiaProvider{apiKey: apiKey}
	case "openai":
		return &OpenAIProvider{apiKey: apiKey}
	case "anthropic":
		return &AnthropicProvider{apiKey: apiKey}
	case "ollama":
		return &OllamaProvider{}
	default:
		return &NvidiaProvider{apiKey: apiKey}
	}
}

// Nvidia API
type NvidiaProvider struct {
	apiKey string
}

func (p *NvidiaProvider) Name() string { return "nvidia" }

func (p *NvidiaProvider) Chat(req ChatRequest) (*ChatResponse, error) {
	body := map[string]interface{}{
		"model":       req.Model,
		"messages":    req.Messages,
		"max_tokens":  req.MaxTokens,
		"temperature": req.Temperature,
	}

	jsonBody, _ := json.Marshal(body)
	httpReq, _ := http.NewRequest("POST", "https://integrate.api.nvidia.com/v1/chat/completions", bytes.NewBuffer(jsonBody))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("API error: %s", string(respBody))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, err
	}

	if len(result.Choices) == 0 {
		return nil, fmt.Errorf("no response from API")
	}

	return &ChatResponse{Content: result.Choices[0].Message.Content}, nil
}

// OpenAI API
type OpenAIProvider struct {
	apiKey string
}

func (p *OpenAIProvider) Name() string { return "openai" }

func (p *OpenAIProvider) Chat(req ChatRequest) (*ChatResponse, error) {
	body := map[string]interface{}{
		"model":       req.Model,
		"messages":    req.Messages,
		"max_tokens":  req.MaxTokens,
		"temperature": req.Temperature,
	}

	jsonBody, _ := json.Marshal(body)
	httpReq, _ := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonBody))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("API error: %s", string(respBody))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, err
	}

	if len(result.Choices) == 0 {
		return nil, fmt.Errorf("no response from API")
	}

	return &ChatResponse{Content: result.Choices[0].Message.Content}, nil
}

// Anthropic API
type AnthropicProvider struct {
	apiKey string
}

func (p *AnthropicProvider) Name() string { return "anthropic" }

func (p *AnthropicProvider) Chat(req ChatRequest) (*ChatResponse, error) {
	// Convert messages format
	var messages []map[string]string
	for _, m := range req.Messages {
		messages = append(messages, map[string]string{
			"role":    m.Role,
			"content": m.Content,
		})
	}

	body := map[string]interface{}{
		"model":      req.Model,
		"messages":   messages,
		"max_tokens": req.MaxTokens,
	}

	jsonBody, _ := json.Marshal(body)
	httpReq, _ := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(jsonBody))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", p.apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("API error: %s", string(respBody))
	}

	var result struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}

	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, err
	}

	if len(result.Content) == 0 {
		return nil, fmt.Errorf("no response from API")
	}

	return &ChatResponse{Content: result.Content[0].Text}, nil
}

// Ollama API (local)
type OllamaProvider struct{}

func (p *OllamaProvider) Name() string { return "ollama" }

func (p *OllamaProvider) Chat(req ChatRequest) (*ChatResponse, error) {
	body := map[string]interface{}{
		"model":    req.Model,
		"messages": req.Messages,
		"stream":   false,
	}

	jsonBody, _ := json.Marshal(body)
	httpReq, _ := http.NewRequest("POST", "http://localhost:11434/api/chat", bytes.NewBuffer(jsonBody))
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("API error: %s", string(respBody))
	}

	var result struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	}

	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, err
	}

	return &ChatResponse{Content: result.Message.Content}, nil
}
