# Expense Tracker — UI Design System v1.0

## Purpose and status
Source: `expense_tracker_uiux_spec_v1(1).pptx`, dated 2026-11-01. This is a **visual design proposal**, not an approved change to product requirements. Nine source screens are retained. Examples are fictional and all in-app text is English. See `open-decisions.md` for matters requiring confirmation.

## Direction
Modern Minimal: simple, professional, legible, mostly white surfaces, minimal shadows, restrained use of blue for actionable controls and selected states. Do not add unrelated visual features.

## Color roles
| Role | Hex | Use |
|---|---|---|
| Primary | `#1F2937` | brand structure, dark summary card and prominent headings |
| Secondary | `#F3F4F6` | subtle secondary fill and muted backgrounds |
| Accent | `#2563EB` | primary CTA, navigation selected state, links, focus |
| Background / Surface | `#FFFFFF` | app background and cards |
| Foreground | `#111827` | normal text |
| Muted text | `#6B7280` | helper text |
| Border | `#E5E7EB` | dividers and quiet boundaries |
| Destructive | `#B91C1C` | deletion/errors only |
| Danger background | `#FEF2F2` | destructive surface |

Three *brand roles* are used; neutrals and semantic danger colors are not extra brand colors. Colored state must also have text or an icon. Preserve WCAG 2.2 AA contrast and accessible status feedback.

## Type
Google Fonts: **Inter**, loaded through `next/font/google` with variable `--font-inter`, `subsets: ['latin']`, `display: 'swap'`. Only one typeface throughout. Typography tokens:

| Usage | Size/line-height | Weight |
|---|---|---|
| Page title | 24/32 px | 700 |
| Section heading | 20/28 px | 600 |
| Card title | 18/26 px | 600 |
| Body | 16/24 px | 400 |
| Secondary | 14/20 px | 400 |
| Caption | 12/16 px | 400 |
| Buttons | 16/24 px | 600 |

Mockup renders are intentionally dense in a constrained viewport; the production app must follow these type tokens and allow text zoom without clipping. Body text should be 16px in actual implementation; do not copy visual preview's smaller supporting text without reviewing accessibility.

## Geometry
Design viewport 390×844; minimum width 320; fluid layout thereafter. Horizontal padding 16px. Spacing steps 4, 8, 12, 16, 24, 32px. Component heights 48–50px (target ≥44×44 CSS px). Radii 6px small, 10px control, 14px card, full pill as needed. Borders 1px neutral. Subtle shadow allowed for cards, not required. Respect `env(safe-area-inset-bottom)` and viewport keyboard; preserve vertical scroll and fixed footer behavior on authenticated views.

## Navigation
Login has no authenticated footer. All other screens share four bottom tabs: Home, Add, Stats, Settings. Header has a back affordance on secondary pages, history-first with Home fallback. Protected destinations redirect unauthenticated visitors to Login. Keep the current tab highlighted with accent and associated text.

## Icons
Use `lucide-react` outline icons, one library only. Default size 20px, compact 16px, prominent 24px, stroke width 2. Recommended names: `House`, `CirclePlus`, `ChartNoAxesColumn`, `Settings`, `ChevronLeft`, `ChevronRight`, `CalendarDays`, `Camera`, `ImagePlus`, `Pencil`, `Trash2`, `ReceiptText`, `Wallet`, `SearchX`, `Check`, `LogOut`, `EyeOff`. Use accessible button names; decorative icons `aria-hidden=true`. The small pictograms in the PDF are *conceptual placeholders*, not an instruction to use emojis or bespoke UI icons.

## Common components
Button variants: accent primary, neutral secondary, outline, destructive. Input: label above, visible required indicator, distinct focus border and ring, error text below; monetary input `inputMode='decimal'`, validate positive integer minor units server-side. Form errors are shown inline and announced. Card surfaces use white, 14px radius, neutral line; summary card uses primary. ExpenseListItem has merchant, category/date and money. BottomNav uses 4 items. Chart components must include accessible table equivalent and real data.

## Required component states
Default, hover where applicable, focus-visible, active, selected, disabled, loading, empty, invalid/error and success. Disabled state must not be indicated with color alone. Async loading and action failures should preserve user-entered data; never imply a mutation succeeded before server success.

## Responsive and accessibility
Responsive designs at 320, 390, 430px and tablet. Use max-width container for larger screens; avoid inflated single-column card widths. Avoid horizontal overflow. All interactive items ≥44px target where practical; WCAG 2.2 AA focus, label, error, text contrast, zoom and keyboard checks. Test an onscreen keyboard with fixed bottom nav and form CTA.
