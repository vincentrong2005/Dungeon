CLAUDE.md

## Encoding Safety (Must Follow)

- All files in this repo must be edited and saved as UTF-8.
- For existing source files (`*.ts`, `*.vue`, `*.md`, `*.json`, `*.yaml`), do not use shell redirection to rewrite file content.
- Forbidden patterns: `> file`, `>> file`, `Out-File`, `Set-Content` for full-file overwrite.
- Prefer `apply_patch` for all code edits to avoid encoding corruption.
- If a file recovery is needed, do not overwrite directly from terminal output.
- Use a non-redirection git restore flow.
- After editing Chinese-containing files, run a quick sanity check.
- Ensure no obvious mojibake replacement characters (for example U+FFFD).
- Ensure TypeScript/Vue files can still be linted and parsed.
