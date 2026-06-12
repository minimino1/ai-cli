use anyhow::Result;
use git2::{Delta, DiffFormat, DiffOptions, Repository};
use std::path::{Path, PathBuf};

pub struct GitContext {
    pub repo: Repository,
}

impl GitContext {
    pub fn open(path: &Path) -> Result<Self> {
        let repo = Repository::discover(path)?;
        Ok(GitContext { repo })
    }

    pub fn get_staged_diff(&self) -> Result<String> {
        let diff = self.get_staged_diff_internal()?;
        let mut diff_text = String::new();
        diff.print(DiffFormat::Patch, |_delta, _hunk, line| {
            diff_text.push_str(&String::from_utf8_lossy(line.content()));
            true
        })?;
        Ok(diff_text)
    }

    fn get_staged_diff_internal(&self) -> Result<git2::Diff<'_>> {
        let head = self.repo.head()?;
        let head_tree = head.peel_to_tree()?;
        let index = self.repo.index()?;

        let mut diff_options = DiffOptions::new();
        let diff = self.repo.diff_tree_to_index(
            Some(&head_tree),
            Some(&index),
            Some(&mut diff_options),
        )?;

        Ok(diff)
    }

    pub fn get_staged_files(&self) -> Result<Vec<StagedFile>> {
        let diff = self.get_staged_diff_internal()?;
        let mut files = Vec::new();

        for delta in diff.deltas() {
            let old_file = delta.old_file().path().map(|p| p.to_path_buf());
            let new_file = delta.new_file().path().map(|p| p.to_path_buf());
            let status = match delta.status() {
                Delta::Added => "added",
                Delta::Deleted => "deleted",
                Delta::Modified => "modified",
                Delta::Renamed => "renamed",
                Delta::Copied => "copied",
                _ => "other",
            };

            files.push(StagedFile {
                path: new_file.or(old_file).unwrap_or_default(),
                status: status.to_string(),
            });
        }

        Ok(files)
    }

    pub fn get_recent_commits(&self, count: usize) -> Result<Vec<CommitInfo>> {
        let mut revwalk = self.repo.revwalk()?;
        revwalk.set_sorting(git2::Sort::TIME)?;
        revwalk.push_head()?;

        let mut commits = Vec::new();
        for (i, id) in revwalk.enumerate() {
            if i >= count {
                break;
            }
            let id = id?;
            let commit = self.repo.find_commit(id)?;
            let summary = commit
                .summary()
                .unwrap_or_default()
                .to_string();

            commits.push(CommitInfo { summary });
        }

        Ok(commits)
    }
}

#[derive(Debug)]
pub struct StagedFile {
    pub path: PathBuf,
    pub status: String,
}

#[derive(Debug)]
pub struct CommitInfo {
    pub summary: String,
}
