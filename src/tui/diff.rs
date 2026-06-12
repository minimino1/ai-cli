use ratatui::prelude::*;
use ratatui::widgets::Cell;
use std::collections::HashSet;

#[derive(Debug, Clone)]
pub struct DiffLine {
    pub line_type: DiffLineType,
    pub content: String,
    pub line_number: Option<usize>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum DiffLineType {
    Context,
    Addition,
    Deletion,
    HunkHeader,
}

#[derive(Debug, Clone)]
pub struct DiffHunk {
    pub header: String,
    pub lines: Vec<DiffLine>,
}

#[derive(Debug, Clone)]
pub struct Diff {
    pub hunks: Vec<DiffHunk>,
    pub file_path: Option<String>,
}

impl Diff {
    pub fn parse(diff_text: &str) -> Self {
        let mut diff = Diff {
            hunks: Vec::new(),
            file_path: None,
        };

        let mut current_hunk: Option<DiffHunk> = None;
        let mut in_hunk = false;

        for line in diff_text.lines() {
            if line.starts_with("--- ") || line.starts_with("+++ ") {
                // Extract file path
                if diff.file_path.is_none() {
                    let path = line[4..].trim().to_string();
                    if !path.starts_with('/') && !path.is_empty() {
                        diff.file_path = Some(path);
                    }
                }
                continue;
            }

            if line.starts_with("@@") {
                // Start new hunk
                if let Some(hunk) = current_hunk.take() {
                    diff.hunks.push(hunk);
                }
                current_hunk = Some(DiffHunk {
                    header: line.to_string(),
                    lines: Vec::new(),
                });
                in_hunk = true;
                continue;
            }

            if in_hunk {
                if let Some(ref mut hunk) = current_hunk {
                    let line_type = if line.starts_with('+') {
                        DiffLineType::Addition
                    } else if line.starts_with('-') {
                        DiffLineType::Deletion
                    } else if line.starts_with(' ') {
                        DiffLineType::Context
                    } else {
                        // Not a diff line, might be outside hunk
                        in_hunk = false;
                        continue;
                    };

                    let content = line.chars().skip(1).collect::<String>();
                    let line_number = parse_line_number(line);

                    hunk.lines.push(DiffLine {
                        line_type,
                        content,
                        line_number,
                    });
                }
            }
        }

        if let Some(hunk) = current_hunk.take() {
            diff.hunks.push(hunk);
        }

        diff
    }

    pub fn all_lines(&self) -> Vec<&DiffLine> {
        let mut all = Vec::new();
        for hunk in &self.hunks {
            all.extend(hunk.lines.iter());
        }
        all
    }

    pub fn additions_count(&self) -> usize {
        self.all_lines()
            .iter()
            .filter(|line| line.line_type == DiffLineType::Addition)
            .count()
    }

    pub fn deletions_count(&self) -> usize {
        self.all_lines()
            .iter()
            .filter(|line| line.line_type == DiffLineType::Deletion)
            .count()
    }
}

fn parse_line_number(line: &str) -> Option<usize> {
    // Parse line numbers from hunk headers like @@ -1,5 +1,6 @@
    if line.starts_with("@@") {
        let parts: Vec<&str> = line[3..line.len() - 3].split_whitespace().collect();
        if parts.len() >= 2 {
            // Get the + line number
            let new_line_part = parts[1];
            if let Some(num_str) = new_line_part.split(',').next() {
                return num_str.parse().ok();
            }
        }
    }
    None
}

pub fn find_diffs_in_text(text: &str) -> Vec<Diff> {
    let mut diffs = Vec::new();
    let mut current_diff = String::new();
    let mut in_diff = false;

    for line in text.lines() {
        if line.starts_with("--- ") || line.starts_with("+++ ") {
            if in_diff && !current_diff.is_empty() {
                diffs.push(Diff::parse(&current_diff));
                current_diff.clear();
            }
            in_diff = true;
        }

        if in_diff {
            current_diff.push_str(line);
            current_diff.push('\n');
        }
    }

    if in_diff && !current_diff.is_empty() {
        diffs.push(Diff::parse(&current_diff));
    }

    // If no structured diff found, try to detect code blocks that look like diffs
    if diffs.is_empty() && text.contains("@@") {
        diffs.push(Diff::parse(text));
    }

    diffs
}

pub fn render_diff<'a>(diff: &'a Diff, area: Rect, buf: &mut Buffer, scroll: usize) {
    let all_lines = diff.all_lines();
    let visible_lines: Vec<&'a DiffLine> = all_lines
        .iter()
        .skip(scroll)
        .take(area.height as usize)
        .copied()
        .collect();

    for (i, line) in visible_lines.iter().enumerate() {
        let y = area.y + i as u16;
        if y >= area.y + area.height {
            break;
        }

        let x = area.x;
        let max_width = area.width.saturating_sub(1) as usize;

        // Determine style based on line type
        let (prefix, style) = match line.line_type {
            DiffLineType::Addition => ("+", Style::default().fg(Color::Green)),
            DiffLineType::Deletion => ("-", Style::default().fg(Color::Red)),
            DiffLineType::Context => (" ", Style::default()),
            DiffLineType::HunkHeader => ("@", Style::default().fg(Color::Yellow)),
        };

        // Render prefix
        let prefix_cell = Cell::from(prefix);
        buf.set_string(x, y, prefix, style);

        // Render content (truncated if needed)
        let content_start = x + 1;
        let content = if line.content.len() > max_width {
            &line.content[..max_width]
        } else {
            &line.content
        };

        buf.set_string(content_start, y, content, style);
    }
}

pub fn count_diff_lines(diff: &Diff) -> usize {
    diff.all_lines().len()
}
