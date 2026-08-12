#!/usr/bin/env bash

set -Eeuo pipefail

# Configure GitHub repository settings
# This script sets up recommended settings for branch protection, merge options, and more

# Auto-detect repo and default branch from git remote
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name')

echo "Configuring GitHub settings for $REPO"
echo "Default branch: $BRANCH"
echo ""

# Helper function to prompt for confirmation
confirm() {
    local prompt="$1"
    local response
    read -r -p "$prompt [y/N] " response
    [[ "$response" =~ ^[Yy]$ ]]
}

# Helper to check and prompt for a boolean repo setting
check_repo_setting() {
    local setting="$1"
    local desired="$2"
    local description="$3"
    local current
    current=$(echo "$CURRENT_SETTINGS" | jq -r ".$setting")

    if [[ "$current" == "$desired" ]]; then
        return
    fi

    local action current_desc
    if [[ "$desired" == "true" ]]; then
        action="Enable"
        current_desc="currently disabled"
    else
        action="Disable"
        current_desc="currently enabled"
    fi

    if confirm "$action $description? ($current_desc)"; then
        gh api "repos/${REPO}" --method PATCH --field "$setting=$desired" > /dev/null
        echo "  Updated."
    fi
}

# ============================================================================
# Repository Settings
# ============================================================================

echo "=== Repository Settings ==="
echo ""

# Get current repo settings
CURRENT_SETTINGS=$(gh api "repos/${REPO}")

check_repo_setting "allow_squash_merge"      "false" "squash merging"
check_repo_setting "allow_merge_commit"      "true"  "merge commits"
check_repo_setting "allow_rebase_merge"      "true"  "rebase merging"
check_repo_setting "allow_auto_merge"        "true"  "auto-merge"
check_repo_setting "delete_branch_on_merge"  "true"  "delete branch on merge"
check_repo_setting "allow_update_branch"     "true"  "updating PR branches"

echo ""

# ============================================================================
# Branch Protection
# ============================================================================

echo "=== Branch Protection ($BRANCH) ==="
echo ""

# Check current branch protection
CURRENT_PROTECTION=$(gh api "repos/${REPO}/branches/${BRANCH}/protection" 2>/dev/null) || CURRENT_PROTECTION='{}'

# Get current values (with defaults for missing protection)
BP_CONTEXTS=$(echo "$CURRENT_PROTECTION" | jq -c '.required_status_checks.contexts // []')
BP_STRICT=$(echo "$CURRENT_PROTECTION" | jq -r '.required_status_checks.strict // false')
BP_LINEAR_HISTORY=$(echo "$CURRENT_PROTECTION" | jq -r '.required_linear_history.enabled // false')
BP_ALLOW_FORCE_PUSHES=$(echo "$CURRENT_PROTECTION" | jq -r '.allow_force_pushes.enabled // false')

UPDATE_PROTECTION=false

# Helper to check and prompt for branch protection boolean setting
check_protection_bool() {
    local var_name="$1"
    local desired="$2"
    local description="$3"
    local current="${!var_name}"

    if [[ "$current" == "$desired" ]]; then
        return
    fi

    local action current_desc
    if [[ "$desired" == "true" ]]; then
        action="Enable"
        current_desc="currently disabled"
    else
        action="Disable"
        current_desc="currently enabled"
    fi

    if confirm "$action $description? ($current_desc)"; then
        UPDATE_PROTECTION=true
        printf -v "$var_name" '%s' "$desired"
    fi
}

# Check required status checks (special case - not a simple bool)
if [[ "$BP_CONTEXTS" != '["All checks"]' ]]; then
    if confirm "Set required status checks to [\"All checks\"]? (currently $BP_CONTEXTS)"; then
        UPDATE_PROTECTION=true
        BP_CONTEXTS='["All checks"]'
        BP_STRICT=true
    fi
fi

check_protection_bool "BP_STRICT"             "true"  "require branches to be up to date"
check_protection_bool "BP_LINEAR_HISTORY"     "true"  "require linear history"
check_protection_bool "BP_ALLOW_FORCE_PUSHES" "true"  "allow force pushes (for admins)"

# Apply branch protection changes if any
if [[ "$UPDATE_PROTECTION" == "true" ]]; then
    echo "Updating branch protection..."

    # Preserve existing values for required fields we don't have opinions on
    BP_ENFORCE_ADMINS=$(echo "$CURRENT_PROTECTION" | jq -r '.enforce_admins.enabled // null')
    BP_REVIEWS=$(echo "$CURRENT_PROTECTION" | jq -c '.required_pull_request_reviews // null')
    BP_RESTRICTIONS=$(echo "$CURRENT_PROTECTION" | jq -c '.restrictions // null')

    cat << EOF | gh api "repos/${REPO}/branches/${BRANCH}/protection" --method PUT --input -
{
  "required_status_checks": {"strict": $BP_STRICT, "contexts": $BP_CONTEXTS},
  "enforce_admins": $BP_ENFORCE_ADMINS,
  "required_pull_request_reviews": $BP_REVIEWS,
  "restrictions": $BP_RESTRICTIONS,
  "required_linear_history": $BP_LINEAR_HISTORY,
  "allow_force_pushes": $BP_ALLOW_FORCE_PUSHES
}
EOF
    echo "  Branch protection updated."
fi

echo ""

# ============================================================================
# Security Settings
# ============================================================================

echo "=== Security Settings ==="
echo ""

check_security_setting() {
    local endpoint="$1"
    local description="$2"
    local current
    current=$(gh api "repos/${REPO}/$endpoint" --silent && echo "true" || echo "false")

    if [[ "$current" == "true" ]]; then
        return
    fi

    if confirm "Enable $description? (currently disabled)"; then
        gh api "repos/${REPO}/$endpoint" --method PUT
        echo "  Updated."
    fi
}

check_security_setting "vulnerability-alerts"      "vulnerability alerts"
check_security_setting "automated-security-fixes"  "automated security fixes (Dependabot)"

echo ""

# ============================================================================
# Actions Workflow Permissions
# ============================================================================

echo "=== Actions Workflow Permissions ==="
echo ""

WORKFLOW_PERMS=$(gh api "repos/${REPO}/actions/permissions/workflow")
DEFAULT_PERMS=$(echo "$WORKFLOW_PERMS" | jq -r '.default_workflow_permissions')
CAN_APPROVE=$(echo "$WORKFLOW_PERMS" | jq -r '.can_approve_pull_request_reviews')

if [[ "$DEFAULT_PERMS" != "read" ]]; then
    if confirm "Reset default workflow token permissions to read-only? (currently: $DEFAULT_PERMS; workflows needing write should declare a permissions: block)"; then
        gh api "repos/${REPO}/actions/permissions/workflow" --method PUT --field default_workflow_permissions=read > /dev/null
        echo "  Updated."
    fi
fi

if [[ "$CAN_APPROVE" == "true" ]]; then
    if confirm "Disallow Actions from approving pull request reviews? (currently allowed)"; then
        gh api "repos/${REPO}/actions/permissions/workflow" --method PUT --field can_approve_pull_request_reviews=false > /dev/null
        echo "  Updated."
    fi
fi

echo ""

# ============================================================================
# Secrets Audit
# ============================================================================

echo "=== Secrets Audit ==="
echo ""

# Warn about secrets referenced by workflows that don't exist on the repo.
# Secrets can't be restored by script (e.g. after repo recreation), but the gap
# should be surfaced.
WORKFLOWS_DIR="$(git rev-parse --show-toplevel)/.github/workflows"
REFERENCED_SECRETS=$(grep -rhoE 'secrets\.[A-Za-z_][A-Za-z0-9_]*' "$WORKFLOWS_DIR" 2>/dev/null | sed 's/^secrets\.//' | sort -u | grep -vx 'GITHUB_TOKEN' || true)
EXISTING_SECRETS=$(gh api "repos/${REPO}/actions/secrets" --jq '.secrets[].name' 2>/dev/null || true)

if [[ -z "$REFERENCED_SECRETS" ]]; then
    echo "  No secrets referenced by workflows."
else
    MISSING=false
    while IFS= read -r secret; do
        if ! grep -qx "$secret" <<< "$EXISTING_SECRETS"; then
            echo "  WARNING: workflows reference secrets.$secret but no such repo secret exists"
            MISSING=true
        fi
    done <<< "$REFERENCED_SECRETS"
    [[ "$MISSING" == "false" ]] && echo "  All referenced secrets exist."
fi

echo ""

# ============================================================================
# Summary
# ============================================================================

echo "=== Done ==="
