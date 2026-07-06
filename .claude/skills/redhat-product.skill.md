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

## Available MCP Tools

This skill uses the following tools from the `redhat-okp` MCP server:

### search_portal
Search the Red Hat knowledge base for documentation, solutions, articles, CVEs, and errata.

**Parameters:**
- `query` (string or list of strings): Search query or list of up to 3 query reformulations
- `max_results` (int, default: 7): Maximum number of results to return (1-20)

**Best Practices:**
- Use complete sentences rather than bare keywords
- Include product names and version numbers in every query
- For multi-query searches, vary the search angle while keeping specificity
- Include RHEL-specific terminology
- For exact lookups (CVE IDs, KB numbers), a single query is sufficient

**Examples:**
```typescript
// Single query
await use_mcp_tool("redhat-okp", "search_portal", {
  query: "How do I configure firewalld on RHEL 9?"
});

// Multi-query for better coverage
await use_mcp_tool("redhat-okp", "search_portal", {
  query: [
    "Is virt-manager supported for managing virtual machines in RHEL 9?",
    "RHEL 9 virt-manager KVM virtual machine management",
    "Red Hat Enterprise Linux 9 virtualization manager tool"
  ],
  max_results: 10
});

// CVE lookup
await use_mcp_tool("redhat-okp", "search_portal", {
  query: "CVE-2024-1234"
});
```

### get_document
Fetch the full content of a specific document by its ID or URL.

**Parameters:**
- `doc_id` (string): Document ID or full URL from search results
- `query` (string, optional): Original search question to get BM25-scored relevant passages

**Best Practices:**
- Always pass the `query` parameter for documentation pages to get relevant passages
- Use the URL directly from `search_portal` results as the `doc_id`
- Documentation pages without a query will return a nudge to provide one

**Examples:**
```typescript
// Fetch document with query for relevant passages
await use_mcp_tool("redhat-okp", "get_document", {
  doc_id: "https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/index",
  query: "How to create a virtual machine with virt-manager"
});

// Fetch without query (returns metadata and nudge for docs)
await use_mcp_tool("redhat-okp", "get_document", {
  doc_id: "/solutions/12345"
});
```

## Workflow

1. **Search First**: Always start with `search_portal` to find relevant documents
2. **Review Results**: Examine the search results for relevant documents
3. **Fetch Details**: Use `get_document` with the original query to get detailed content from specific documents
4. **Interpret Results**: 
   - Results marked 'Applicability: RHV only' apply to Red Hat Virtualization, not standard RHEL KVM
   - Lead with deprecation/removal information when results conflict
   - Enumerate all specific releases/dates explicitly in your answer

## Example Usage

```typescript
// Step 1: Search for documentation
const searchResults = await use_mcp_tool("redhat-okp", "search_portal", {
  query: [
    "How do I enable FIPS mode on RHEL 9?",
    "RHEL 9 FIPS 140-3 configuration",
    "Red Hat Enterprise Linux 9 Federal Information Processing Standard"
  ],
  max_results: 7
});

// Step 2: Review results and fetch detailed content
const doc = await use_mcp_tool("redhat-okp", "get_document", {
  doc_id: "https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/security_hardening/assembly_installing-the-system-in-fips-mode_security-hardening",
  query: "How do I enable FIPS mode on RHEL 9?"
});

// Step 3: Provide answer based on official documentation
```

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
