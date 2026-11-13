# Running OKP with systemd quadlets

Podman quadlet files that run the OKP Solr index and MCP server as rootless systemd services. This gives you automatic restart on failure, journald logging, and start-at-login with no manual `podman run` commands.

## Prerequisites

- Podman 4.4+ (quadlet support)
- Authenticated to `registry.redhat.io` (`podman login registry.redhat.io`)
- An OKP access key from <https://access.redhat.com/offline/access>

## Setup

### 1. Store the access key as a podman secret

The Solr container reads its access key from a podman secret named `rhokp_access_key`, mapped to the `ACCESS_KEY` environment variable (`Secret=rhokp_access_key,type=env,target=ACCESS_KEY`). This matches the official RHOKP systemd guide and keeps the key out of the quadlet file. Paste the key when prompted, then press Enter:

```bash
read -rs KEY && printf '%s' "$KEY" | podman secret create --replace rhokp_access_key - && unset KEY
```

Confirm it exists without printing the value:

```bash
podman secret ls
```

Podman's default secret driver stores the value unencrypted under `~/.local/share/containers/storage/secrets/` (mode 600), so treat that directory like any other credential file. To read the key back later: `podman secret inspect --showsecret rhokp_access_key`.

> **Upgrading from an older checkout?** Earlier versions read the key from `~/.config/okp-mcp/solr.env`. Move it into the secret without echoing it, then remove the file:
>
> ```bash
> sed -n 's/^ACCESS_KEY=//p' ~/.config/okp-mcp/solr.env | tr -d '\n' \
>   | podman secret create --replace rhokp_access_key -
> rm -r ~/.config/okp-mcp
> ```

### 2. Install the quadlet files

Copy all quadlet files into a subdirectory under the rootless systemd path:

```bash
mkdir -p ~/.config/containers/systemd/okp-mcp
cp quadlet/*.{container,network,volume} ~/.config/containers/systemd/okp-mcp/
```

### 3. Reload and start

Tell systemd to pick up the new quadlet files, then start the MCP server (which pulls in Solr automatically via its dependency):

```bash
systemctl --user daemon-reload
systemctl --user start okp-mcp
```

The first start pulls the Solr image (~10 GB) and indexes content. This takes several minutes. Watch progress with:

```bash
journalctl --user -xeu okp-solr -f
```

Wait until you see `Started Solr server on port 8983`.

### 4. Verify

Confirm Solr has data:

```bash
curl -s "http://localhost:8983/solr/portal/select?q=*:*&rows=0" | python3 -m json.tool
```

You should see `numFound` with a large number of documents (600k+).

Confirm the MCP server responds:

```bash
curl -s -N -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc": "2.0", "method": "initialize", "params": {"protocolVersion": "2025-11-25", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0"}}, "id": 1}'
```

You should see a response with `serverInfo.name: "RHEL OKP Knowledge Base"`.

## Management

Start/stop both containers (dependency ordering is automatic):

```bash
systemctl --user start okp-mcp
systemctl --user stop okp-mcp
```

The quadlet files include `[Install] WantedBy=default.target`, so both services start automatically when you log in. No `systemctl enable` is needed for quadlet-generated units.

To keep services running after logout (and start them at boot without logging in), enable lingering:

```bash
loginctl enable-linger "$USER"
```

Both units set `Restart=always`, not `Restart=on-failure`. The containers trap SIGTERM and exit 0, which `on-failure` counts as success, so a container stopped by anything other than `systemctl` (OOM pressure, `podman stop`, an auto-update) would otherwise stay down. With `always`, systemd brings it back; `systemctl --user stop` still stops it for good. To confirm a restart happened:

```bash
systemctl --user show okp-mcp -p NRestarts
```

View logs:

```bash
journalctl --user -xeu okp-solr
journalctl --user -xeu okp-mcp
```

Check status:

```bash
systemctl --user status okp-solr okp-mcp
```

## Automatic image updates

The MCP server container is configured with `AutoUpdate=registry`. To enable periodic checks for new images, start the podman auto-update timer:

```bash
systemctl --user enable --now podman-auto-update.timer
```

Without this timer, the auto-update label is present but nothing triggers it. The timer is disabled by default.

It runs daily (with up to 15 minutes of random delay) and catches up after a missed run (`Persistent=true`), so a laptop that was asleep updates on the next wake. With lingering enabled it runs without an active login. If a new image fails to start, `podman auto-update` rolls back to the previous one.

Preview what it would update, and check when it next fires:

```bash
podman auto-update --dry-run
systemctl --user list-timers podman-auto-update.timer
```

Both containers are labelled `AutoUpdate=registry`. RHOKP ships new content roughly weekly as a new image, so the timer keeps the search index current. Each Solr start re-extracts the index bundled in the image into the data volume (about 30 seconds on a laptop), so an update needs no volume reset. Search is briefly unavailable while it restarts, and `okp-mcp` restarts with it because of its `Requires=okp-solr.service`.

The timer pulls from `registry.redhat.io` without you, so it needs a login that survives a reboot. `podman login` writes to `${XDG_RUNTIME_DIR}/containers/auth.json` by default, which is tmpfs and gone after a reboot. Log in to a persistent file instead:

```bash
podman login --authfile ~/.config/containers/auth.json registry.redhat.io
```

Podman also falls back to `~/.docker/config.json` if you already have registry credentials there.

## Troubleshooting

### Dry-run the quadlet generator

If the services don't appear after `daemon-reload`, verify the generator can parse the quadlet files:

```bash
/usr/lib/systemd/system-generators/podman-system-generator --user --dryrun
```

This prints the generated unit files or errors explaining what went wrong.

### Service won't start

Check the full journal output for the failing service:

```bash
journalctl --user -xeu okp-solr --no-pager
```

Common issues:
- Missing `rhokp_access_key` secret (`podman secret ls`; create it per step 1). Quadlet fails the unit with a "no such secret" error.
- Not logged into `registry.redhat.io` (`podman login registry.redhat.io`)
- Port conflict on 8983 or 8000 (stop any existing Solr or MCP containers)

## Cleanup

Stop the services:

```bash
systemctl --user stop okp-solr okp-mcp
```

Remove the quadlet files and reload:

```bash
rm -r ~/.config/containers/systemd/okp-mcp
systemctl --user daemon-reload
```

Optionally remove the Solr data volume and the access key secret:

```bash
podman volume rm okp-solr-data
podman secret rm rhokp_access_key
```

## Files

| File | Purpose |
|------|---------|
| `okp.network` | Shared podman network for container DNS resolution |
| `okp-solr-data.volume` | Persistent storage for the Solr search index |
| `okp-solr.container` | OKP Solr search engine |
| `okp-mcp.container` | OKP MCP server (depends on Solr) |
