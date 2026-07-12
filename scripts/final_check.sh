#!/usr/bin/env bash

set -uo pipefail

project_root="$(realpath "$(dirname "${BASH_SOURCE[0]}")/..")"
evidence_dir="$project_root/docs/testing/evidence"
report_file="$evidence_dir/final-submission-check.txt"

mkdir -p "$evidence_dir"

log_section() {
    echo
    echo "============================================================"
    echo "$*"
    echo "============================================================"
}

fail() {
    echo >&2
    echo "FINAL CHECK FAILED: $*" >&2
    exit 1
}

run_checked() {
    echo
    printf '$'
    printf ' %q' "$@"
    echo

    "$@" || fail "Command failed: $*"
}

main() {
    echo "Real-Time Service Request Management System"
    echo "Final submission verification"
    echo "Generated at: $(date --iso-8601=seconds)"
    echo "Project root: $project_root"

    log_section "1. Git repository"

    cd "$project_root" || fail "Cannot open project root."

    run_checked git branch --show-current
    run_checked git status --short
    run_checked git log --oneline -15

    log_section "2. Required files"

    local required_files=(
        "README.md"
        "docs/Documents/System analysis.md"
        "docs/Documents/System Design.md"
        "docs/Documents/Technical Test Assignment.pdf"
        "docs/testing/phase-4-acceptance-test-report.md"
        "docs/testing/phase-4-defect-log.md"
        "docs/Service Request Management - Acceptance.postman_collection.json"
        "docs/Service Request.postman_environment.json"
        "backend/requirements.txt"
        "backend/pyproject.toml"
        "frontend/package.json"
        "frontend/package-lock.json"
    )

    local required_file
    for required_file in "${required_files[@]}"; do
        [[ -f "$project_root/$required_file" ]] || \
            fail "Required file is missing: $required_file"

        echo "PASS: $required_file"
    done

    log_section "3. Environment safety"

    if git ls-files --error-unmatch backend/.env >/dev/null 2>&1; then
        fail "backend/.env is tracked by Git."
    fi

    if git ls-files --error-unmatch frontend/.env >/dev/null 2>&1; then
        fail "frontend/.env is tracked by Git."
    fi

    git check-ignore backend/.env >/dev/null 2>&1 || \
        fail "backend/.env is not ignored."

    git check-ignore frontend/.env >/dev/null 2>&1 || \
        fail "frontend/.env is not ignored."

    echo "PASS: real environment files are ignored."

    log_section "4. Secret scan"

    local -a secret_matches=()
    mapfile -t secret_matches < <(
        git grep -nE \
            -e 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' \
            -e 'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY' \
            -- \
            ':!scripts/final_check.fish' \
            ':!scripts/package_submission.fish' \
            ':!scripts/final_check.sh' \
            ':!scripts/package_submission.sh' \
            2>/dev/null || true
    )

    if (( ${#secret_matches[@]} > 0 )); then
        echo "Potential secret-like content found:"
        printf '%s\n' "${secret_matches[@]}"
        fail "Review potential secret exposure."
    fi

    echo "PASS: no obvious committed JWT or private key found."

    local -a database_url_matches=()
    mapfile -t database_url_matches < <(
        git grep -nE \
            -e "postgres(ql)?(\\+asyncpg)?://[^[:space:]\"']+:[^[:space:]\"']+@" \
            -- \
            ':!scripts/final_check.fish' \
            ':!scripts/package_submission.fish' \
            ':!scripts/final_check.sh' \
            ':!scripts/package_submission.sh' \
            2>/dev/null || true
    )

    local match
    for match in "${database_url_matches[@]}"; do
        if ! grep -Eq '(CHANGE_ME|change-me|replace-with|YOUR_PASSWORD)' <<<"$match"; then
            echo "Potential non-placeholder database URL found:"
            echo "$match"
            fail "Review committed database credentials."
        fi
    done

    echo "PASS: committed database URLs use placeholders."

    log_section "5. Backend tests"

    cd "$project_root/backend" || fail "Cannot open backend directory."

    [[ -f .venv/bin/activate ]] || \
        fail "Backend virtual environment was not found."

    # shellcheck disable=SC1091
    source .venv/bin/activate

    run_checked pytest -v
    run_checked python -m compileall app tests
    run_checked python -m app.db.verify_db

    log_section "6. Frontend checks"

    cd "$project_root/frontend" || fail "Cannot open frontend directory."

    if [[ ! -d node_modules ]]; then
        run_checked npm ci
    fi

    run_checked npm run lint
    run_checked npm run build

    [[ -f dist/index.html ]] || \
        fail "Frontend production build does not contain dist/index.html."

    echo "PASS: frontend production output exists."

    log_section "7. No-polling verification"

    local -a polling_matches=()
    mapfile -t polling_matches < <(
        grep -RIn \
            --include='*.ts' \
            --include='*.tsx' \
            'setInterval' \
            "$project_root/frontend/src" \
            2>/dev/null || true
    )

    if (( ${#polling_matches[@]} > 0 )); then
        printf '%s\n' "${polling_matches[@]}"
        fail "Potential polling implementation found."
    fi

    echo "PASS: no setInterval polling found."

    log_section "8. Temporary-code scan"

    local -a temporary_matches=()
    mapfile -t temporary_matches < <(
        grep -RIn \
            --exclude-dir=.venv \
            --exclude-dir=node_modules \
            --exclude-dir=dist \
            --exclude-dir=__pycache__ \
            -e 'Error boundary verification' \
            -e 'debugger;' \
            -e 'TODO:' \
            -e 'FIXME:' \
            "$project_root/backend" \
            "$project_root/frontend" \
            2>/dev/null || true
    )

    if (( ${#temporary_matches[@]} > 0 )); then
        echo "Temporary-code markers found:"
        printf '%s\n' "${temporary_matches[@]}"
        fail "Remove or resolve temporary code markers."
    fi

    echo "PASS: no blocked temporary-code markers found."

    log_section "9. Postman safety"

    local postman_files=(
        "$project_root/docs/Service Request Management - Acceptance.postman_collection.json"
        "$project_root/docs/Service Request.postman_environment.json"
    )

    local postman_file
    for postman_file in "${postman_files[@]}"; do
        if grep -Eq 'eyJhbGci[A-Za-z0-9_-]*' "$postman_file"; then
            fail "A JWT appears to be present in: $postman_file"
        fi
    done

    echo "PASS: Postman files do not contain obvious JWT values."

    log_section "10. Documentation checks"

    grep -q 'System Analysis' "$project_root/README.md" || \
        fail "README does not link System Analysis."

    grep -q 'System Design' "$project_root/README.md" || \
        fail "README does not link System Design."

    grep -q 'Postman' "$project_root/README.md" || \
        fail "README does not document Postman."

    grep -q 'Restart Recovery' "$project_root/README.md" || \
        fail "README does not document restart recovery."

    grep -q 'WebSocket' "$project_root/README.md" || \
        fail "README does not document WebSockets."

    echo "PASS: required README topics found."

    log_section "FINAL RESULT"

    echo "All automated final-submission checks passed."
}

main 2>&1 | tee "$report_file"
pipeline_status=("${PIPESTATUS[@]}")

if (( pipeline_status[1] != 0 )); then
    echo "FINAL CHECK FAILED: Could not write report file: $report_file" >&2
    exit "${pipeline_status[1]}"
fi

exit "${pipeline_status[0]}"
