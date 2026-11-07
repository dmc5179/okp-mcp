# Images to mirror for RHOKP MCP Server

Mirror images by **digest**, not by `:latest`. Mirroring a floating tag gives you whatever
build was current when `oc-mirror` ran, and the cluster cannot tell two such mirrors
apart. Both images below are published as multi-arch (amd64 + arm64) manifest lists, and
the digests given here are the manifest-list digests, so they work on both architectures.
Both live on `registry.redhat.io`, so the mirroring host needs `podman login registry.redhat.io`.

```yaml
kind: ImageSetConfiguration
apiVersion: mirror.openshift.io/v2alpha1
mirror:
  additionalImages:
  # Red Hat Offline Knowledge Portal (Solr index + HTML mirror), tag 1.3.0-1793303796
  - name: registry.redhat.io/offline-knowledge-portal/rhokp-rhel9@sha256:1ac156d35e14315011687c3740443e07d66c8d7d5be6839920cb2af7d8c65ce1
  # OKP MCP server (RHEL CLA knowledge bridge), tag v1.0.2-1793868366
  - name: registry.redhat.io/rhel-cla/rhel-knowledge-bridge-rhel10@sha256:99fd47d068c6b99db3068a7276c80e1d0bf98d3a1e908cae2d23b2b4571f7086
```

These are the same digests pinned in `openshift/kustomize/kustomization.yaml`,
`openshift/01-rhokp.yaml`, and `openshift/02-rhokp-mcp-server.yaml`. Renovate
(`.github/workflows/renovate-fork.yml`) keeps all four in step; keep the
`# ..., tag <tag>` comment directly above each `- name:` line, since that is how it finds them.

## Finding the digest for a release

Each release is published under a version-build tag (`1.3.0-1793303796`,
`v1.0.2-1793868366`), a bare build-date tag, and sometimes `latest`. Do not assume `latest`
is the newest build: on 2026-11-06, `rhel-knowledge-bridge-rhel10:latest` still pointed at
`v1.0.2-1793868344` while `v1.0.2-1793868366` was already published. To pin a release:

```bash
IMAGE=registry.redhat.io/offline-knowledge-portal/rhokp-rhel9   # or .../rhel-cla/rhel-knowledge-bridge-rhel10

# List recent version-build tags
skopeo list-tags docker://$IMAGE \
  | jq -r '.Tags[]' | grep -E '^v?[0-9]+\.[0-9]+\.[0-9]+-[0-9]+$' | sort -V | tail -5

# Resolve one to its manifest-list digest
skopeo inspect --no-tags docker://$IMAGE:<tag> | jq -r .Digest
```

`skopeo inspect` without `--raw` reports the manifest-list digest for multi-arch images,
which is what you want here. Do not use the per-architecture digests from
`skopeo inspect --raw ... | jq '.manifests[]'` unless you only run one architecture.

## Which MCP image

Use `registry.redhat.io/rhel-cla/rhel-knowledge-bridge-rhel10`. It is the product-shipped,
supported build of this server, the one the RHEL CLA installer
(`rhel-lightspeed/rhel-cla-installer`) deploys.

It is built from the same pipeline as the RHEL Lightspeed team's
`quay.io/redhat-services-prod/rhel-lightspeed-tenant/rhel-knowledge-bridge` repository:
`v1.0.2-1793868366` above has the same digest as that repository's `e36106a` (upstream
commit) tag. The quay repository is fine for development but carries no version tags.

Never pull from `quay.io/redhat-user-workloads/...`. That is Konflux's internal build
output, tagged by pipeline run, and is not a release channel.
