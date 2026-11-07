# Testing the OKP MCP Connection

This document provides examples for testing the Red Hat OKP MCP integration with Claude Code.

## Prerequisites

Ensure the OKP pod is running:

```bash
podman pod ps | grep okp
```

You should see the pod running with ports 8983 and 8000 exposed.

## Test 1: Basic Search

Ask Claude Code to search Red Hat documentation:

```
/redhat-product

Search for "How to configure firewalld on RHEL 9"
```

Expected behavior:
- Claude Code invokes the `search_portal` tool
- Returns 5-7 relevant documentation results
- Each result includes title, URL, and synopsis

## Test 2: Multi-Query Search

Test the multi-query search capability:

```
Search Red Hat documentation for SELinux configuration in RHEL 9.
Use multiple query reformulations for better coverage.
```

Expected behavior:
- Claude Code generates 2-3 query variants
- Results are merged using reciprocal rank fusion
- Higher quality results from cross-matching queries

## Test 3: Document Retrieval

First search, then retrieve a specific document:

```
Search for "RHEL 9 systemd service configuration"

[After results are returned]

Get the full content of the top result with relevant passages about creating a systemd service.
```

Expected behavior:
- First call uses `search_portal`
- Second call uses `get_document` with the URL and query
- Returns relevant passages extracted from the large documentation page

## Test 4: CVE Lookup

Search for a specific CVE:

```
Search for CVE-2024-1086 in Red Hat documentation
```

Expected behavior:
- Returns security advisory information
- Includes affected products and versions
- Provides mitigation steps

## Test 5: Direct Tool Calls

Ask for a tool by name to bypass the skill and exercise the server directly:

```
Call mcp__okp-mcp__search_portal with query ["How do I enable FIPS mode on RHEL 9?",
"RHEL 9 FIPS 140-3 configuration steps"] and max_results 7.
```

```
Call mcp__okp-mcp__get_document with doc_id
https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/security_hardening/index
and query "FIPS mode configuration".
```

Expected behavior: the first returns ranked results with URLs; the second returns
passages labelled with section anchors such as `#switching-the-system-to-fips-mode_switching-rhel-to-fips-mode`.

## Verification Commands

### Check MCP Server Connection

```bash
# Test MCP server initialization
curl -s -4 -N -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-11-25",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0"}
    },
    "id": 1
  }'
```

Expected response should include:
```json
{
  "serverInfo": {
    "name": "RHEL OKP Knowledge Base"
  }
}
```

### Check Solr Index

```bash
# Verify Solr has data
curl -s -4 "http://localhost:8983/solr/portal/select?q=*:*&rows=0" | python3 -m json.tool
```

Expected response should show `numFound` > 600000

### Test Search via Solr Directly

```bash
# Test a simple search
curl -s -4 "http://localhost:8983/solr/portal/select?q=firewalld&rows=3&wt=json" | python3 -m json.tool
```

Should return 3 documents related to firewalld.

## Common Issues

### Issue: MCP Server Not Found

**Error**: `/mcp` does not list `okp-mcp`, or the skill reports no `mcp__okp-mcp__*` tools

**Solution**:
1. Register it: `claude mcp add --scope user --transport http okp-mcp http://localhost:8000/mcp`
2. Check it connects: `claude mcp list`
3. Verify the pod is running: `podman pod ps | grep okp`

### Issue: Connection Refused

**Error**: `Connection refused to localhost:8000`

**Solution**:
```bash
# Check if MCP container is running
podman ps | grep okp-mcp

# Restart if needed
podman restart okp-mcp

# Check logs
podman logs okp-mcp
```

### Issue: No Search Results

**Error**: Search returns "No results found"

**Solution**:
1. Verify Solr has indexed data:
   ```bash
   curl -s -4 "http://localhost:8983/solr/portal/select?q=*:*&rows=0"
   ```
2. Check if Solr indexing completed:
   ```bash
   podman logs redhat-okp | grep -i "started solr"
   ```
3. Try a simpler query first (e.g., "RHEL")

### Issue: IPv6 Connection Problems

**Error**: Connection reset by peer

**Solution**: Use `-4` flag to force IPv4 or bind to `127.0.0.1`:
```bash
podman rm -f okp-mcp
podman run -d --pod okp --name okp-mcp \
  -e MCP_TRANSPORT=streamable-http \
  -e MCP_HOST=127.0.0.1 \
  -e MCP_SOLR_URL=http://127.0.0.1:8983 \
  registry.redhat.io/rhel-cla/rhel-knowledge-bridge-rhel10:v1.0.2-1793868366
```

## Expected Performance

- **Search queries**: 1-3 seconds
- **Document retrieval**: 0.5-2 seconds
- **First Solr start**: 5-10 minutes (indexing)
- **Subsequent starts**: < 30 seconds (cached index)

## Monitoring

### Check MCP Server Metrics

```bash
curl -s http://localhost:8000/metrics
```

Provides Prometheus metrics including:
- `okp_tool_calls_total`: Count of tool invocations
- `okp_tool_duration_seconds`: Tool execution time
- `okp_solr_queries_total`, `okp_solr_query_duration_seconds`: Solr backend calls

### Watch Container Logs

```bash
# Watch MCP server logs
podman logs -f okp-mcp

# Watch Solr logs
podman logs -f redhat-okp
```

## Next Steps

After successful testing:
1. Review `.claude/skills/redhat-product/SKILL.md` for search strategy guidance
2. Check `CLAUDE_CODE.md` for setup and registration
3. See `quadlet/README.md` for systemd integration
