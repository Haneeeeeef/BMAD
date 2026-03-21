# UI Style Guide — Mission Control

> Source of truth for all visual decisions. Based on what is implemented.

---

## Brand Colors

```css
--brand:         #00719c   /* primary actions, links */
--brand-hover:   #005f83   /* hover state */
--brand-light:   #009bd6   /* lighter variant */
--brand-lighter: #00b8ff   /* lightest variant */
--brand-dark:    #00415a   /* dark variant */
--brand-darker:  #001f2b   /* darkest variant */
```

Usage: `bg-[var(--brand)]`, `text-[var(--brand)]`, `border-[var(--brand)]`

---

## Semantic Colors

```css
--confirm:          #00719c   /* approve / positive action */
--confirm-hover:    #005f83
--confirm-foreground: #ffffff

--danger:           #dc2626   /* destructive actions */
--danger-hover:     #b91c1c
--danger-foreground: #ffffff
```

---

## shadcn Semantic Tokens (light mode)

| Token | Value | Use |
|-------|-------|-----|
| `--background` | white | page background |
| `--foreground` | near-black | body text |
| `--muted` | light gray | subtle backgrounds |
| `--muted-foreground` | mid gray | secondary text |
| `--border` | light gray | dividers, input borders |
| `--primary` | near-black | primary button bg |
| `--destructive` | red | error states |
| `--card` | white | card backgrounds |

Dark mode is supported — tokens swap automatically via `.dark` class.

---

## Typography

**Font:** System font stack — no custom font loaded.
```css
font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
font-family (mono): ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace;
```

**Rules:**
- Minimum body text: `text-sm` (14px)
- Table content: `text-xs` (12px)
- Chat input: `text-base` (16px) — prevents iOS zoom
- Use `text-muted-foreground` for secondary/helper text
- Never pure black text — use `text-foreground` (near-black token)

---

## Spacing & Radius

**Border radius base:** `0.625rem` (10px)

| Token | Value |
|-------|-------|
| `rounded-sm` | 6px |
| `rounded-md` | 8px |
| `rounded-lg` | 10px (base) |
| `rounded-xl` | 14px |

**Padding rhythm:** `p-4` for cards, `p-6` for page sections, `px-3 py-2` for compact items.

---

## Shadows

- Cards: `shadow-sm` only
- Modals / elevated: `shadow-md`
- Never `shadow-lg` or `shadow-xl`

---

## Layout

```
Icon rail (48px) | Sidebar (260px) | Chat (flex-1) | Right panel (300px)
```

- Slide-in overlay panels: 520px wide
- Sidebar collapses via `Cmd+B`
- Responsive modal: Dialog on desktop, Drawer on mobile

---

## Status Colors

| State | Color |
|-------|-------|
| pending | `muted` |
| running / active | `--brand` |
| completed | `emerald-500` / `oklch(0.6 0.118 184.704)` |
| error | `destructive` |
| waiting / warning | `amber-500` |

Context indicator thresholds: `<50%` emerald → `50-80%` yellow → `>80%` red

---

## Scrollbars

Slim auto-hiding (6px, appears on hover). Already applied globally in `globals.css`. Don't override.

---

## Animations

- Use `tw-animate-css` utilities only
- Respect `prefers-reduced-motion` — already handled globally
- Typing indicator: `.typing-dot` class (defined in globals)
- No custom keyframes unless absolutely necessary

---

## Rules

- **90% shadcn, 10% custom** — reach for shadcn first
- No glassmorphism, no heavy gradients, no decorative elements
- No `shadow-lg` or `shadow-xl`
- No custom icons — use Lucide (comes with shadcn)
- No animation libraries (no Framer Motion)
- `border-0` filter dropdowns: `bg-muted/50 hover:bg-muted`
- Focus rings: `focus:ring-1` — avoid double rings
- Row actions: `opacity-0 group-hover:opacity-100` on parent with `group`
- Dialog width override: use `!max-w-3xl` (important prefix)
