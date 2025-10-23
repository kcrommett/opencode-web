#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: script/release.sh [--bump patch|minor|major] [--no-publish] [--otp CODE] [--tag NAME] [--no-tag]

Automates the OpenCode Web release flow:
  1. Aligns local package versions with the latest published version on npm
  2. Builds npm artifacts via Bun
  3. Updates lockfiles
  4. Commits the release
  5. Publishes the package to npm (unless --no-publish)
  6. Pushes commit and tag to origin
  7. Optionally creates a git tag (default: v<VERSION>)

Examples:
  script/release.sh                       # patch bump, publish, push
  script/release.sh --bump minor --no-publish
  script/release.sh --bump patch --otp 123456
EOF
}

require_clean_tree() {
  if ! git diff --quiet --ignore-submodules HEAD --; then
    echo "WARNING: Working tree has uncommitted changes. Please commit or stash them before releasing." >&2
    exit 1
  fi
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "❌ Missing required command: $1" >&2
    exit 1
  fi
}

compare_versions() {
  # echoes 1 if $1 > $2, -1 if $1 < $2, 0 if equal
  local IFS=.
  local -a v1=($1)
  local -a v2=($2)
  for idx in 0 1 2; do
    local a=${v1[idx]:-0}
    local b=${v2[idx]:-0}
    if ((10#$a > 10#$b)); then
      echo 1
      return
    elif ((10#$a < 10#$b)); then
      echo -1
      return
    fi
  done
  echo 0
}

increment_version() {
  local version=$1
  local bump=$2
  IFS=. read -r major minor patch <<<"$version"
  case "$bump" in
    major)
      major=$((major + 1))
      minor=0
      patch=0
      ;;
    minor)
      minor=$((minor + 1))
      patch=0
      ;;
    patch)
      patch=$((patch + 1))
      ;;
    *)
      echo "Invalid bump type: $bump" >&2
      exit 1
      ;;
  esac
  echo "${major}.${minor}.${patch}"
}

set_package_version() {
  local file=$1
  local version=$2
  local tmp
  tmp=$(mktemp)
  jq --arg v "$version" '.version = $v' "$file" >"$tmp"
  mv "$tmp" "$file"
}

BUMP="patch"
PUBLISH=1
OTP=""
TAG_NAME=""
CREATE_TAG=1
TEMP_NPMRC=""
ORIGINAL_NPM_CONFIG_USERCONFIG=${NPM_CONFIG_USERCONFIG-__UNSET__}
ORIGINAL_NODE_AUTH_TOKEN=${NODE_AUTH_TOKEN-__UNSET__}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -b|--bump)
      BUMP=${2:-}
      shift 2
      ;;
    --no-publish)
      PUBLISH=0
      shift
      ;;
    --otp)
      OTP=${2:-}
      shift 2
      ;;
    --tag)
      TAG_NAME=${2:-}
      shift 2
      ;;
    --no-tag)
      CREATE_TAG=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

case "$BUMP" in
  major|minor|patch) ;;
  *)
    echo "Invalid bump type: $BUMP" >&2
    usage
    exit 1
    ;;
esac

require_command bun
require_command npm
require_command jq
require_command git

ROOT_DIR=$(git rev-parse --show-toplevel)
cd "$ROOT_DIR"

require_clean_tree

ORIGINAL_HEAD=$(git rev-parse HEAD)

CURRENT_VERSION=$(jq -r '.version' package.json)
PUBLISHED_VERSION=$(npm view opencode-web version 2>/dev/null || echo "0.0.0")

echo "Current repo version: $CURRENT_VERSION"
echo "Latest npm version:  ${PUBLISHED_VERSION:-<none>}"

cmp=$(compare_versions "$CURRENT_VERSION" "$PUBLISHED_VERSION")
if [[ $cmp -lt 0 ]]; then
  echo "INFO: Repo version is behind npm. Using npm version $PUBLISHED_VERSION as base."
  set_package_version "package.json" "$PUBLISHED_VERSION"
  set_package_version "packages/opencode-web/package.json" "$PUBLISHED_VERSION"
  CURRENT_VERSION=$PUBLISHED_VERSION
fi

NEXT_VERSION=$(increment_version "$CURRENT_VERSION" "$BUMP")
echo "Target release version: $NEXT_VERSION"

if npm view "opencode-web@$NEXT_VERSION" version >/dev/null 2>&1; then
  echo "ERROR: Version $NEXT_VERSION already exists on npm. Choose a larger bump or verify the registry state." >&2
  exit 1
fi

export OPENCODE_BUMP=$BUMP
echo "Building npm package via Bun..."
bun ./script/build-npm.ts >/dev/null

NEW_VERSION=$(jq -r '.version' package.json)
if [[ "$NEW_VERSION" != "$NEXT_VERSION" ]]; then
  echo "ERROR: build-npm.ts produced version $NEW_VERSION, expected $NEXT_VERSION." >&2
  exit 1
fi

echo "Updated version: $NEW_VERSION"

# Verify version synchronization between package.json files
ROOT_VERSION=$(jq -r '.version' package.json)
PACKAGE_VERSION=$(jq -r '.version' packages/opencode-web/package.json)

if [[ "$ROOT_VERSION" != "$PACKAGE_VERSION" ]]; then
  echo "ERROR: Version mismatch detected: root=$ROOT_VERSION, package=$PACKAGE_VERSION" >&2
  exit 1
fi

if [[ "$ROOT_VERSION" != "$NEW_VERSION" ]]; then
  echo "ERROR: Version mismatch detected: expected=$NEW_VERSION, root=$ROOT_VERSION" >&2
  exit 1
fi

echo "Version synchronization verified: $ROOT_VERSION"

echo "Updating lockfiles..."
if ! npm install --package-lock-only >/dev/null 2>&1; then
  echo "   npm install --package-lock-only failed, retrying with --legacy-peer-deps..."
  npm install --package-lock-only --legacy-peer-deps >/dev/null
fi
bun install >/dev/null

git status -sb

TAG_NAME=${TAG_NAME:-"v$NEW_VERSION"}

cleanup_on_error() {
  if git rev-parse --verify "$TAG_NAME" >/dev/null 2>&1; then
    git tag -d "$TAG_NAME" >/dev/null 2>&1 || true
  fi
  git reset --hard "$ORIGINAL_HEAD" >/dev/null 2>&1 || true
  if [[ -n "$TEMP_NPMRC" && -f "$TEMP_NPMRC" ]]; then
    rm -f "$TEMP_NPMRC"
  fi
  TEMP_NPMRC=""
  if [[ "$ORIGINAL_NPM_CONFIG_USERCONFIG" == "__UNSET__" ]]; then
    unset NPM_CONFIG_USERCONFIG || true
  else
    export NPM_CONFIG_USERCONFIG="$ORIGINAL_NPM_CONFIG_USERCONFIG"
  fi
  if [[ "$ORIGINAL_NODE_AUTH_TOKEN" == "__UNSET__" ]]; then
    unset NODE_AUTH_TOKEN || true
  else
    export NODE_AUTH_TOKEN="$ORIGINAL_NODE_AUTH_TOKEN"
  fi
}

trap 'echo "ERROR: Release failed. Cleaning up..."; cleanup_on_error' ERR

echo "Creating release commit..."
git add -A
git commit -m "chore: release v$NEW_VERSION"

if [[ $CREATE_TAG -eq 1 ]]; then
  echo "Tagging commit with $TAG_NAME"
  git tag -a "$TAG_NAME" -m "Release $TAG_NAME"
fi

if [[ $PUBLISH -eq 1 ]]; then
  echo "Publishing opencode-web@$NEW_VERSION to npm..."
  pushd packages/opencode-web >/dev/null
  if [[ -n "${NPM_TOKEN:-${NODE_AUTH_TOKEN:-}}" ]]; then
    TOKEN="${NPM_TOKEN:-${NODE_AUTH_TOKEN}}"
    echo "   using automation token from environment"
    TEMP_NPMRC=$(mktemp)
    {
      printf "//registry.npmjs.org/:_authToken=%s\n" "$TOKEN"
      printf "always-auth=true\n"
    } >"$TEMP_NPMRC"
    export NPM_CONFIG_USERCONFIG="$TEMP_NPMRC"
    export NODE_AUTH_TOKEN="$TOKEN"
  fi
  PUBLISH_ARGS=(--access public)
  if [[ -n "$OTP" ]]; then
    PUBLISH_ARGS+=(--otp "$OTP")
  fi
  npm publish "${PUBLISH_ARGS[@]}"
  popd >/dev/null
else
  echo "INFO: Skipping npm publish (per --no-publish)."
fi

echo "Pushing commit to origin..."
git push origin HEAD:master

if [[ $CREATE_TAG -eq 1 ]]; then
  echo "Pushing tag $TAG_NAME..."
  git push origin "$TAG_NAME"
fi

if [[ -n "$TEMP_NPMRC" && -f "$TEMP_NPMRC" ]]; then
  rm -f "$TEMP_NPMRC"
fi
TEMP_NPMRC=""
if [[ "$ORIGINAL_NPM_CONFIG_USERCONFIG" == "__UNSET__" ]]; then
  unset NPM_CONFIG_USERCONFIG
else
  export NPM_CONFIG_USERCONFIG="$ORIGINAL_NPM_CONFIG_USERCONFIG"
fi
if [[ "$ORIGINAL_NODE_AUTH_TOKEN" == "__UNSET__" ]]; then
  unset NODE_AUTH_TOKEN
else
  export NODE_AUTH_TOKEN="$ORIGINAL_NODE_AUTH_TOKEN"
fi

echo "Release v$NEW_VERSION complete."
echo "   - Commit pushed to master"
if [[ $CREATE_TAG -eq 1 ]]; then
  echo "   - Tag pushed: $TAG_NAME"
fi
if [[ $PUBLISH -eq 1 ]]; then
  echo "   - npm publish succeeded"
else
  echo "   - npm publish skipped"
fi

trap - ERR
