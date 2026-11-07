// Self-hosted Renovate config for the fork's digest-pinned images.
//
// Run by .github/workflows/renovate-fork.yml. It deliberately ignores the
// repository's renovate.json (requireConfig: "ignored"): that file belongs to
// upstream, which already keeps Python, Konflux, and base-image dependencies
// current. This config manages only the two OKP images pinned in the fork's
// OpenShift manifests and docs.
//
// Both images live on registry.redhat.io, which requires credentials even to
// list tags, so the workflow passes a registry service account in
// RH_REGISTRY_USERNAME / RH_REGISTRY_PASSWORD.

const RHOKP = "registry.redhat.io/offline-knowledge-portal/rhokp-rhel9";
const RKB = "registry.redhat.io/rhel-cla/rhel-knowledge-bridge-rhel10";

module.exports = {
  platform: "github",
  repositories: ["dmc5179/okp-mcp"],
  onboarding: false,
  requireConfig: "ignored",
  // Belt and braces: if renovate.json is read anyway (the local platform does,
  // which is how this config is tested), skip upstream's org preset so its
  // rules (Python deps, Konflux refs, schedules) never apply on the fork.
  ignorePresets: ["local>rhel-lightspeed/renovate-config"],
  dependencyDashboard: false,
  branchPrefix: "renovate-fork/",

  hostRules: [
    {
      matchHost: "registry.redhat.io",
      username: process.env.RH_REGISTRY_USERNAME,
      password: process.env.RH_REGISTRY_PASSWORD,
    },
  ],

  enabledManagers: ["kustomize", "kubernetes", "custom.regex"],
  kustomize: {
    managerFilePatterns: ["/^openshift/kustomize/kustomization\\.yaml$/"],
  },
  kubernetes: {
    managerFilePatterns: ["/^openshift/0[1-5]-[^/]+\\.yaml$/"],
  },
  customManagers: [
    {
      // oc-mirror list: "# ..., tag <tag>" comment directly above "- name: <image>@<digest>".
      customType: "regex",
      managerFilePatterns: ["/^docs/DISCONNECTED\\.md$/"],
      matchStrings: [
        "tag (?<currentValue>\\S+)\\n\\s*- name: (?<depName>[^@\\s]+)@(?<currentDigest>sha256:[a-f0-9]{64})",
      ],
      datasourceTemplate: "docker",
    },
    {
      // Quickstart commands that show a version tag without a digest.
      customType: "regex",
      managerFilePatterns: ["/^CLAUDE_CODE\\.md$/", "/^README\\.md$/", "/^\\.claude/examples/[^/]+\\.md$/"],
      matchStrings: [
        "(?<depName>registry\\.redhat\\.io/(?:offline-knowledge-portal|rhel-cla)/[a-z0-9-]+):(?<currentValue>v?\\d+\\.\\d+\\.\\d+-\\d+)",
      ],
      datasourceTemplate: "docker",
    },
  ],

  packageRules: [
    {
      // Everything except the two OKP images is upstream's to update.
      matchPackageNames: [`!${RHOKP}`, `!${RKB}`],
      enabled: false,
    },
    {
      // Tags look like 1.3.0-1793303796: semver plus a build timestamp. Docker
      // versioning would treat the timestamp as an incompatible suffix and never
      // offer an update, so spell the scheme out. "-source" tags don't match.
      matchPackageNames: [RHOKP],
      versioning: "regex:^(?<major>\\d+)\\.(?<minor>\\d+)\\.(?<patch>\\d+)-(?<build>\\d+)$",
    },
    {
      // Tags look like v1.0.2-1793868366.
      matchPackageNames: [RKB],
      versioning: "regex:^v(?<major>\\d+)\\.(?<minor>\\d+)\\.(?<patch>\\d+)-(?<build>\\d+)$",
    },
    {
      // RHOKP publishes weekly; one PR per week moving every pin together.
      matchPackageNames: [RHOKP, RKB],
      groupName: "OKP images",
      separateMajorMinor: false,
      separateMinorPatch: false,
      commitMessageTopic: "OKP images",
      labels: ["dependencies", "images"],
    },
  ],
};
