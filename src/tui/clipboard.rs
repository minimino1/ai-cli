use anyhow::Result;
use std::process::Command;

/// Copy text to clipboard using xclip or xsel as fallback
pub fn copy_to_clipboard(text: &str) -> Result<()> {
    // Try xclip first
    if Command::new("xclip").arg("-selection").arg("clipboard").arg("-t").arg("text/plain").stdin(std::process::Stdio::piped()).spawn().is_ok() {
        let mut child = Command::new("xclip")
            .arg("-selection")
            .arg("clipboard")
            .arg("-t")
            .arg("text/plain")
            .stdin(std::process::Stdio::piped())
            .spawn()?;
        
        if let Some(mut stdin) = child.stdin.take() {
            use std::io::Write;
            stdin.write_all(text.as_bytes())?;
        }
        child.wait()?;
        return Ok(());
    }
    
    // Try xsel as fallback
    if Command::new("xsel").arg("--clipboard").arg("--input").spawn().is_ok() {
        let mut child = Command::new("xsel")
            .arg("--clipboard")
            .arg("--input")
            .stdin(std::process::Stdio::piped())
            .spawn()?;
        
        if let Some(mut stdin) = child.stdin.take() {
            use std::io::Write;
            stdin.write_all(text.as_bytes())?;
        }
        child.wait()?;
        return Ok(());
    }
    
    // Try termux-clipboard-set for Termux
    if Command::new("termux-clipboard-set").spawn().is_ok() {
        let mut child = Command::new("termux-clipboard-set")
            .stdin(std::process::Stdio::piped())
            .spawn()?;
        
        if let Some(mut stdin) = child.stdin.take() {
            use std::io::Write;
            stdin.write_all(text.as_bytes())?;
        }
        child.wait()?;
        return Ok(());
    }
    
    anyhow::bail!("No clipboard tool found (xclip, xsel, or termux-clipboard-set)")
}

/// Get clipboard content (for future paste support)
pub fn get_from_clipboard() -> Result<String> {
    // Try xclip first
    if let Ok(output) = Command::new("xclip").arg("-selection").arg("clipboard").arg("-o").output() {
        return Ok(String::from_utf8_lossy(&output.stdout).to_string());
    }
    
    // Try xsel
    if let Ok(output) = Command::new("xsel").arg("--clipboard").arg("--output").output() {
        return Ok(String::from_utf8_lossy(&output.stdout).to_string());
    }
    
    // Try termux-clipboard-get
    if let Ok(output) = Command::new("termux-clipboard-get").output() {
        return Ok(String::from_utf8_lossy(&output.stdout).to_string());
    }
    
    anyhow::bail!("No clipboard tool found")
}
