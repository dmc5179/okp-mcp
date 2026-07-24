# Deploying RHOKP plus MCP to OCP

```console
export RHOKP_KEY="key from RHN"
envsubst < rhokp-mcp.yaml | oc create -f -
```
