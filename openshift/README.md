# Deploying RHOKP plus MCP to OCP

https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/interacting_with_the_command-line_assistant/index#using-the-mcp-server-for-rhel-in-air-gapped-environments

1. Deploy RHOKP
```console
export RHOKP_KEY="key from RHN"
envsubst < 01-rhokp.yaml | oc create -f -
```

2. Deploy MCP Server
```console
oc create -f 02-rhokp-mcp-server.yaml
```
