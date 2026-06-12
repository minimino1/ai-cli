package tui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbles/textarea"
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/minimino1/ai-cli/internal/config"
	"github.com/minimino1/ai-cli/internal/providers"
)

// Theme colors (OpenCode dark theme)
var (
	ColorBackground    = lipgloss.Color("#0a0a0a")
	ColorPanel         = lipgloss.Color("#141414")
	ColorElement       = lipgloss.Color("#1e1e1e")
	ColorText          = lipgloss.Color("#eeeeee")
	ColorTextMuted     = lipgloss.Color("#808080")
	ColorPrimary       = lipgloss.Color("#fab283")
	ColorSecondary     = lipgloss.Color("#5c9cf5")
	ColorAccent        = lipgloss.Color("#9d7cd8")
	ColorError         = lipgloss.Color("#e06c75")
	ColorSuccess       = lipgloss.Color("#7fd88f")
	ColorBorder        = lipgloss.Color("#484848")
	ColorBorderActive  = lipgloss.Color("#606060")
)

// Styles
var (
	appStyle = lipgloss.NewStyle().
			Background(ColorBackground).
			Foreground(ColorText)

	titleStyle = lipgloss.NewStyle().
			Foreground(ColorPrimary).
			Bold(true).
			Padding(0, 1)

	sidebarStyle = lipgloss.NewStyle().
			Background(ColorPanel).
			Border(lipgloss.NormalBorder(), false, false, false, true).
			BorderForeground(ColorBorder)

	footerStyle = lipgloss.NewStyle().
			Foreground(ColorTextMuted).
			Padding(0, 1)

	statusStyle = lipgloss.NewStyle().
			Foreground(ColorSuccess)

	errorStyle = lipgloss.NewStyle().
			Foreground(ColorError)

	accentStyle = lipgloss.NewStyle().
			Foreground(ColorAccent).
			Bold(true)

	messageStyle = lipgloss.NewStyle().
			Padding(0, 0, 0, 2)

	userIconStyle = lipgloss.NewStyle().
			Foreground(ColorPrimary)

	aiIconStyle = lipgloss.NewStyle().
			Foreground(ColorSuccess)

	promptStyle = lipgloss.NewStyle().
			Background(ColorElement).
			Border(lipgloss.NormalBorder(), false, false, false, true).
			BorderForeground(ColorBorder).
			Padding(0, 1)
)

type message struct {
	role    string
	content string
}

type model struct {
	config      *config.Config
	viewport    viewport.Model
	textarea    textarea.Model
	messages    []message
	width       int
	height      int
	err         error
	loading     bool
	ready       bool
 sidebarOpen bool
}

func initialModel(cfg *config.Config) model {
	ta := textarea.New()
	ta.Placeholder = "Ask anything..."
	ta.Focus()
	ta.CharLimit = 0
	ta.SetWidth(60)
	ta.SetHeight(1)
	ta.ShowLineNumbers = false
	ta.FocusedStyle.Base = lipgloss.NewStyle().
		Background(ColorElement).
		Foreground(ColorText)
	ta.FocusedStyle.CursorLine = lipgloss.NewStyle().
		Background(ColorElement)
	ta.FocusedStyle.Placeholder = lipgloss.NewStyle().
		Foreground(ColorTextMuted)

	return model{
		config:   cfg,
		textarea: ta,
		messages: []message{},
	}
}

func (m model) Init() tea.Cmd {
	return textarea.Blink
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var (
		taCmd tea.Cmd
		vpCmd tea.Cmd
	)

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height

		if !m.ready {
			m.viewport = viewport.New(msg.Width-42, msg.Height-6)
			m.viewport.SetContent(m.viewMessages())
			m.ready = true
		} else {
			m.viewport.Width = msg.Width - 42
			m.viewport.Height = msg.Height - 6
		}

		m.textarea.SetWidth(msg.Width - 46)
		return m, nil

	case tea.KeyMsg:
		switch msg.Type {
		case tea.KeyCtrlC, tea.KeyEsc:
			return m, tea.Quit
		case tea.KeyEnter:
			if m.loading {
				return m, nil
			}
			input := strings.TrimSpace(m.textarea.Value())
			if input == "" {
				return m, nil
			}

			// Add user message
			m.messages = append(m.messages, message{role: "You", content: input})
			m.textarea.Reset()
			m.loading = true

			// Send to AI
			return m, m.sendMessage(input)
		}

	case aiResponseMsg:
		m.loading = false
		if msg.err != nil {
			m.messages = append(m.messages, message{role: "Error", content: msg.err.Error()})
		} else {
			m.messages = append(m.messages, message{role: "AI", content: msg.content})
		}
		m.viewport.SetContent(m.viewMessages())
		m.viewport.GotoBottom()
	}

	// Handle textarea and viewport
	m.textarea, taCmd = m.textarea.Update(msg)
	m.viewport, vpCmd = m.viewport.Update(msg)

	return m, tea.Batch(taCmd, vpCmd)
}

type aiResponseMsg struct {
	content string
	err     error
}

func (m model) sendMessage(text string) tea.Cmd {
	return func() tea.Msg {
		cfg := m.config
		provider := providers.GetProvider(cfg.DefaultProvider, cfg.Providers[cfg.DefaultProvider].APIKey)

		// Build messages
		var msgs []providers.Message
		for _, msg := range m.messages {
			role := "user"
			if msg.role == "AI" {
				role = "assistant"
			}
			msgs = append(msgs, providers.Message{Role: role, Content: msg.content})
		}

		resp, err := provider.Chat(providers.ChatRequest{
			Messages:    msgs,
			Model:       cfg.DefaultModel,
			MaxTokens:   cfg.GetProvider(cfg.DefaultProvider).MaxTokens,
			Temperature: cfg.GetProvider(cfg.DefaultProvider).Temperature,
		})

		if err != nil {
			return aiResponseMsg{err: err}
		}

		return aiResponseMsg{content: resp.Content}
	}
}

func (m model) viewMessages() string {
	if len(m.messages) == 0 {
		return lipgloss.NewStyle().
			Foreground(ColorTextMuted).
			Padding(2, 4).
			Render("Start a conversation...")
	}

	var sb strings.Builder
	for _, msg := range m.messages {
		var icon, content string
		if msg.role == "You" {
			icon = userIconStyle.Render("▸")
			content = messageStyle.Render(icon + " " + msg.content)
		} else if msg.role == "Error" {
			icon = errorStyle.Render("✗")
			content = messageStyle.Render(icon + " " + errorStyle.Render(msg.content))
		} else {
			icon = aiIconStyle.Render("●")
			content = messageStyle.Render(icon + " " + msg.content)
		}
		sb.WriteString(content + "\n\n")
	}
	return sb.String()
}

func (m model) View() string {
	if !m.ready {
		return "Initializing..."
	}

	// Sidebar (42 chars)
	sidebar := m.renderSidebar()

	// Main content
	mainContent := m.renderMain()

	// Layout: main + sidebar
	return appStyle.Render(
		lipgloss.JoinHorizontal(
			lipgloss.Top,
			mainContent,
			sidebar,
		),
	)
}

func (m model) renderMain() string {
	// Header
	header := titleStyle.Render("ai-cli")

	// Messages viewport
	messages := m.viewport.View()

	// Prompt
	prompt := promptStyle.Render(m.textarea.View())

	// Footer
	footer := footerStyle.Render(m.renderFooter())

	// Stack: header + messages + prompt + footer
	return lipgloss.NewStyle().
		Width(m.width - 42).
		Render(
			lipgloss.JoinVertical(
				lipgloss.Left,
				header,
				messages,
				prompt,
				footer,
			),
		)
}

func (m model) renderSidebar() string {
	var sb strings.Builder

	// Title
	sb.WriteString(titleStyle.Render(" ai-cli ") + "\n\n")

	// Quick actions
	sb.WriteString(accentStyle.Render(" Quick") + "\n")
	sb.WriteString(" " + accentStyle.Render("f") + " Fix code\n")
	sb.WriteString(" " + accentStyle.Render("e") + " Explain\n")
	sb.WriteString(" " + accentStyle.Render("c") + " Commit\n")
	sb.WriteString(" " + accentStyle.Render("r") + " Review\n")
	sb.WriteString(" " + accentStyle.Render("t") + " Test\n\n")

	// Files
	sb.WriteString(accentStyle.Render(" Files") + "\n")
	sb.WriteString("   src/\n")
	sb.WriteString("   main.go\n")
	sb.WriteString("   go.mod\n\n")

	// Keys
	sb.WriteString(accentStyle.Render(" Keys") + "\n")
	sb.WriteString(" " + accentStyle.Render("Tab") + " panels\n")
	sb.WriteString(" " + accentStyle.Render("?") + " help\n")
	sb.WriteString(" " + accentStyle.Render("Ctrl+s") + " save\n")

	// Version footer
	sb.WriteString("\n" + footerStyle.Render(" v0.1.0"))

	return sidebarStyle.
		Width(40).
		Height(m.height - 2).
		Render(sb.String())
}

func (m model) renderFooter() string {
	status := "Ready"
	if m.loading {
		status = statusStyle.Render("● Thinking...")
	} else if m.err != nil {
		status = errorStyle.Render("✗ " + m.err.Error())
	}

	tokens := fmt.Sprintf("tok:%d", len(m.messages)*100)
	model := m.config.DefaultModel

	return lipgloss.JoinHorizontal(
		lipgloss.Top,
		statusStyle.Render(" "+status+" "),
		" │ ",
		footerStyle.Render(tokens),
		" │ ",
		footerStyle.Render(model),
	)
}

func Run(cfg *config.Config) error {
	p := tea.NewProgram(
		initialModel(cfg),
		tea.WithAltScreen(),
	)

	_, err := p.Run()
	return err
}
