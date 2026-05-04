---
inclusion: auto
---

# Spec QA Stage

Every spec task list MUST include a final **QA stage** after the last checkpoint task. This stage is where the user manually tests the feature and may discover UX issues, missing translations, edge cases, or usability gaps that weren't anticipated during design.

## Task List Convention

After the final checkpoint task (build + tests pass), always add:

```markdown
- [ ] N. Manual QA and post-implementation review
  - Deploy or run the feature locally and test all user-facing flows end-to-end
  - Verify UI text is in Spanish and free of raw IDs/UUIDs
  - Verify navigation, badges, and indicators work across all relevant pages
  - Document any issues found as new requirements in a "Post-Implementation Findings" section in requirements.md
  - Add corresponding design notes and implementation tasks for each finding
  - Re-run build and tests after fixes
```

## How Post-Implementation Findings Are Documented

When the QA stage reveals issues, they are added to the existing spec files — not a separate spec:

1. **requirements.md** — Add a `## Post-Implementation Findings` section at the end with new numbered requirements (continuing the existing numbering). Each requirement includes context explaining what was observed during testing.

2. **design.md** — Add a `## Post-Implementation Design Additions` section at the end with design notes for each fix.

3. **tasks.md** — Add a `## Post-Implementation UX Fixes` section at the end with new numbered tasks (continuing the existing numbering), referencing the new requirements.

## Common QA Findings

These are the most frequent issues discovered during QA. Keep them in mind during design to minimize post-implementation fixes:

- **Raw UUIDs in user-facing text** — Resolve to human-readable names before displaying
- **Missing translations** — All user-facing text must be in Spanish; check translation maps cover all enum values
- **Inconsistent navigation indicators** — Badges, counts, and status indicators must appear on all relevant pages, not just the detail page
- **Buried actions** — Important actions (settings, preferences) should be accessible without scrolling past long lists
- **Missing CRUD operations** — If users can create something, they usually expect to be able to delete it too
