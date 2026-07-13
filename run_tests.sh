#!/usr/bin/env bash
# Lance la suite de tests backend dans le conteneur (stack docker-compose.dev up).
# Usage : bash run_tests.sh [args pytest...]   (ex: bash run_tests.sh -k oversell -v)
set -e
COMPOSE="docker compose -f docker-compose.dev.yml"

# Base de test jetable (ignore l'erreur si elle existe déjà).
$COMPOSE exec -T postgres psql -U farahevent_user -d farahevent \
  -c "CREATE DATABASE farahevent_test" 2>/dev/null || true

# Dépendances de test (pytest) — rapide si déjà installées.
$COMPOSE exec -T backend pip install -q "pytest==8.3.4" "pytest-asyncio==0.23.8"

# Run : base de test + NullPool (isolation event loop) + echo SQL coupé.
$COMPOSE exec -T \
  -e DATABASE_URL="postgresql+asyncpg://farahevent_user:devpassword@postgres:5432/farahevent_test" \
  -e APP_ENV=development -e DEBUG=False -e DB_NULLPOOL=1 \
  backend python -m pytest "$@"
