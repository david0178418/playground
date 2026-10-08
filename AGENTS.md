# Playground Working Agreements

This repository is a testing ground for ideas and prototypes. Follow the global working agreements, with the following project-specific exception.

## Automatic PR Merging

- Agents may automatically merge PRs they create for authorized work in this repository even when the target branch has no branch protection or required CI checks.
- Complete review, cleanup, and appropriate local validation before merging. For code changes, run `bun test`, `bun run check:types`, and `bun run bundle`. For visible behavior, include preview or behavior-specific evidence and report any checks that could not be exercised.
- Any applicable branch protection, rulesets, required approvals, and CI checks must still be satisfied for the current PR head. Do not bypass enforcement or use administrative overrides.
- Honor explicit leave-open, preview-before-merge, and owner-acceptance instructions. Prototype status does not authorize unrelated work, releases, or deployment actions.
- Verify the actual merge and record the result in the PR description.
