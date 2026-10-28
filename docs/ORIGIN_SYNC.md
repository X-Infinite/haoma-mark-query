# Origin → GitHub sync (haoma-mark-query)

**Source of truth:** [Origin `xzinfinite/haoma-mark-query`](https://cursor.com/codebase/xzinfinite/haoma-mark-query)  
**Target:** [GitHub `X-Infinite/haoma-mark-query`](https://github.com/X-Infinite/haoma-mark-query) (`main`)

## Status

This Cloud Agent run could reach `origin.cursor.com` over the network but **could not authenticate for Git or Origin REST**:

- `CURSOR_AUTH_TOKEN` was **not** injected in the agent environment (expected on hosted agents for Origin-backed work).
- The exec-daemon session JWT is **`exec_daemon` type** and is rejected for `git clone` / tarball (`401` / “access token was not accepted”).
- GitHub’s managed token does not grant Origin `repository:contents:read`.

Until a valid **Origin user or API credential** is available in the environment, the app source cannot be copied automatically.

## Unblock (pick one)

1. **Re-run this agent from the Origin codebase** (or add Origin repo access to the Cloud Agent environment) so the host injects `CURSOR_AUTH_TOKEN`.
2. **Add `CURSOR_API_KEY`** (Cursor user API key with Origin access) to the Cloud Agent environment secrets, then re-run.
3. **Manual one-off:** on a machine where `origin auth login` works:
   ```bash
   origin repo clone xzinfinite/haoma-mark-query /tmp/haoma-origin
   cd /path/to/X-Infinite-haoma-mark-query
   rsync -a --delete --exclude .git /tmp/haoma-origin/ .
   git add -A && git commit -m "Import from Origin xzinfinite/haoma-mark-query" && git push origin main
   ```

## Automated script (after credentials exist)

From the repo root:

```bash
chmod +x scripts/sync-from-origin.sh
export CURSOR_AUTH_TOKEN=...   # or CURSOR_API_KEY
./scripts/sync-from-origin.sh
git status
git add -A
git commit -m "Import haoma-mark-query from Origin"
git push origin main
```

Do not commit `.env`, `node_modules/`, `.next/`, or `data/*.db` — keep `.env.example` if present in Origin.
