# Prospect Dashboard task runner — https://just.systems
# Run `just` (or `just --list`) to see all recipes.
# Install just once with: brew install just

# Show available recipes
default:
    @just --list

# Run the whole app: capture worker + dashboard together (Ctrl-C stops both)
start:
    #!/usr/bin/env bash
    set -uo pipefail
    trap 'kill 0' EXIT
    echo "▶ capture worker + dashboard  —  http://localhost:3000 (or 3001)  —  Ctrl-C to stop"
    npm run capture &
    npm run dev

# Dashboard only (no capture worker)
dashboard:
    npm run dev

# Capture worker only (watches inbox/ for dropped sites)
worker:
    npm run capture

# Queue one site to scrape. Name is optional and may be several words:
#   just add https://acme.com
#   just add https://acme.com Acme Plumbing Co
add URL *NAME:
    npx tsx scripts/enqueue.ts "{{URL}}" --name "{{NAME}}"

# Bulk-queue from a list file (one "url[, name, city, state, industry]" per line):
#   just import samples/sites.example.txt
import FILE:
    npx tsx scripts/enqueue.ts --file "{{FILE}}"

# One-shot: capture a specific JSON file, then exit
capture FILE:
    npm run capture -- "{{FILE}}"

# Show the queue: capture states + any files still waiting in inbox/
queue:
    #!/usr/bin/env bash
    if [ -f data/app.db ]; then
      echo "prospects by capture status:"
      sqlite3 -column data/app.db "SELECT capture_status, count(*) FROM prospects GROUP BY capture_status;"
    else
      echo "(no database yet — run the worker once)"
    fi
    waiting=$(ls inbox/*.json 2>/dev/null | wc -l | tr -d ' ')
    echo "files waiting in inbox/: ${waiting}"

# Open the database in Drizzle Studio
db:
    npm run db:studio

# Apply database migrations
migrate:
    npm run db:migrate

# Insert a couple of demo rows
seed:
    npm run seed

# Stop the dev server + worker started by `just start`
stop:
    -pkill -f "next dev"
    -pkill -f "worker/capture.ts"
