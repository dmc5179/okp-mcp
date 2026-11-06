# Claude Code configuration

- `skills/redhat-product/SKILL.md`: skill for searching Red Hat documentation through the
  `okp-mcp` MCP server
- `examples/test-mcp-connection.md`: manual checks for the integration
- `settings.local.json`: personal settings, git-ignored

Setup, MCP registration, and troubleshooting are in [../CLAUDE_CODE.md](../CLAUDE_CODE.md).
The project MCP config is `../.mcp.json` at the repository root; Claude Code does not read
an `mcp.json` inside `.claude/`.
