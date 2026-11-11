# VPS Deployment (Docker Compose + Infisical)

`.github/workflows/deploy-vps.yml` builds every service from the root `Dockerfile`, pushes images to GHCR, then ships `docker-compose.prod.yml`, the gateway `nginx.conf`, `deploy/Caddyfile`, `deploy/infisical-sync.sh` and a machine-identity config to the server. Application secrets are never stored in GitHub or committed: the server pulls them from Infisical.

The frontend (CRM-SASS) is a service in the same compose file (`frontend`, image `ghcr.io/<owner>/crm-sass`). Its own workflow `CRM-SASS/.github/workflows/deploy-vps.yml` builds the image with `API_GATEWAY_URL=http://gateway:80`, updates `FRONTEND_TAG` in `deploy.env` and restarts only the `frontend` container, so backend and frontend deploy independently. The backend deploy keeps the current `FRONTEND_TAG`.

TLS: the `caddy` service (compose profile `tls`, on by default through `COMPOSE_PROFILES`) terminates HTTPS for `DOMAIN`, proxies `/api/*` to the gateway and everything else to the frontend, with websockets passing through for `/api/socket`. Set `COMPOSE_PROFILES=` (empty) if you terminate TLS elsewhere (Cloudflare Tunnel, external nginx). Add `storage` to the profiles to run a local MinIO (`minio_data` volume) instead of an external bucket.

Branch → environment: `develop` → dev, `staging` → staging, `main` → prod. Each environment lives in `/opt/crm-platform/<env>`.

## How secrets reach the containers

```
Infisical (env: prod)  --infisical export-->  .env  --env_file-->  containers
        ^                                        |
        |  cron */5 min: infisical-sync.sh ------+-- changed? docker compose up -d
```

`infisical-sync.sh` logs in with the environment's Machine Identity, exports the environment as dotenv, appends it to the non-secret `deploy.env` (image tag, gateway port) and writes `.env`. If the content changed it re-runs `docker compose up -d`, which recreates only the containers whose environment changed. Rotating a key in Infisical therefore propagates within 5 minutes with no CI run.

## One-time server prep

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' | sudo -E bash
sudo apt-get install -y infisical

sudo mkdir -p /opt/crm-platform/{dev,staging,prod}
sudo chown -R $USER /opt/crm-platform
```

Published ports: Caddy 80/443 (profile `tls`), gateway `GATEWAY_PORT` (default 8000) and frontend `FRONTEND_PORT` (default 3000) for local checks; firewall the last two if Caddy is in front. Point DNS for `DOMAIN` at the server before the first deploy so Caddy can obtain certificates.

Cashfree webhook URL: `https://<DOMAIN>/api/webhooks/cashfree`. Gateway CORS allows origins matching `CORS_ORIGIN_REGEX` (default `https://<DOMAIN>`); the services also read `CORS_ORIGINS` from Infisical.

Meta webhook URL for WhatsApp: `https://<api-domain>/api/whatsapp/webhook`.

## Infisical setup

1. Project with environments `dev`, `staging`, `prod` (same keys as the OKE table in `k8s/SETUP.md` Step 6).
2. One Machine Identity (Universal Auth) per environment with read access to it.
3. Note the **project ID** (Project Settings) — the CLI's `export` command needs the ID, not the slug.

## GitHub configuration

Set per environment under Settings → Environments → dev/staging/prod.

### Secrets

| Name | Value |
|------|-------|
| `VPS_HOST` | Server IP or hostname |
| `VPS_USER` | SSH user (in the `docker` group) |
| `VPS_SSH_KEY` | Private key for `VPS_USER` |
| `INFISICAL_CLIENT_ID` | Machine identity client ID for this environment |
| `INFISICAL_CLIENT_SECRET` | Machine identity client secret |

### Variables

| Name | Value |
|------|-------|
| `INFISICAL_PROJECT_ID` | Infisical project ID |
| `INFISICAL_HOST` | Optional; API URL for self-hosted Infisical (default `https://app.infisical.com/api`) |
| `GATEWAY_PORT` | Host port for the gateway (default `8000`) |
| `FRONTEND_PORT` | Host port for the frontend (default `3000`) |
| `DOMAIN` | Public hostname served by Caddy, e.g. `app.example.com` |
| `APP_PUBLIC_URL` | Optional; public frontend URL (default `https://<DOMAIN>`) |
| `CORS_ORIGIN_REGEX` | Optional; nginx regex of allowed browser origins (default `https://<DOMAIN>`) |
| `COMPOSE_PROFILES` | Optional; `tls` (default), `tls,storage`, or empty |

The CRM-SASS repository needs the same `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` secrets plus variables `DOMAIN` (or `APP_PUBLIC_URL`), `CASHFREE_ENV` (`sandbox`/`production`) and optionally `META_APP_ID`.

GHCR images are private by default; the deploy step logs the server into GHCR with the workflow token.

## Operations

```bash
cd /opt/crm-platform/prod
./infisical-sync.sh            # force a secrets sync now
tail -f infisical-sync.log     # rotation activity
sed -i 's/^TAG=.*/TAG=<git-sha>/' deploy.env && ./infisical-sync.sh   # roll back / forward an image tag
sed -i 's/^FRONTEND_TAG=.*/FRONTEND_TAG=<git-sha>/' deploy.env && docker compose --env-file deploy.env up -d --no-deps frontend
crontab -l                      # */5 * * * * /opt/crm-platform/prod/infisical-sync.sh (installed by the deploy)
```
