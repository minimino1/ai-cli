mod cli;
mod config;
mod context;
mod providers;
mod commands;
mod utils;

use anyhow::Result;
use clap::Parser;
use cli::Cli;
use config::Config;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing::Level::WARN.into()),
        )
        .init();

    let cli = Cli::parse();
    let config = Config::load(&cli.config)?;

    match cli.command {
        Some(cmd) => commands::execute(cmd, &config).await,
        None => {
            // Interactive mode or show help
            eprintln!("ai-cli - AI-powered code assistant");
            eprintln!("Run 'ai --help' for usage information");
            Ok(())
        }
    }
}
