#!/usr/bin/env python
"""
Preprocess canonical sources into chunked local retrieval index.
"""

from pathlib import Path

from retrieval_engine import INDEX_PATH, save_index


def main() -> None:
    payload = save_index(INDEX_PATH)
    chunk_count = len(payload.get("chunks", [])) if isinstance(payload, dict) else 0
    print(f"Wrote retrieval index to {Path(INDEX_PATH).resolve()} ({chunk_count} chunks)")


if __name__ == "__main__":
    main()

