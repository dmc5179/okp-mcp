# Claude Code Configuration for Red Hat OKP

This directory contains Claude Code configuration for integrating with the Red Hat Offline Knowledge Portal (OKP).

## Files

- **`mcp.json`**: MCP server configuration connecting Claude Code to the containerized OKP MCP server
- **`skills/redhat-product.skill.md`**: Skill for searching Red Hat product documentation

## Setup

### 1. Start the OKP Pod

The OKP MCP integration requires both the OKP Solr index and the MCP server running in a podman pod:

```bash
# Create the pod
podman pod create --name okp -p 8983:8983 -p 8000:8000

# Start the OKP Solr index
podman run -d --pod okp --name redhat-okp \
  -e ACCESS_KEY=<your-access-key> \
  -e SOLR_JETTY_HOST=0.0.0.0 \
  registry.redhat.io/offline-knowledge-portal/rhokp-rhel9:latest

# Wait for Solr to start (check logs)
podman logs -f redhat-okp
# Wait for: "Started Solr server on port 8983"

# Start the MCP server
podman run -d --pod okp --name okp-mcp \
  -e MCP_TRANSPORT=streamable-http \
  -e MCP_SOLR_URL=http://localhost:8983 \
  quay.io/redhat-user-workloads/rhel-lightspeed-tenant/okp-mcp
```

Get your OKP access key from: https://access.redhat.com/offline/access

### 2. Verify the Services

```bash
# Check Solr has data (should show 600k+ documents)
curl -s -4 "http://localhost:8983/solr/portal/select?q=*:*&rows=0" | python3 -m json.tool

# Check MCP server responds
curl -s -4 -N -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc": "2.0", "method": "initialize", "params": {"protocolVersion": "2025-11-25", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0"}}, "id": 1}'
```

### 3. Use with Claude Code

The MCP server is automatically configured when Claude Code runs in this project directory.

#### Using the Skill

Invoke the skill with:
```
/redhat-product
```

Or ask questions that trigger it:
- "How do I configure firewalld on RHEL 9?"
- "Search Red Hat documentation for systemd service configuration"
- "What CVEs affect RHEL 8.9?"

#### Direct MCP Tool Usage

You can also use the MCP tools directly:

```python
# Search the knowledge base
await use_mcp_tool("redhat-okp", "search_portal", {
  "query": "How to enable FIPS mode on RHEL 9?",
  "max_results": 7
})

# Get document details
await use_mcp_tool("redhat-okp", "get_document", {
  "doc_id": "https://access.redhat.com/documentation/...",
  "query": "How to enable FIPS mode on RHEL 9?"
})
```

## Alternative Setup Methods

### Using Quadlets (systemd)

For automatic startup on boot and systemd management:

```bash
# See quadlet/README.md for instructions
cd quadlet
make install
systemctl --user daemon-reload
systemctl --user start okp-pod.service
```

### Using podman-compose (Development)

```bash
OKP_ACCESS_KEY=<your-access-key> podman-compose up -d
```

Note: `podman-compose` is not supported on RHEL.

## Stopping the Services

```bash
# Stop the pod
podman pod stop okp

# Or remove it entirely (will need to re-index on next start)
podman pod rm -f okp
```

## Persistence

The default setup stores the Solr index inside the container. If you remove the container, the next start will re-download and re-index content (~10 GB, several minutes).

To persist the index across container recreations, add a named volume:

```bash
podman run -d --pod okp --name redhat-okp \
  -e ACCESS_KEY=<your-access-key> \
  -e SOLR_JETTY_HOST=0.0.0.0 \
  -v okp-solr-data:/opt/solr/server/solr/portal/data \
  registry.redhat.io/offline-knowledge-portal/rhokp-rhel9:latest
```

## Troubleshooting

### Connection Refused

If you get connection errors:

1. Check the pod is running:
   ```bash
   podman pod ps | grep okp
   ```

2. Check both containers are running:
   ```bash
   podman ps | grep -E 'redhat-okp|okp-mcp'
   ```

3. Check container logs:
   ```bash
   podman logs redhat-okp
   podman logs okp-mcp
   ```

### IPv6 Issues

On some systems (e.g., Fedora 43), `localhost` resolves to IPv6 `::1`, causing connection errors. Use the `-4` flag with curl to force IPv4:

```bash
curl -s -4 "http://localhost:8983/solr/portal/select?q=*:*&rows=0"
```

Or configure the MCP server to bind to `127.0.0.1` explicitly:

```bash
podman run -d --pod okp --name okp-mcp \
  -e MCP_TRANSPORT=streamable-http \
  -e MCP_HOST=127.0.0.1 \
  -e MCP_SOLR_URL=http://127.0.0.1:8983 \
  quay.io/redhat-user-workloads/rhel-lightspeed-tenant/okp-mcp
```

## More Information

See the main [README.md](../README.md) for detailed information about:
- OKP MCP server architecture
- Development setup
- Testing
- CI/CD
