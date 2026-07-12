#!/usr/bin/env fish

set -l project_root (realpath (dirname (status filename))/..)
set -l project_name "real-time-service-request-management-system"
set -l timestamp (date "+%Y%m%d-%H%M%S")
set -l output_dir "$project_root/submission"
set -l staging_dir "$output_dir/$project_name"
set -l archive_path "$output_dir/$project_name-$timestamp.zip"

function fail
    echo "PACKAGING FAILED: $argv" >&2
    exit 1
end

cd "$project_root"; or fail "Cannot open project root."

if not test -x "$project_root/scripts/final_check.fish"
    fail "Run or create scripts/final_check.fish first."
end

echo "Running final verification..."
"$project_root/scripts/final_check.fish"; or \
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
    "$staging_dir/"; or \
    fail "Could not copy submission files."

echo "Checking archive staging area..."

if find "$staging_dir" \
    \( \
        -name '.env' \
        -o -name 'node_modules' \
        -o -name '.venv' \
        -o -name '__pycache__' \
        -o -name '*.pyc' \
    \) \
    | grep -q .
    fail "Excluded development files were found in staging."
end

set -l staging_secret_matches (
    grep -RInE \
        --binary-files=without-match \
        --exclude='final_check.fish' \
        --exclude='package_submission.fish' \
        -e 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' \
        -e 'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY' \
        "$staging_dir" \
        2>/dev/null
)

if test (count $staging_secret_matches) -gt 0
    echo
    echo "Potential secret-like content found in staging:"
    printf '%s\n' $staging_secret_matches
    fail "Remove or redact the listed content before packaging."
end

echo "PASS: no obvious JWT or private key found in staging."

mkdir -p "$output_dir"

rm -f "$archive_path"

cd "$output_dir"; or fail "Cannot open output directory."

zip -qr \
    "$archive_path" \
    "$project_name"; or \
    fail "Could not create ZIP archive."

sha256sum "$archive_path" \
    > "$archive_path.sha256"; or \
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