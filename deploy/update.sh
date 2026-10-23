#!/usr/bin/env bash
# Updates a VPS install: pulls, installs, builds the web app with the public URLs, restarts.
# Run as the `freex` user from /srv/freex; restarting needs sudo.
set -euo pipefail
cd /srv/freex
git pull --ff-only
pnpm install --frozen-lockfile
set -a
. /etc/freex/web.env
set +a
pnpm --filter @freex/web build
sudo systemctl restart freex-collab freex-api freex-web
