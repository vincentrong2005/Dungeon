# 酒馆助手前端界面或脚本编写

@.cursor/rules/项目基本概念.mdc
@.cursor/rules/mcp.mdc
@.cursor/rules/酒馆变量.mdc
@.cursor/rules/酒馆助手接口.mdc
@.cursor/rules/前端界面.mdc
@.cursor/rules/脚本.mdc
@.cursor/rules/mvu变量框架.mdc
@.cursor/rules/mvu角色卡.mdc

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
