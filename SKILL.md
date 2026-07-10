---
name: redhat-product
description: Search Red Hat product documentation, CVEs, errata, solutions, and support articles via OKP MCP
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
  - "ansible"
  - "satellite"
  - "virtualization"
  - "support case"
  - "lifecycle"
---

# Red Hat Product Documentation Skill

This skill provides access to official Red Hat product documentation, CVEs, errata, solutions, and articles through the Red Hat Offline Knowledge Portal (OKP) MCP server.

## When to Use

Use this skill when you need to:
- Search for official Red Hat product documentation
- Look up CVE security advisories
- Find errata and updates (RHBA, RHSA, RHEA)
- Search Red Hat knowledge base articles and solutions
- Get version-specific documentation (RHEL, OpenShift, Ansible, etc.)
- Check support policies and lifecycle dates
- Find deprecation status or changes after 2024
- Troubleshoot known issues with official solutions
- Get YAML examples and configuration guidance from docs

**Do NOT use for:**
- General Linux concepts well-known before 2024 (use existing knowledge)
- Third-party documentation (use WebSearch instead)

## Prerequisites

1. **OKP MCP Server** running
   - Connection endpoint: `http://localhost:8000/mcp`
   - Verify with: `/mcp` command or `curl -v http://localhost:8000/mcp`

## How This Skill Works

When invoked, this skill automatically searches Red Hat's knowledge base using the `okp-mcp` MCP server via the `mcp__okp-mcp__search_portal` tool.

### Search Strategy

The skill uses **multi-query search** for better coverage:

1. **Single Query** - Use for exact lookups:
   - CVE IDs: `CVE-2024-1234`
   - KB article numbers: `solution 7053480`
   - Erratum names: `RHBA-2026:23001`

2. **Multiple Queries (2-3)** - Use for exploratory searches:
   - Pass an array of query reformulations
   - Results are merged using reciprocal rank fusion
   - Documents matching across multiple phrasings rank higher

### Multi-Query Best Practices

**DO:**
- Keep product names and versions in **every** query
- Vary the search angle, not the specificity
- Write complete questions/sentences (not bare keywords)
- Include the user's original phrasing as one query
- Use RHEL-specific terminology

**DON'T:**
- Strip context to make queries "broader"
- Reduce "RHEL 8 container on RHEL 9" to just "container deprecation"
- Use bare keywords without context

**Examples:**

```yaml
# BAD - bare keywords
query: "virt-manager RHEL 9"

# GOOD - complete sentence with context
query: "Is virt-manager supported for managing virtual machines in RHEL 9?"

# BETTER - multi-query with different angles
query:
  - "Is virt-manager supported for managing virtual machines in RHEL 9?"
  - "RHEL 9 virt-manager deprecation status and alternatives"
  - "Managing KVM virtual machines on Red Hat Enterprise Linux 9"
```

## Interpreting Results

### Deprecation/Removal Notices
- Results marked with ⚠️ indicate deprecated or removed features
- **Lead with the deprecation** if results conflict
- Mention workarounds only as secondary notes

### Applicability Warnings
- `Applicability: RHV only` = Red Hat Virtualization (NOT standard RHEL KVM)
- Do not recommend RHV-only solutions as primary answers for RHEL questions

### Version-Specific Information
- When results list specific releases or dates, enumerate them all
- Don't generalize when docs provide version-specific details

### Document Types
The search returns multiple content types:
- **Documentation**: Official product docs (most authoritative)
- **Solution**: KB articles with troubleshooting steps
- **Errata**: Bug fixes (RHBA), security (RHSA), enhancements (RHEA)
- **CVE**: Security advisories

## Tool Parameters

**`search_portal` tool:**
```yaml
mcp__okp-mcp__search_portal:
  query: string | array[string]  # Single query or 2-3 reformulations
  max_results: integer           # Default: 7 (recommended range: 5-10)
```

**`get_document` tool:**
```yaml
mcp__okp-mcp__get_document:
  doc_id: string      # URL from search results
  query: string       # (Optional) Get BM25-scored relevant passages
```

## Examples

### Example 1: Single Query (Exact Lookup)
```
User: "What's in RHBA-2026:23001?"

Search: mcp__okp-mcp__search_portal
  query: "RHBA-2026:23001"
  max_results: 5
```

### Example 2: Multi-Query (Exploratory)
```
User: "How do I deploy the web terminal operator on OpenShift 4.21?"

Search: mcp__okp-mcp__search_portal
  query:
    - "deploying web terminal operator OpenShift 4.21"
    - "web terminal operator installation yaml OpenShift"
    - "OpenShift web terminal operator subscription configuration"
  max_results: 7
```

### Example 3: Follow-up with get_document
```
# After search returns a relevant doc URL
Get Full Doc: mcp__okp-mcp__get_document
  doc_id: "https://access.redhat.com/documentation/en-us/..."
  query: "subscription yaml example"  # Get relevant passages
```

## Troubleshooting

### Connection Issues
```bash
# Check if OKP MCP server is running
curl -v http://localhost:8000/mcp

# Check port availability
ss -tuln | grep 8000
lsof -i :8000

# Test MCP connection from Claude Code
/mcp
```

### Common Errors
- `ECONNRESET`: Server not running or crashed during connection
- `Failed to reconnect`: Server needs to be restarted
- `Document not found`: Invalid doc_id or document moved/removed

## Tips for Better Results

1. **Be Specific**: Include product names, versions, and context in every query
2. **Use Official Terms**: "OpenShift Container Platform 4.21" vs "OCP"
3. **Ask Complete Questions**: Full sentences beat keyword lists
4. **Multi-angle Search**: Use 2-3 different phrasings for complex topics
5. **Check Dates**: Solutions/docs may reference specific versions/dates - cite them
6. **Verify Applicability**: Note RHV vs RHEL, supported vs deprecated features

## Related Skills
- `support-cases`: Query Red Hat support case data
- `dataverse-query`: Search broader Red Hat internal knowledge
