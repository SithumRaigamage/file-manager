# USER-EXPERIENCE.md

## Design Inspiration (without copying)

- **Linear/Raycast**: keyboard-first navigation, command palette (Cmd/Ctrl+K) for jumping between Organize/Rename/Convert and recent folders.
- **Stripe/Vercel**: calm, high-contrast dashboards for showing batch operation status (queues, progress, success/error states).
- **Notion**: inline, non-modal editing of rules — avoid deep modal nesting for rule configuration.
- **Arc Browser**: playful but purposeful micro-interactions (e.g., a satisfying "swoosh" when a batch completes) — used sparingly, never on destructive actions.

## Primary User Journeys

1. **First-run**: User opens FileFlow → chooses a folder → sees Quick Rules for Organizer with zero config required → previews → applies. Time-to-value target: under 2 minutes (see PROJECT-VISION success metrics).
2. **Power workflow**: User selects a batch of files already organized → opens Renamer → builds a pattern with live preview → commits → optionally routes the same batch straight into Converter (V2 pipeline; MVP allows manual hand-off between tools within the same app, not a saved pipeline).
3. **Recovery**: User realizes a rename or organize action was wrong → opens undo history → reverts specific batch operation.

## Information Architecture

- Left rail: 3 primary modes (Organize / Rename / Convert) + Recent Folders + Undo History.
- Main pane: file list with live preview column (before → after), always visible during any batch operation.
- Right panel (contextual): rule/pattern/preset builder for the active mode.

## Empty, Loading, and Error States

- **Empty**: no folder selected → friendly illustration + "Choose a folder" CTA; never a blank white pane.
- **Loading**: batch operations show per-file progress + aggregate progress bar; never a spinner with no context for operations over ~2 seconds.
- **Error**: per-file errors surface inline next to the affected row (e.g., corrupt file during conversion) without halting the rest of the batch — errors are recoverable, not modal-blocking.

## Micro-interactions & Motion (Framer Motion)

- Row-level transitions when a file's status changes (queued → processing → done) — subtle, under 200ms, never blocking.
- Motion is used to _reinforce state changes_, never as decoration on destructive actions (delete/overwrite confirmations stay static and explicit).

## Accessibility

- Full keyboard operability for all three tools (select files, build rules/patterns, commit, undo) — required given the power-user, high-repetition nature of this tool (see PROJECT-VISION target users).
- Color is never the only signal for success/error/conflict states (icon + text + color).
- Respect OS-level reduced-motion settings; disable non-essential Framer Motion animations when set.

## State & Routing Note

Per DESIGN-SYSTEM.md, shareable/resumable state (e.g., "which folder + which mode was active") should live in a lightweight persisted app state (Zustand + local persistence), not deep-linked URL params, since this is a desktop app without a browser address bar — this is a deliberate adaptation of the Universal Blueprint's "URL search params" guidance to a non-browser context.
