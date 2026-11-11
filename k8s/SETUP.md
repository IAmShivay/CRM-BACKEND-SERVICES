# OKE Deployment Guide — CRM Platform

## Architecture

```
GitHub Actions (CI/CD)
    ↓ Build ARM64 images
    ↓ Push to OCIR
    ↓ Deploy via kubectl
    
Oracle Cloud (Always Free)
┌─────────────────────────────────────────────┐
│  OKE Cluster (1 ARM node, 4 vCPU, 12GB)    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  NGINX Ingress Controller           │    │
│  │  Load Balancer (Free 10Mbps)        │    │
│  └──────────────┬──────────────────────┘    │
│                 │                            │
│  ┌──────────────┼──────────────────────┐    │
│  │  Namespace: crm-{dev|qa|prod}       │    │
│  │                                     │    │
│  │  auth-service      (8001)           │    │
│  │  sales-service     (8002)           │    │
│  │  hr-service        (8003)           │    │
│  │  whatsapp-service  (8004)           │    │
│  │  social-service    (8005)           │    │
│  │  billing-service   (8006)           │    │
│  │  marketing-service (8007)           │    │
│  │  collaboration-svc (8008)           │    │
│  │  analytics-service (8009)           │    │
│  │  cms-service       (8010)           │    │
│  │  redis             (6379)           │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘

MongoDB Atlas (external, free tier)
```

## Cost: $0/month (Oracle Always Free Tier)

| Resource | Spec | Cost |
|----------|------|------|
| OKE Control Plane | Managed Kubernetes | FREE |
| VM.Standard.A1.Flex | 4 OCPU, 12GB RAM (ARM) | FREE |
| Load Balancer | 10Mbps flexible | FREE |
| OCIR | Container Registry | FREE |
| Boot Volume | 50GB | FREE |
| Egress | 10TB/month | FREE |

---

## Prerequisites

1. **Oracle Cloud Account** — [Sign up](https://cloud.oracle.com/sign-up)
2. **OCI CLI** — [Install](https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm)
3. **kubectl** — [Install](https://kubernetes.io/docs/tasks/tools/)

---

## Step 1: Configure OCI CLI

```bash
oci setup config
```

Enter your tenancy OCID, user OCID, region, and generate an API key.

---

## Step 2: Create Compartment

```bash
oci iam compartment create \
  --name "crm-platform" \
  --description "CRM Platform resources" \
  --compartment-id <YOUR_TENANCY_OCID>
```

Save the compartment OCID.

---

## Step 3: Run Setup Script

```bash
export OCI_COMPARTMENT_ID="ocid1.compartment.oc1..xxxxx"
export OCI_REGION="ap-mumbai-1"

chmod +x scripts/oke-setup.sh
./scripts/oke-setup.sh
```

This creates:
- VCN with 3 subnets (service, node, load balancer)
- OKE cluster with Kubernetes v1.30
- ARM node pool (4 OCPU, 12GB RAM — Always Free)
- NGINX Ingress Controller
- Configures kubectl

---

## Step 4: Create OCIR Repository

```bash
# Get namespace
NAMESPACE=$(oci os ns get --query 'data' --raw-output)

# Create repos for each service
for SVC in auth-service sales-service hr-service whatsapp-service social-service billing-service marketing-service collaboration-service analytics-service cms-service; do
  oci artifacts container repository create \
    --compartment-id $OCI_COMPARTMENT_ID \
    --display-name "crm/${SVC}" \
    --is-public false
done
```

---

## Step 5: Generate Auth Token (for OCIR push)

```bash
oci iam auth-token create \
  --user-id <YOUR_USER_OCID> \
  --description "GitHub Actions OCIR"
```

Save the token — it's shown only once.

---

## Step 6: Configure Infisical (application secrets)

All application secrets live in Infisical (https://app.infisical.com or self-hosted), not in GitHub. Infisical handles versioning, rotation and per-environment values.

1. Create a project (e.g. `crm-platform`) with environments `dev`, `qa`, `prod`.
2. Add these secrets to **each** environment:

| Key | Purpose |
|-----|---------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `CORS_ORIGIN` / `CORS_ORIGINS` | Frontend URL (e.g. `https://your-app.vercel.app`) |
| `APP_URL` | Frontend URL (used for OAuth callbacks / referer) |
| `INTERNAL_API_KEY` | Service-to-service secret (`openssl rand -hex 32`) |
| `RESEND_API_KEY` / `EMAIL_FROM_ADDRESS` | Resend email |
| `PLATFORM_OPENROUTER_API_KEY` | OpenRouter API key |
| `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY` | Cashfree payments |
| `N8N_BASE_URL` / `N8N_API_KEY` / `N8N_PASSWORD` | n8n engine |
| `NEXT_PUBLIC_META_APP_ID` / `META_APP_ID` / `FACEBOOK_APP_ID` / `META_APP_SECRET` | Meta app (WhatsApp signup, social, lead forms) |
| `META_WEBHOOK_VERIFY_TOKEN` | Verify token for the Meta leadgen webhook (`/api/social/webhook/leadgen`) |
| `GOOGLE_ADS_CLIENT_ID` / `GOOGLE_ADS_CLIENT_SECRET` | Google Ads lead forms OAuth |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` / `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` | Social OAuth |
| `SOCIAL_OAUTH_REDIRECT` | OAuth redirect URL (`<APP_URL>/webhooks/callback`) |
| `OPENROUTER_MODEL` | Optional model override for AI replies |
| `SMS_PROVIDER` / `MSG91_AUTH_KEY` / `MSG91_SENDER_ID` | SMS provider |
| `LOG_LEVEL` | Winston level (default `info`) |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Google login + Gmail integration |
| `MICROSOFT_OAUTH_CLIENT_ID` / `MICROSOFT_OAUTH_CLIENT_SECRET` | Outlook email accounts |
| `CASHFREE_ENV` | `sandbox` or `production` |
| `PUBLIC_API_URL` | Public API origin (`https://api.example.com`); Cashfree return/notify URLs and the frontend's gateway URL |
| `BILLING_SERVICE_URL` | `http://billing-service:8006` (plan-limit checks from sales/auth) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web push |
| `STORAGE_PROVIDER`, `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET_NAME`, `MINIO_PUBLIC_URL` or `GCS_PROJECT_ID` / `GCS_BUCKET_NAME` | Uploads (avatars, blog images) |
| `REDIS_URL` | `redis://redis:6379` |
| `NODE_ENV=production`, `COOKIE_SECURE=true`, `JWT_EXPIRES_IN=7d` | Runtime flags |

3. Create a **Machine Identity** (Universal Auth) per environment, grant it read access to that environment, and note its Client ID / Client Secret.
4. For rotation: enable Infisical Secret Rotation on the keys that support it, or simply update the value — the operator resyncs every 60s and restarts Deployments annotated with `secrets.infisical.com/auto-reload`.

Secrets that stay in GitHub are infrastructure credentials only.

### GitHub Secrets (per environment: Settings → Environments → dev/qa/prod)
| Name | Value |
|------|-------|
| `OCI_CLI_USER` | Your OCI user OCID |
| `OCI_CLI_TENANCY` | Your tenancy OCID |
| `OCI_CLI_FINGERPRINT` | Your API key fingerprint |
| `OCI_CLI_KEY_CONTENT` | Full PEM private key content |
| `OCI_USER` | Your OCI username (e.g., `oracleidentitycloudservice/email`) |
| `OCI_AUTH_TOKEN` | Auth token from Step 5 |
| `INFISICAL_CLIENT_ID` | Machine identity client ID for this environment |
| `INFISICAL_CLIENT_SECRET` | Machine identity client secret |

### GitHub Variables
| Name | Value |
|------|-------|
| `OCI_REGION` | e.g., `ap-mumbai-1` |
| `OCIR_NAMESPACE` | From `oci os ns get` output |
| `OKE_CLUSTER_ID` | Cluster OCID from Step 3 |
| `INFISICAL_PROJECT_SLUG` | Infisical project slug |
| `INFISICAL_HOST` | Optional; API URL for self-hosted Infisical (default `https://app.infisical.com/api`) |
| `APP_ORIGIN` | Frontend origin for ingress CORS, e.g. `https://app.example.com` |

The CRM-SASS repository needs the same OCI secrets/variables plus `PUBLIC_API_URL` (public API origin), `APP_ORIGIN`, `CASHFREE_ENV` and optionally `META_APP_ID`; its `deploy-oke.yml` builds `crm/frontend` for ARM64 and rolls the `frontend` Deployment created by this repo.

---

## Step 6b: Install the Infisical Kubernetes Operator

The operator syncs each environment's secrets into the `crm-env` Secret that every Deployment reads via `envFrom`, and rolls Deployments when values change.

```bash
helm repo add infisical-helm-charts 'https://dl.cloudsmith.io/public/infisical/helm-charts/helm/charts/'
helm repo update
helm install infisical-operator infisical-helm-charts/secrets-operator   --namespace infisical-operator-system --create-namespace
```

Verify after the first deploy:

```bash
kubectl get infisicalsecret -n crm-prod
kubectl get secret crm-env -n crm-prod
```

---

## Step 7: Create Environment Branches

```bash
git checkout -b develop
git push origin develop

git checkout -b qa
git push origin qa
```

---

## Step 8: Deploy

Push to any branch to trigger deployment:

| Branch | Environment | K8s Namespace |
|--------|-------------|---------------|
| `develop` | dev | `crm-dev` |
| `qa` | qa | `crm-qa` |
| `main` | prod | `crm-prod` |

```bash
# Deploy to dev
git push origin develop

# Deploy to prod
git push origin main
```

Or manually trigger via GitHub Actions → "Run workflow" → select environment.

---

## Step 9: Verify Deployment

```bash
# Check pods
kubectl get pods -n crm-prod

# Check services
kubectl get svc -n crm-prod

# Check ingress (get external IP)
kubectl get ingress -n crm-prod

# Check logs
kubectl logs -f deployment/auth-service -n crm-prod

# Health check
curl http://<EXTERNAL_IP>/api/health
```

---

## Step 10: Frontend

`k8s/base/frontend.yaml` runs the Next.js app (`REGISTRY/frontend`) behind the same ingress: `/api/*` paths go to the services, `/` goes to the frontend. The container reads `PUBLIC_API_URL` and `APP_URL` from `crm-env` at runtime and bakes `NEXT_PUBLIC_*` values at build time (CRM-SASS `deploy-oke.yml`).

1. Create the OCIR repo `crm/frontend` (Step 4 loop).
2. Deploy this repo first (creates the Deployment with the `<env>` tag), then push CRM-SASS to the same branch.
3. Point DNS at the ingress load balancer and, for TLS, install cert-manager and add `cert-manager.io/cluster-issuer` + `spec.tls` to `k8s/base/ingress.yaml` (both Ingress objects).

Cashfree webhook URL: `https://<api-host>/api/webhooks/cashfree`. Websocket chat uses `/api/socket` through the second Ingress (`crm-gateway-socket`, long timeouts).

---

## Monitoring

```bash
# Resource usage
kubectl top pods -n crm-prod

# Describe failing pod
kubectl describe pod <POD_NAME> -n crm-prod

# Restart a service
kubectl rollout restart deployment/auth-service -n crm-prod

# Scale a service
kubectl scale deployment/auth-service --replicas=2 -n crm-prod
```

---

## Troubleshooting

**Pod CrashLoopBackOff:**
```bash
kubectl logs <POD_NAME> -n crm-prod --previous
```

**ImagePullBackOff:**
```bash
# Verify OCIR secret exists
kubectl get secret ocir-secret -n crm-prod

# Verify image exists
oci artifacts container image list --compartment-id $OCI_COMPARTMENT_ID --repository-name crm/auth-service
```

**Node not scheduling pods:**
```bash
# Check node resources
kubectl describe node <NODE_NAME>
kubectl top node
```
