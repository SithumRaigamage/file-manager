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

Implementation (2026-09-29): `AppSettings.theme` = `light` | `dark` | `system` (default `system`), applied by `AppearanceProvider` as a `dark` class on `<html>`. `assets/theme-dark.css` is **generated** from Tailwind's `theme.css` by mirroring each palette scale (50↔950 … 400↔600), so existing utility classes flip without per-component `dark:` variants. Regenerate it after a Tailwind upgrade; don't hand-edit. Avoid raw hex colors in components — they bypass the theme.

## Motion

See USER-EXPERIENCE.md for interaction philosophy. Implementation constraint: all Framer Motion transitions must respect `prefers-reduced-motion` at the OS level and the in-app `reducedMotion` setting (see DATA-MODEL.md `AppSettings`).

Implementation (2026-09-29): `AppearanceProvider` wraps the app in `<MotionConfig reducedMotion>` (`always` when the in-app flag is on, otherwise `user`, which follows the OS), and CSS in `main.css` neutralises animations/transitions for both `prefers-reduced-motion` and the `reduce-motion` class.

## Feedback, Errors & Accessibility

- Notifications use `toast.success/error/info` (`store/useToastStore.ts`, rendered by `<Toaster />`) — never `alert()`. Errors are announced with `role="alert"`.
- Each page renders inside an `ErrorBoundary`, so a crash is contained to that page with a "Try again" action.
- Icon-only buttons must have an `aria-label`; `<Switch>` requires a `label` prop.
- Panels that float over other content (drawers, popovers, loading overlays) use ≥ 85% opaque backgrounds.

## Responsive Rules

Not a primary concern for MVP (fixed desktop window), but the layout should tolerate window resizing gracefully (collapsing the right contextual panel below a minimum width threshold rather than clipping content).
