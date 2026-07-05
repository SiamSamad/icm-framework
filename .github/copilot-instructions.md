# Copilot Instructions

This repository uses ICM (Interpretable Context Methodology). The authoritative operating
manual is `AGENTS.md` in the repo root — read it before doing anything.

Key conventions:
- Work one numbered stage at a time (`stages/01-normalize` … `stages/05-results`); each stage
  has its own `prompt.md` contract and `output/` folder.
- Stages 03 (approve) and 05 (disposition) are human gates — do not skip them.
- Follow the selector precedence in `_config/selectors.md`.
- Never surface tool/plugin names in user-facing text (the "little-lift" principle).
- Cleanup rules live in `CLAUDE.md` and apply identically here: list files before deleting,
  never touch `playwright/`.
