use clap::{Parser, Subcommand, ValueHint};
use std::path::PathBuf;

/// ai-cli - AI-powered code assistant
#[derive(Parser, Debug)]
#[command(
    name = "ai",
    version,
    about = "AI-powered CLI for code assistance - fix, explain, review, and more",
    long_about = "A powerful CLI tool that integrates with multiple AI providers to help you with coding tasks."
)]
pub struct Cli {
    /// Path to config file
    #[arg(short, long, value_hint = ValueHint::FilePath)]
    pub config: Option<PathBuf>,

    /// AI provider to use
    #[arg(short, long, global = true)]
    pub provider: Option<String>,

    /// Model to use
    #[arg(short, long, global = true)]
    pub model: Option<String>,

    /// Output format (text, json, markdown)
    #[arg(short, long, global = true, default_value = "text")]
    pub format: String,

    /// Verbose output
    #[arg(short, long, global = true)]
    pub verbose: bool,

    /// Dry run - show what would be done
    #[arg(long, global = true)]
    pub dry_run: bool,

    #[command(subcommand)]
    pub command: Option<Commands>,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    /// Fix code errors or issues
    Fix {
        /// Error message or description of the issue
        #[arg(value_hint = ValueHint::Other)]
        error: Option<String>,

        /// File to fix (uses git context if not provided)
        #[arg(short, long, value_hint = ValueHint::FilePath)]
        file: Option<PathBuf>,

        /// Apply fixes directly to files
        #[arg(short, long)]
        apply: bool,
    },

    /// Explain code
    Explain {
        /// File or code to explain
        #[arg(value_hint = ValueHint::FilePath)]
        target: Option<String>,

        /// Specific line range (e.g., "10-20")
        #[arg(short, long)]
        lines: Option<String>,

        /// Include examples
        #[arg(short, long)]
        examples: bool,
    },

    /// Generate commit message from staged changes
    Commit {
        /// Specific files to include
        #[arg(value_hint = ValueHint::FilePath)]
        files: Vec<PathBuf>,

        /// Conventional commit type
        #[arg(short, long, default_value = "auto")]
        commit_type: String,

        /// Scope for conventional commit
        #[arg(short, long)]
        scope: Option<String>,

        /// Breaking change
        #[arg(short = 'B', long)]
        breaking: bool,

        /// Auto-commit without prompt
        #[arg(short, long)]
        auto: bool,
    },

    /// Review code for issues
    Review {
        /// File or directory to review
        #[arg(value_hint = ValueHint::FilePath)]
        target: Option<PathBuf>,

        /// Review scope (security, performance, style, all)
        #[arg(short, long, default_value = "all")]
        scope: String,

        /// Severity filter (info, warning, error)
        #[arg(short, long)]
        severity: Option<String>,
    },

    /// Generate tests for code
    Test {
        /// File to generate tests for
        #[arg(value_hint = ValueHint::FilePath)]
        file: PathBuf,

        /// Test framework
        #[arg(short, long)]
        framework: Option<String>,

        /// Test type (unit, integration, all)
        #[arg(short, long, default_value = "unit")]
        test_type: String,

        /// Include edge cases
        #[arg(short, long)]
        edge_cases: bool,
    },

    /// Generate shell scripts
    Shell {
        /// Description of what the script should do
        description: String,

        /// Shell type (bash, zsh, fish, powershell)
        #[arg(short, long, default_value = "bash")]
        shell_type: String,

        /// Make script executable
        #[arg(short, long)]
        executable: bool,
    },

    /// Generate SQL queries
    Sql {
        /// Description of the query in natural language
        description: String,

        /// Database type (sqlite, postgres, mysql)
        #[arg(short, long, default_value = "sqlite")]
        database: String,

        /// Schema file
        #[arg(short, long, value_hint = ValueHint::FilePath)]
        schema: Option<PathBuf>,
    },

    /// Translate error messages
    Error {
        /// Error message to translate
        message: String,

        /// Programming language
        #[arg(short, long)]
        language: Option<String>,

        /// Show suggested fixes
        #[arg(short, long)]
        fix: bool,
    },

    /// Generate documentation
    Docs {
        /// File or directory to document
        #[arg(value_hint = ValueHint::FilePath)]
        target: Option<PathBuf>,

        /// Documentation type (readme, api, inline, all)
        #[arg(short, long, default_value = "readme")]
        doc_type: String,

        /// Output file
        #[arg(short, long, value_hint = ValueHint::FilePath)]
        output: Option<PathBuf>,
    },

    /// Suggest refactoring improvements
    Refactor {
        /// File or directory to analyze
        #[arg(value_hint = ValueHint::FilePath)]
        target: Option<PathBuf>,

        /// Refactoring type (performance, readability, architecture, all)
        #[arg(short, long, default_value = "all")]
        refactor_type: String,

        /// Apply changes
        #[arg(short, long)]
        apply: bool,
    },

    /// Configure ai-cli
    Config {
        #[command(subcommand)]
        action: ConfigAction,
    },

    /// List available models
    Models {
        /// Provider to list models for
        #[arg(short, long)]
        provider: Option<String>,
    },

    /// Manage custom templates
    Template {
        #[command(subcommand)]
        action: TemplateAction,
    },
}

#[derive(Subcommand, Debug)]
pub enum ConfigAction {
    /// Show current configuration
    Show,
    /// Set a config value
    Set {
        /// Config key (e.g., "default_provider")
        key: String,
        /// Config value
        value: String,
    },
    /// Add an API key
    ApiKey {
        /// Provider name
        provider: String,
        /// API key
        #[arg(long)]
        key: String,
    },
    /// Initialize config file
    Init,
}

#[derive(Subcommand, Debug)]
pub enum TemplateAction {
    /// List available templates
    List,
    /// Create a new template
    Create {
        /// Template name
        name: String,
        /// Template content
        #[arg(short, long)]
        content: Option<String>,
        /// Read from file
        #[arg(short, long, value_hint = ValueHint::FilePath)]
        file: Option<PathBuf>,
    },
    /// Edit a template
    Edit {
        /// Template name
        name: String,
    },
    /// Delete a template
    Delete {
        /// Template name
        name: String,
    },
    /// Show template content
    Show {
        /// Template name
        name: String,
    },
}
