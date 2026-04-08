# Obsidian Ground-Truth Mirror

This directory is generated so the product ground truth can be browsed in Obsidian.

- Canonical runtime/edit data remains JSON in `knowledge_base/raw/sources/`.
- Frontend/editor continues to use JSON.
- Regenerate this markdown mirror after JSON changes.

## Generate
```bash
python local_tool/query.py export-md
```

## Open in Obsidian
Open this folder (`knowledge_base/obsidian`) as a vault.

Start at:
- `index.md`
