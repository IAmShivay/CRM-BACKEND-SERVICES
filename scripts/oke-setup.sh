#!/bin/bash
set -euo pipefail

echo "============================================"
echo "  OKE Cluster Setup for CRM Platform"
echo "============================================"
echo ""
echo "Prerequisites:"
echo "  1. OCI CLI installed and configured (oci setup config)"
echo "  2. kubectl installed"
echo "  3. Oracle Cloud account with Always Free tier"
echo ""

COMPARTMENT_ID="${OCI_COMPARTMENT_ID:?Set OCI_COMPARTMENT_ID}"
REGION="${OCI_REGION:-ap-mumbai-1}"
CLUSTER_NAME="${CLUSTER_NAME:-crm-platform}"
NODE_SHAPE="VM.Standard.A1.Flex"
NODE_OCPUS=4
NODE_MEMORY_GB=12
K8S_VERSION="v1.30.1"

echo "[1/6] Creating VCN..."
VCN_ID=$(oci network vcn create \
  --compartment-id "$COMPARTMENT_ID" \
  --display-name "${CLUSTER_NAME}-vcn" \
  --cidr-blocks '["10.0.0.0/16"]' \
  --query 'data.id' --raw-output 2>/dev/null || echo "")

if [ -z "$VCN_ID" ]; then
  echo "VCN may already exist. Fetching..."
  VCN_ID=$(oci network vcn list \
    --compartment-id "$COMPARTMENT_ID" \
    --display-name "${CLUSTER_NAME}-vcn" \
    --query 'data[0].id' --raw-output)
fi
echo "VCN: $VCN_ID"

echo ""
echo "[2/6] Creating subnets..."
SVC_SUBNET_ID=$(oci network subnet create \
  --compartment-id "$COMPARTMENT_ID" \
  --vcn-id "$VCN_ID" \
  --display-name "${CLUSTER_NAME}-svc-subnet" \
  --cidr-block "10.0.10.0/24" \
  --query 'data.id' --raw-output 2>/dev/null || \
  oci network subnet list \
    --compartment-id "$COMPARTMENT_ID" \
    --vcn-id "$VCN_ID" \
    --display-name "${CLUSTER_NAME}-svc-subnet" \
    --query 'data[0].id' --raw-output)

NODE_SUBNET_ID=$(oci network subnet create \
  --compartment-id "$COMPARTMENT_ID" \
  --vcn-id "$VCN_ID" \
  --display-name "${CLUSTER_NAME}-node-subnet" \
  --cidr-block "10.0.20.0/24" \
  --query 'data.id' --raw-output 2>/dev/null || \
  oci network subnet list \
    --compartment-id "$COMPARTMENT_ID" \
    --vcn-id "$VCN_ID" \
    --display-name "${CLUSTER_NAME}-node-subnet" \
    --query 'data[0].id' --raw-output)

LB_SUBNET_ID=$(oci network subnet create \
  --compartment-id "$COMPARTMENT_ID" \
  --vcn-id "$VCN_ID" \
  --display-name "${CLUSTER_NAME}-lb-subnet" \
  --cidr-block "10.0.30.0/24" \
  --query 'data.id' --raw-output 2>/dev/null || \
  oci network subnet list \
    --compartment-id "$COMPARTMENT_ID" \
    --vcn-id "$VCN_ID" \
    --display-name "${CLUSTER_NAME}-lb-subnet" \
    --query 'data[0].id' --raw-output)

echo "Subnets created."

echo ""
echo "[3/6] Creating OKE cluster..."
CLUSTER_ID=$(oci ce cluster create \
  --compartment-id "$COMPARTMENT_ID" \
  --name "$CLUSTER_NAME" \
  --kubernetes-version "$K8S_VERSION" \
  --vcn-id "$VCN_ID" \
  --service-lb-subnet-ids "[\"$LB_SUBNET_ID\"]" \
  --endpoint-subnet-id "$SVC_SUBNET_ID" \
  --query 'data.id' --raw-output 2>/dev/null || echo "")

if [ -z "$CLUSTER_ID" ]; then
  echo "Cluster may already exist. Fetching..."
  CLUSTER_ID=$(oci ce cluster list \
    --compartment-id "$COMPARTMENT_ID" \
    --name "$CLUSTER_NAME" \
    --query 'data[0].id' --raw-output)
fi
echo "Cluster: $CLUSTER_ID"

echo ""
echo "[4/6] Creating ARM node pool (Always Free)..."
oci ce node-pool create \
  --compartment-id "$COMPARTMENT_ID" \
  --cluster-id "$CLUSTER_ID" \
  --name "${CLUSTER_NAME}-arm-pool" \
  --kubernetes-version "$K8S_VERSION" \
  --node-shape "$NODE_SHAPE" \
  --node-shape-config "{\"ocpus\": $NODE_OCPUS, \"memoryInGBs\": $NODE_MEMORY_GB}" \
  --size 1 \
  --placement-configs "[{\"availabilityDomain\": \"$(oci iam availability-domain list --compartment-id $COMPARTMENT_ID --query 'data[0].name' --raw-output)\", \"subnetId\": \"$NODE_SUBNET_ID\"}]" \
  --node-source-details "{\"sourceType\": \"IMAGE\", \"imageId\": \"$(oci compute image list --compartment-id $COMPARTMENT_ID --operating-system 'Oracle Linux' --operating-system-version '8' --shape $NODE_SHAPE --sort-by TIMECREATED --sort-order DESC --query 'data[0].id' --raw-output)\"}" \
  2>/dev/null || echo "Node pool may already exist."

echo ""
echo "[5/6] Configuring kubectl..."
oci ce cluster create-kubeconfig \
  --cluster-id "$CLUSTER_ID" \
  --file "$HOME/.kube/config" \
  --region "$REGION" \
  --token-version 2.0.0 \
  --kube-endpoint PUBLIC_ENDPOINT

echo ""
echo "[6/6] Installing NGINX Ingress Controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/cloud/deploy.yaml

echo ""
echo "============================================"
echo "  Setup complete!"
echo "============================================"
echo ""
echo "Cluster ID: $CLUSTER_ID"
echo ""
echo "Add these GitHub Actions secrets:"
echo "  OCI_CLI_USER       = your OCI user OCID"
echo "  OCI_CLI_TENANCY    = your tenancy OCID"
echo "  OCI_CLI_FINGERPRINT = your API key fingerprint"
echo "  OCI_CLI_KEY_CONTENT = your private key PEM"
echo "  OCI_USER           = your OCI username"
echo "  OCI_AUTH_TOKEN      = your auth token (for OCIR)"
echo ""
echo "Add these GitHub Actions variables:"
echo "  OCI_REGION     = $REGION"
echo "  OCIR_NAMESPACE = $(oci os ns get --query 'data' --raw-output)"
echo "  OKE_CLUSTER_ID = $CLUSTER_ID"
echo ""
echo "Branch → Environment mapping:"
echo "  develop → dev  (namespace: crm-dev)"
echo "  qa      → qa   (namespace: crm-qa)"
echo "  main    → prod (namespace: crm-prod)"
