#!/usr/bin/env bash

set -uo pipefail

project_root="$(realpath "$(dirname "${BASH_SOURCE[0]}")/..")"
project_name="real-time-service-request-management-system"
timestamp="$(date '+%Y%m%d-%H%M%S')"
output_dir="$project_root/submission"
staging_dir="$output_dir/$project_name"
archive_path="$output_dir/$project_name-$timestamp.zip"

fail() {
    echo "PACKAGING FAILED: $*" >&2
    exit 1
}

cd "$project_root" || fail "Cannot open project root."

[[ -x "$project_root/scripts/final_check.sh" ]] || \
    fail "Run or create scripts/final_check.sh first and make it executable."

echo "Running final verification..."
"$project_root/scripts/final_check.sh" || \
    fail "Final verification did not pass."

rm -rf "$staging_dir"
mkdir -p "$staging_dir"

echo "Copying submission files..."

rsync -a \
    --exclude='.git/' \
    --exclude='submission/' \
    --exclude='backend/.env' \
    --exclude='frontend/.env' \
    --exclude='backend/.venv/' \
    --exclude='backend/.venv_submission_check/' \
    --exclude='frontend/node_modules/' \
    --exclude='frontend/dist/' \
    --exclude='__pycache__/' \
    --exclude='*.pyc' \
    --exclude='.pytest_cache/' \
    --exclude='.coverage' \
    --exclude='htmlcov/' \
    --exclude='.idea/' \
    --exclude='.vscode/' \
    --exclude='*.log' \
    "$project_root/" \
    "$staging_dir/" || \
    fail "Could not copy submission files."

echo "Checking archive staging area..."

excluded_path="$(
    find "$staging_dir" \
        \( \
            -name '.env' \
            -o -name 'node_modules' \
            -o -name '.venv' \
            -o -name '__pycache__' \
            -o -name '*.pyc' \
        \) \
        -print -quit
)"

if [[ -n "$excluded_path" ]]; then
    echo "Unexpected excluded path: $excluded_path" >&2
    fail "Excluded development files were found in staging."
fi

staging_secret_matches="$(
    grep -RInE \
        --binary-files=without-match \
        --exclude='final_check.fish' \
        --exclude='package_submission.fish' \
        --exclude='final_check.sh' \
        --exclude='package_submission.sh' \
        -e 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' \
        -e 'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY' \
        "$staging_dir" \
        2>/dev/null || true
)"

if [[ -n "$staging_secret_matches" ]]; then
    echo
    echo "Potential secret-like content found in staging:"
    printf '%s\n' "$staging_secret_matches"
    fail "Remove or redact the listed content before packaging."
fi

echo "PASS: no obvious JWT or private key found in staging."

mkdir -p "$output_dir"
rm -f "$archive_path" "$archive_path.sha256"

cd "$output_dir" || fail "Cannot open output directory."

zip -qr \
    "$archive_path" \
    "$project_name" || \
    fail "Could not create ZIP archive."

sha256sum "$archive_path" \
    > "$archive_path.sha256" || \
    fail "Could not create SHA-256 checksum."

echo
echo "Submission archive created:"
echo "$archive_path"
echo
echo "Checksum file:"
echo "$archive_path.sha256"
echo
echo "Archive contents:"
unzip -l "$archive_path" | tail -n 20
