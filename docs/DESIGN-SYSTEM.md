# DESIGN-SYSTEM.md

## Core Constraints

- Every file-list view must gracefully handle: empty folder, permission-denied folder, and partially-loaded (streaming/paginated) large folder — never a blank pane with no explanation (see USER-EXPERIENCE.md Empty/Loading/Error states).
- Loading states for any operation over ~2 seconds must show determinate progress (per-file + aggregate), never an indefinite spinner, since batch size is often known up front.

## Component Architecture

- Base components wrap **shadcn/ui** primitives (Button, Dialog, Table, Command, Progress) rather than using them unstyled, to keep a consistent FileFlow visual identity distinct from generic shadcn defaults.
- Tailwind utility classes are standardized through a small set of composed patterns (e.g., `card`, `row-hover`, `status-badge`) rather than ad hoc utility strings repeated across components — reduces drift as the app grows past MVP.
- The **before/after preview row** (used identically across Organizer, Renamer, and Converter) is a single shared component, not three separate implementations — this is the concrete UI expression of the "unified preview" differentiation strategy from PRODUCT-STRATEGY.md.

## Theme

- **Palette**: neutral dark-first base (matching the "calm, high-contrast dashboard" inspiration from Stripe/Vercel in USER-EXPERIENCE.md), with a single accent color reserved for primary actions and active states; destructive actions use a distinct, consistent red across all three tools.
- **Typography**: one primary UI typeface for interface chrome, monospace for file names/paths/patterns (so users can visually parse renaming tokens and regex clearly).
- **CSS variables**: theme values (colors, spacing scale, radii) defined as CSS custom properties so dark/light mode is a variable swap, not a component-level conditional.

## State & Routing

- Since FileFlow is a desktop app without a browser address bar, "shareable state" (per the Universal Blueprint's URL-params guidance) is reinterpreted as **persisted app state**: last-active mode (Organize/Rename/Convert), last folder, and open rule/pattern builder state are persisted via Zustand + local storage so relaunching the app resumes where the user left off.
- Local component state is reserved for transient UI only (hover, focus, in-progress form input before commit) — anything the user would expect to survive a restart belongs in a persisted Zustand store.

## Dark Mode

Dark mode is the default given the target user (creative professionals, long editing sessions); light mode fully supported via the same CSS variable set, toggle available in Settings and respecting OS-level appearance settings by default.

## Motion

See USER-EXPERIENCE.md for interaction philosophy. Implementation constraint: all Framer Motion transitions must respect `prefers-reduced-motion` at the OS level and the in-app `reducedMotion` setting (see DATA-MODEL.md `AppSettings`).

## Responsive Rules

Not a primary concern for MVP (fixed desktop window), but the layout should tolerate window resizing gracefully (collapsing the right contextual panel below a minimum width threshold rather than clipping content).
