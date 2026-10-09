# Playground Working Agreements

This repository is a testing ground for ideas and prototypes. Follow the global working agreements, with the following project-specific exception.

## Automatic PR Merging

- Agents may automatically merge PRs they create for authorized work in this repository even when the target branch has no branch protection or required CI checks.
- This is explicit repository-specific authorization to waive the general requirement for enforced CI coverage before automatic merging. Missing branch protection, required checks, or CI runs is not a reason to leave an otherwise validated PR open or ask for merge permission. Use the local validation and review requirements below; do not add CI or branch protection solely to qualify for merging.
- Complete review, cleanup, and appropriate local validation before merging. For code changes, run `bun test`, `bun run check:types`, and `bun run bundle`. For visible behavior, include preview or behavior-specific evidence and report any checks that could not be exercised.
- Any applicable branch protection, rulesets, required approvals, and CI checks must still be satisfied for the current PR head. Do not bypass enforcement or use administrative overrides.
- Honor explicit leave-open, preview-before-merge, and owner-acceptance instructions. Prototype status does not authorize unrelated work, releases, or deployment actions.
- Verify the actual merge and record the result in the PR description.
