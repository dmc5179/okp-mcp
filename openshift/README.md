# Deploying RHOKP plus MCP to OCP

https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/interacting_with_the_command-line_assistant/index#using-the-mcp-server-for-rhel-in-air-gapped-environments

1. Create namespace

If using another namespace the subsequent yaml files need to be updated

```console
oc new-app rhokp-server
```

2. Deploy RHOKP
```console
export RHOKP_KEY="key from RHN"
envsubst < 01-rhokp.yaml | oc create -f -
```

3. Deploy MCP Server
```console
oc create -f 02-rhokp-mcp-server.yaml
```

4. (Optional) Horizontal Pod Autoscaler for MCP Server
```console
oc create -f 03-rhokp-mcp-server-hpa.yaml
```

5. (Optional) Vertical Pod Autoscaler for RHOKP Server
```console
oc create -f 04-rhokp-vpa.yaml
```

6. (Optional) Pod Disruption Budget for RHOKP
```console
oc create -f 05-rhokp-pdb.yaml
```
