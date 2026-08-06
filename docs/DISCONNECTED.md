# Images to mirror for RHOKP MCP Server

```console
kind: ImageSetConfiguration
apiVersion: mirror.openshift.io/v2alpha1
mirror:
  additionalImages:
  - name: registry.redhat.io/offline-knowledge-portal/rhokp-rhel9:latest
  - name: quay.io/redhat-user-workloads/rhel-lightspeed-tenant/rhel-knowledge-bridge:latest 
```
