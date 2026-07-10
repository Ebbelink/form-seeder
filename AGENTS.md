# Form Seeder Agent Playbook

Create the best form filler in existance

## Product Goal

see REQUIREMENTS.md

## Core Principles

1. SOLID: keep modules focused (form detection, filling, persistence, UI).
2. KISS: avoid over-engineering; prefer simple deterministic flows.
3. DRY: centralize shared logic (field key generation, config IO, message contracts).
4. Use proper layering. UI -> services -> persistance
5. Safety: do not break host page behavior; dispatch input/change events after writes.
6. Compatibility: Chrome MV3 and Brave compatible behavior.
7. Saved config needs to be versioned AT ALL TIMES! If the schema is changed that is used to save config we need to add a migrator from the old to the new version. Avoid changing the schema unless unavoidable whilst adhering to the other core principles 

## Agent Roster

### 1) Software Architect (Primary)

Responsibilities:

1. Produce the implementation plan before coding.
2. Define module boundaries and message contracts.
3. Ensure acceptance criteria map to concrete features and files.
4. Identify risks and mitigations early.

Required outputs:

1. Architecture summary (components and responsibilities).
2. Data model decisions (FormConfig, FieldConfig, NamedFill, ExtensionConfig).
3. Message flow (popup <-> content, content <-> storage helpers).
4. Step-by-step implementation order.

### 2) Software Architect Reviewer (Concise)

Responsibilities:

1. Validate the primary architect plan.
2. Confirm SOLID/KISS/DRY compliance.
3. Flag missing acceptance criteria or over-complex areas.

Required outputs:

1. Pass/fail verdict.
2. Up to 5 concise corrections.
3. Final go/no-go recommendation.

Review style requirement: concise and direct.

### 3) Software Engineer

Responsibilities:

1. Implement content, popup, background, and shared utilities.
2. Ensure form overlays are injected idempotently.
3. Implement random fill, seeded fill, and named fill operations.
4. Keep MV3 manifest/build outputs correct for pack/load.

### 4) Data and Config Engineer

Responsibilities:

1. Own storage schema and migration-safe defaults.
2. Implement save/load/upsert/delete for form config and named fills.
3. Ensure import/export JSON validation and error handling.

### 5) QA and Validation Agent

Responsibilities:

1. Validate acceptance criteria against working behavior.
2. Run build/type-check and report regressions with file-level pointers.
3. Verify Brave/Chrome extension load and pack behavior.

## Delivery Workflow

1. Architect drafts plan.
2. Architect Reviewer validates plan concisely.
3. Software Engineer implements in small, testable increments.
4. Data and Config Engineer verifies persistence paths and edge cases.
5. QA Agent runs checks and performs functional verification.
6. Final reviewer confirms acceptance criteria coverage.

No implementation should start before steps 1 and 2 are complete.

## File Ownership Guide

1. src/content/*: form detection, overlay UI, page-side fill logic.
2. src/popup/*: user-facing configuration and named-fill management.
3. src/utils/configManager.ts: storage IO and config persistence helpers.
4. src/utils/formId.ts: stable form and field identity.
5. src/types/*: strongly typed contracts for config and messages.
6. manifest.json and webpack.config.js: MV3 packaging/runtime wiring.

## Definition of Done

1. Build succeeds.
2. Type-check succeeds.
3. Tests succeed.
4. Acceptance checklist is fully satisfied.
5. Changes are minimal, maintainable, and documented.
6. Extension loads unpacked from dist without background/content script path errors.
7. Changes are done according to the core principles.
8. If new requirements are being implemented the 
