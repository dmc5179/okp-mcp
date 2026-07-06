# Claude Code Integration

This repository includes Claude Code configuration for seamless access to Red Hat product documentation through the Offline Knowledge Portal (OKP).

## Quick Start

### 1. Start the Services

```bash
# Create pod
podman pod create --name okp -p 8983:8983 -p 8000:8000

# Start OKP Solr (get access key from https://access.redhat.com/offline/access)
podman run -d --pod okp --name redhat-okp \
  -e ACCESS_KEY=<your-access-key> \
  -e SOLR_JETTY_HOST=0.0.0.0 \
  registry.redhat.io/offline-knowledge-portal/rhokp-rhel9:latest

# Wait for Solr to start
podman logs -f redhat-okp
# Look for: "Started Solr server on port 8983"

# Start MCP server
podman run -d --pod okp --name okp-mcp \
  -e MCP_TRANSPORT=streamable-http \
  -e MCP_SOLR_URL=http://localhost:8983 \
  quay.io/redhat-user-workloads/rhel-lightspeed-tenant/okp-mcp
```

### 2. Use with Claude Code

The integration is automatically available when running Claude Code in this project directory.

#### Using the Skill

```
/redhat-product
```

Then ask questions like:
- "How do I configure firewalld on RHEL 9?"
- "What are the FIPS requirements for RHEL 8?"
- "Search for CVE-2024-1234"

#### Direct MCP Access

The `redhat-okp` MCP server provides two tools:

**search_portal**: Search the knowledge base
```python
await use_mcp_tool("redhat-okp", "search_portal", {
  "query": "How to configure SELinux on RHEL 9?",
  "max_results": 7
})
```

**get_document**: Fetch full document content
```python
await use_mcp_tool("redhat-okp", "get_document", {
  "doc_id": "https://access.redhat.com/documentation/...",
  "query": "SELinux configuration"
})
```

## What's Included

- **`.claude/mcp.json`**: MCP server connection configuration
- **`.claude/skills/redhat-product.skill.md`**: Red Hat documentation skill
- **`.claude/README.md`**: Detailed setup and troubleshooting guide

## Features

- **600k+ Documents**: Access to all Red Hat product documentation, CVEs, errata, solutions, and articles
- **Intelligent Search**: Multi-query search with reciprocal rank fusion for better coverage
- **Relevant Passages**: Automatic extraction of relevant sections from large documentation pages
- **Offline Access**: Works with the offline knowledge portal when internet access is limited

## Coverage

The OKP index includes:
- Red Hat Enterprise Linux (all versions) documentation
- Red Hat Virtualization guides
- OpenShift documentation
- Security advisories (CVEs)
- Errata and updates
- Knowledge base articles and solutions
- Support policies and lifecycle dates

## More Information

See [`.claude/README.md`](.claude/README.md) for:
- Detailed setup instructions
- Alternative installation methods (quadlets, podman-compose)
- Troubleshooting guide
- Persistence configuration

See the main [`README.md`](README.md) for:
- OKP MCP server architecture
- Development setup
- Testing and CI/CD

## Getting an Access Key

1. Log in to the Red Hat Customer Portal
2. Visit https://access.redhat.com/offline/access
3. Generate or retrieve your OKP access key
4. Use it in the `ACCESS_KEY` environment variable when starting the container

## Cleanup

```bash
# Stop the pod
podman pod stop okp

# Remove the pod (will need to re-index on next start)
podman pod rm -f okp
```
