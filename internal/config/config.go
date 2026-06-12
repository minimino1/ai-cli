package config

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type Provider struct {
	APIKey      string  `json:"api_key,omitempty"`
	Model       string  `json:"model,omitempty"`
	MaxTokens   int     `json:"max_tokens,omitempty"`
	Temperature float64 `json:"temperature,omitempty"`
}

type Config struct {
	DefaultProvider string              `json:"default_provider"`
	DefaultModel    string              `json:"default_model"`
	Providers       map[string]Provider `json:"providers"`
}

func DefaultConfig() *Config {
	return &Config{
		DefaultProvider: "nvidia",
		DefaultModel:    "gemma3n-e4b-it-q4",
		Providers: map[string]Provider{
			"nvidia": {
				MaxTokens:   4096,
				Temperature: 0.7,
			},
			"openai": {
				MaxTokens:   4096,
				Temperature: 0.7,
			},
			"anthropic": {
				MaxTokens:   4096,
				Temperature: 0.7,
			},
			"ollama": {
				MaxTokens:   4096,
				Temperature: 0.7,
			},
		},
	}
}

func configPath() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".config", "ai-cli", "config.json")
}

func Load() (*Config, error) {
	path := configPath()

	// Create default config if not exists
	if _, err := os.Stat(path); os.IsNotExist(err) {
		cfg := DefaultConfig()
		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			return nil, err
		}
		return cfg, cfg.Save()
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	cfg := DefaultConfig()
	if err := json.Unmarshal(data, cfg); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (c *Config) Save() error {
	path := configPath()
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}

func (c *Config) GetProvider(name string) Provider {
	if p, ok := c.Providers[name]; ok {
		return p
	}
	return Provider{
		MaxTokens:   4096,
		Temperature: 0.7,
	}
}
