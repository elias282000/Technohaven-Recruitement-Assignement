#!/usr/bin/env fish

set -l project_root (realpath (dirname (status filename))/..)
set -l evidence_dir "$project_root/docs/testing/evidence"
set -l report_file "$evidence_dir/final-submission-check.txt"

mkdir -p "$evidence_dir"

function log_section
    echo
    echo "============================================================"
    echo $argv
    echo "============================================================"
end

function fail
    echo
    echo "FINAL CHECK FAILED: $argv" >&2
    exit 1
end

function run_checked
    echo
    echo "\$ $argv"

    command $argv

    if test $status -ne 0
        fail "Command failed: $argv"
    end
end

begin
    echo "Real-Time Service Request Management System"
    echo "Final submission verification"
    echo "Generated at: "(date --iso-8601=seconds)
    echo "Project root: $project_root"

    log_section "1. Git repository"

    cd "$project_root"; or fail "Cannot open project root."

    run_checked git branch --show-current
    run_checked git status --short
    run_checked git log --oneline -15

    log_section "2. Required files"

    set -l required_files \
        README.md \
        "docs/Documents/System analysis.md" \
        "docs/Documents/System Design.md" \
        "docs/Documents/Technical Test Assignment.pdf" \
        "docs/testing/phase-4-acceptance-test-report.md" \
        "docs/testing/phase-4-defect-log.md" \
        "docs/Service Request Management - Acceptance.postman_collection.json" \
        "docs/Service Request.postman_environment.json" \
        backend/requirements.txt \
        backend/pyproject.toml \
        frontend/package.json \
        frontend/package-lock.json

    for required_file in $required_files
        if not test -f "$project_root/$required_file"
            fail "Required file is missing: $required_file"
        end

        echo "PASS: $required_file"
    end

    log_section "3. Environment safety"

    if git ls-files --error-unmatch backend/.env >/dev/null 2>&1
        fail "backend/.env is tracked by Git."
    end

    if git ls-files --error-unmatch frontend/.env >/dev/null 2>&1
        fail "frontend/.env is tracked by Git."
    end

    if not git check-ignore backend/.env >/dev/null 2>&1
        fail "backend/.env is not ignored."
    end

    if not git check-ignore frontend/.env >/dev/null 2>&1
        fail "frontend/.env is not ignored."
    end

    echo "PASS: real environment files are ignored."

    log_section "4. Secret scan"

    set -l secret_matches (
        git grep -nE \
            -e 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' \
            -e 'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY' \
            -- \
            ':!scripts/final_check.fish' \
            ':!scripts/package_submission.fish' \
            2>/dev/null
    )

    if test (count $secret_matches) -gt 0
        echo "Potential secret-like content found:"
        printf '%s\n' $secret_matches
        fail "Review potential secret exposure."
    end

    echo "PASS: no obvious committed JWT or private key found."

    for match in $database_url_matches
        if not string match -qr \
            "(CHANGE_ME|change-me|replace-with|YOUR_PASSWORD)" \
            "$match"
            echo "Potential non-placeholder database URL found:"
            echo "$match"
            fail "Review committed database credentials."
        end
    end

    echo "PASS: committed database URLs use placeholders."

    if test (count $secret_matches) -gt 0
        echo "Potential secret-like content found:"
        printf '%s\n' $secret_matches
        fail "Review potential secret exposure."
    end

    echo "PASS: no obvious committed JWT or private key found."

    log_section "5. Backend tests"

    cd "$project_root/backend"; or fail "Cannot open backend directory."

    if not test -f .venv/bin/activate.fish
        fail "Backend virtual environment was not found."
    end

    source .venv/bin/activate.fish

    run_checked pytest -v
    run_checked python -m compileall app tests
    run_checked python -m app.db.verify_db

    log_section "6. Frontend checks"

    cd "$project_root/frontend"; or fail "Cannot open frontend directory."

    if not test -d node_modules
        run_checked npm ci
    end

    run_checked npm run lint
    run_checked npm run build

    if not test -f dist/index.html
        fail "Frontend production build does not contain dist/index.html."
    end

    echo "PASS: frontend production output exists."

    log_section "7. No-polling verification"

    set -l polling_matches (
        grep -RIn \
            --include='*.ts' \
            --include='*.tsx' \
            "setInterval" \
            "$project_root/frontend/src" \
            2>/dev/null
    )

    if test (count $polling_matches) -gt 0
        printf '%s\n' $polling_matches
        fail "Potential polling implementation found."
    end

    echo "PASS: no setInterval polling found."

    log_section "8. Temporary-code scan"

    set -l temporary_matches (
        grep -RIn \
            --exclude-dir=.venv \
            --exclude-dir=node_modules \
            --exclude-dir=dist \
            --exclude-dir=__pycache__ \
            -e "Error boundary verification" \
            -e "debugger;" \
            -e "TODO:" \
            -e "FIXME:" \
            "$project_root/backend" \
            "$project_root/frontend" \
            2>/dev/null
    )

    if test (count $temporary_matches) -gt 0
        echo "Temporary-code markers found:"
        printf '%s\n' $temporary_matches
        fail "Remove or resolve temporary code markers."
    end

    echo "PASS: no blocked temporary-code markers found."

    log_section "9. Postman safety"

    set -l postman_files \
        "$project_root/docs/Service Request Management - Acceptance.postman_collection.json" \
        "$project_root/docs/Service Request.postman_environment.json"

    for postman_file in $postman_files
        if grep -Eq "eyJhbGci[A-Za-z0-9_-]*" "$postman_file"
            fail "A JWT appears to be present in: $postman_file"
        end
    end

    echo "PASS: Postman files do not contain obvious JWT values."

    log_section "10. Documentation checks"

    grep -q "System Analysis" "$project_root/README.md"; or \
        fail "README does not link System Analysis."

    grep -q "System Design" "$project_root/README.md"; or \
        fail "README does not link System Design."

    grep -q "Postman" "$project_root/README.md"; or \
        fail "README does not document Postman."

    grep -q "Restart Recovery" "$project_root/README.md"; or \
        fail "README does not document restart recovery."

    grep -q "WebSocket" "$project_root/README.md"; or \
        fail "README does not document WebSockets."

    echo "PASS: required README topics found."

    log_section "FINAL RESULT"

    echo "All automated final-submission checks passed."
end 2>&1 | tee "$report_file"

exit $pipestatus[1]