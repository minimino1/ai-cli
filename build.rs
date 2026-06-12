use clap_complete::{generate, shells};
use std::env;
use std::fs::File;
use std::io::Write;
use std::path::Path;

include!("src/cli.rs");

fn main() {
    let outdir = env::var("OUT_DIR").unwrap_or_else(|_| ".".to_string());
    let outdir = Path::new(&outdir);

    let mut cmd = Cli::command();

    // Generate bash completion
    let bash_path = outdir.join("ai.bash");
    let mut bash_file = File::create(bash_path).unwrap();
    generate(shells::Bash, &mut cmd, "ai", &mut bash_file);

    // Generate zsh completion
    let zsh_path = outdir.join("_ai");
    let mut zsh_file = File::create(zsh_path).unwrap();
    generate(shells::Zsh, &mut cmd, "ai", &mut zsh_file);

    // Generate fish completion
    let fish_path = outdir.join("ai.fish");
    let mut fish_file = File::create(fish_path).unwrap();
    generate(shells::Fish, &mut cmd, "ai", &mut fish_file);

    // Generate powershell completion
    let ps1_path = outdir.join("ai.ps1");
    let mut ps1_file = File::create(ps1_path).unwrap();
    generate(shells::PowerShell, &mut cmd, "ai", &mut ps1_file);
}
