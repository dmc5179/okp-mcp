---
name: redhat-product
description: Search Red Hat product documentation through the Offline Knowledge Portal
triggers:
  - "rhel"
  - "red hat"
  - "product documentation"
  - "redhat docs"
  - "official documentation"
  - "cve"
  - "errata"
  - "kbase"
  - "knowledge base"
  - "openshift"
---

# Red Hat Product Documentation Skill

This skill provides access to official Red Hat product documentation, CVEs, errata, solutions, and articles through the Red Hat Offline Knowledge Portal (OKP) MCP server.

## When to Use

Use this skill when you need to:
- Search for official Red Hat product documentation
- Look up CVE security advisories
- Find errata and updates
- Search Red Hat knowledge base articles and solutions
- Get version-specific RHEL documentation
- Check support policies and lifecycle dates
- Find deprecation status or changes after 2024

## Prerequisites

The Red Hat Offline Knowledge Portal must be running as a container with the MCP server accessible at `http://localhost:8000/mcp`.

To verify the service is running:
```bash
curl -s -4 "http://localhost:8983/solr/portal/select?q=*:*&rows=0" | python3 -m json.tool
```

## How This Skill Works

When invoked, this skill automatically searches Red Hat's knowledge base using the `redhat-okp` MCP server. Claude will:

1. Use the `search_portal` tool to find relevant Red Hat documentation
2. Review the search results
3. Use `get_document` to fetch detailed content when needed
4. Provide you with answers based on official Red Hat documentation

## MCP Tools Used

This skill uses two tools from the `redhat-okp` MCP server that you'll see Claude invoke:

### `mcp__redhat-okp__search_portal`
Searches the Red Hat knowledge base for documentation, solutions, articles, CVEs, and errata.

**Parameters:**
- `query` (string or array): Search query or up to 3 query reformulations
- `max_results` (integer, default: 7): Maximum results (1-20)

**Best Practices for Claude:**
- Use complete sentences rather than bare keywords
- Include product names and version numbers in every query
- For multi-query searches, vary the search angle while keeping specificity
- Include RHEL-specific terminology
- For exact lookups (CVE IDs, KB numbers), a single query is sufficient

### `mcp__redhat-okp__get_document`
Fetches the full content of a specific document by its ID or URL.

**Parameters:**
- `doc_id` (string): Document ID or full URL from search results
- `query` (string, optional): Original search question to get BM25-scored relevant passages

**Best Practices for Claude:**
- Always pass the `query` parameter for documentation pages to get relevant passages
- Use the URL directly from `search_portal` results as the `doc_id`
- Documentation pages without a query will return a nudge to provide one

## How to Answer User Questions

1. **Search First**: Start with `search_portal` to find relevant documents. Use multiple query reformulations for better coverage.

2. **Review Results**: Examine the search results for relevant documents. Look for official documentation, knowledge base articles, and solutions.

3. **Fetch Details**: Use `get_document` with the original query to get detailed content from the most relevant documents.

4. **Interpret Results**: 
   - Results marked 'Applicability: RHV only' apply to Red Hat Virtualization, not standard RHEL KVM
   - Lead with deprecation/removal information when results conflict
   - Enumerate all specific releases/dates explicitly in your answer

5. **Provide Clear Answers**: Synthesize the information from official sources and provide clear, actionable guidance.

## Notes

- For well-known Linux concepts (vi commands, systemd units, common CLI tools), you may answer directly without searching
- The knowledge base contains 600k+ documents covering all Red Hat products
- Search results are ranked using reciprocal rank fusion when multiple queries are provided
- Documentation pages can exceed 500KB; relevant passages are extracted automatically when a query is provided

## Connection Details

- **MCP Server Name**: `redhat-okp`
- **Transport**: `streamable-http`
- **URL**: `http://localhost:8000/mcp`
- **Solr Endpoint**: `http://localhost:8983/solr/portal/select`

## Troubleshooting

If the MCP server is not responding:

1. Check if the OKP container is running:
   ```bash
   podman pod ps | grep okp
   ```

2. Verify Solr is responding:
   ```bash
   curl -s -4 "http://localhost:8983/solr/portal/select?q=*:*&rows=0"
   ```

3. Verify MCP server is responding:
   ```bash
   curl -s -4 -N -X POST http://localhost:8000/mcp \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc": "2.0", "method": "initialize", "params": {"protocolVersion": "2025-11-25", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0"}}, "id": 1}'
   ```

4. Check if the pod is running:
   ```bash
   podman pod start okp
   ```

See the main [README.md](../README.md) for detailed setup instructions.
