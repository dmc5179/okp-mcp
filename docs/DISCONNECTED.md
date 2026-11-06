# Images to mirror for RHOKP MCP Server

Mirror images by **digest**, not by `:latest`. Mirroring a floating tag gives you whatever
build was current when `oc-mirror` ran, and the cluster cannot tell two such mirrors
apart. Every image below is published as a multi-arch (amd64 + arm64) manifest list, and
the digests given here are the manifest-list digests, so they work on both architectures.

```yaml
kind: ImageSetConfiguration
apiVersion: mirror.openshift.io/v2alpha1
mirror:
  additionalImages:
  # Red Hat Offline Knowledge Portal (Solr index + HTML mirror), tag 1.3.0-1793303796
  - name: registry.redhat.io/offline-knowledge-portal/rhokp-rhel9@sha256:1ac156d35e14315011687c3740443e07d66c8d7d5be6839920cb2af7d8c65ce1
  # OKP MCP server, tag e36106a (upstream commit)
  - name: quay.io/redhat-services-prod/rhel-lightspeed-tenant/rhel-knowledge-bridge@sha256:99fd47d068c6b99db3068a7276c80e1d0bf98d3a1e908cae2d23b2b4571f7086
```

These are the same digests pinned in `openshift/kustomize/kustomization.yaml`,
`openshift/01-rhokp.yaml`, and `openshift/02-rhokp-mcp-server.yaml`. Update all four
together.

## Finding the digest for a release

Every RHOKP release is published under three kinds of tags: `latest`, a build-date tag
(`1793289231`), and a version tag (`1.3.0-1793303796`). They resolve to the same digest
for a given release. To pin a new one:

```bash
# List recent version tags
skopeo list-tags docker://registry.redhat.io/offline-knowledge-portal/rhokp-rhel9 \
  | jq -r '.Tags[]' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+-[0-9]+$' | sort -V | tail -5

# Resolve one to its manifest-list digest
skopeo inspect --no-tags docker://registry.redhat.io/offline-knowledge-portal/rhokp-rhel9:<tag> \
  | jq -r .Digest
```

`skopeo inspect` without `--raw` reports the manifest-list digest for multi-arch images,
which is what you want here. Do not use the per-architecture digests from
`skopeo inspect --raw ... | jq '.manifests[]'` unless you only run one architecture.

## Supported MCP image for customers

`quay.io/redhat-services-prod/...` is the RHEL Lightspeed team's Konflux release
repository. Customers running the RHEL Command Line Assistant should use the
product-shipped image instead, which carries version tags and Red Hat support:

```text
registry.redhat.io/rhel-cla/rhel-knowledge-bridge-rhel10:v1.0.2-<build>
```

It is the same build as the quay image: on 2026-11-06,
`rhel-knowledge-bridge-rhel10:latest` and
`quay.io/redhat-services-prod/.../rhel-knowledge-bridge:32ef396` both resolved to
`sha256:1c68e65366f43c6fdac960f84be4212a15f5ff7a1e42b8a2dcb13f07b21617df`. The RHEL CLA
installer (`rhel-lightspeed/rhel-cla-installer`) pins this image by version tag.

Never pull from `quay.io/redhat-user-workloads/...`. That is Konflux's internal build
output, tagged by pipeline run, and is not a release channel.
