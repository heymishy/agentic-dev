#!/bin/bash
set -e

QUEUE_ROOT=${1:-./queue}

mkdir -p "$QUEUE_ROOT/inbox"
mkdir -p "$QUEUE_ROOT/review"
mkdir -p "$QUEUE_ROOT/quality-review"
mkdir -p "$QUEUE_ROOT/done"

touch "$QUEUE_ROOT/history.jsonl"

echo "Queue initialised at $QUEUE_ROOT"
