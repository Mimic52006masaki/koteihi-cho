#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
repo_dir=$(pwd)
run_name="koteihi-import-test-$$"
cleanup() {
  docker rm -f "$run_name" >/dev/null 2>&1 || true
  docker network rm "$run_name" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM
docker build -t koteihi-import-test -f tests/Dockerfile .
docker network create "$run_name" >/dev/null
docker run -d --rm --name "$run_name" --network "$run_name" \
  -e MYSQL_ROOT_PASSWORD=local-test-only -e MYSQL_DATABASE=koteihi_test mysql:8.4 >/dev/null
attempt=0
until docker exec "$run_name" mysqladmin ping -h 127.0.0.1 -plocal-test-only --silent >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then echo 'MySQL startup timed out' >&2; exit 1; fi
  sleep 1
done
docker run --rm --network "$run_name" -v "$repo_dir:/work:ro" \
  -e DB_HOST="$run_name" -e DB_NAME=koteihi_test -e DB_USER=root -e DB_PASS=local-test-only \
  koteihi-import-test php tests/imports.php
