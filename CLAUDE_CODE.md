# Using OKP MCP from Claude Code

How to point Claude Code at a running OKP MCP server and use the bundled
`redhat-product` skill. For developing the server itself, see [AGENTS.md](AGENTS.md).

## 1. Start the services

Get an access key from https://access.redhat.com/offline/access, then:

```bash
podman login registry.redhat.io
podman pod create --name okp -p 127.0.0.1:8983:8983 -p 127.0.0.1:8000:8000

podman run -d --pod okp --name redhat-okp \
  -e ACCESS_KEY=<your-access-key> \
  -e SOLR_JETTY_HOST=0.0.0.0 \
  -v okp-solr-data:/opt/solr/server/solr/portal/data \
  registry.redhat.io/offline-knowledge-portal/rhokp-rhel9:1.3.0-1793303796

podman logs -f redhat-okp   # wait for "Started Solr server on port 8983"

podman run -d --pod okp --name okp-mcp \
  -e MCP_TRANSPORT=streamable-http \
  -e MCP_SOLR_URL=http://localhost:8983 \
  registry.redhat.io/rhel-cla/rhel-knowledge-bridge-rhel10:v1.0.2-1793868366
```

The tags above are examples of pinned releases; see
[docs/DISCONNECTED.md](docs/DISCONNECTED.md) for how to find current tags and their
digests. Inside the pod the MCP server reaches the RHOKP HTML mirror at
`http://localhost:8080` automatically, so `get_document` outlines carry section anchors
with no extra configuration.

For a systemd-managed setup that survives reboots, use the quadlets instead
([quadlet/README.md](quadlet/README.md)).

## 2. Register the server with Claude Code

Register the HTTP endpoint once, at user scope, under the name `okp-mcp`. The skill
expects that name (its tools are `mcp__okp-mcp__search_portal` and
`mcp__okp-mcp__get_document`):

```bash
claude mcp add --scope user --transport http okp-mcp http://localhost:8000/mcp
claude mcp list   # okp-mcp: http://localhost:8000/mcp (HTTP) - ✔ Connected
```

The repository's own `.mcp.json` also defines an `okp-mcp` server, but that one runs the
server **from source over stdio** with hot reload. It is for working on okp-mcp and needs
Solr on `localhost:8983` plus the HTML mirror on `localhost:8085` (`podman-compose up -d`).
Claude Code prompts before enabling it. If you only want to *use* the running container,
decline, or add this to `.claude/settings.local.json`:

```json
{ "disabledMcpjsonServers": ["okp-mcp"] }
```

## 3. Use the skill

The `redhat-product` skill lives in `.claude/skills/redhat-product/SKILL.md` and is picked
up automatically when Claude Code runs in this directory. Invoke it with `/redhat-product`,
or ask a question it covers:

- "How do I configure firewalld on RHEL 9?"
- "What are the FIPS requirements for RHEL 8?"
- "What does RHSA-2026:1234 fix?"

To make it available in every project, copy the directory to `~/.claude/skills/`.

The server exposes two tools:

| Tool | Arguments | Purpose |
|------|-----------|---------|
| `search_portal` | `query` (string or list of up to 3 reformulations), `max_results` (default 7) | Search docs, solutions, articles, CVEs, errata |
| `get_document` | `doc_id` (URL from search results), `query` (optional) | Fetch one document; with `query`, return the most relevant passages labelled with section anchors; without, return the section outline |

## What's here

- `CLAUDE.md`: loads `AGENTS.md` as project instructions for Claude Code
- `.claude/skills/redhat-product/SKILL.md`: the documentation search skill
- `.claude/examples/test-mcp-connection.md`: manual checks for the integration
- `.mcp.json`: stdio dev server (see above)

## Cleanup

```bash
podman pod rm -f okp            # removes both containers
podman volume rm okp-solr-data  # only if you also want to discard the index
```
