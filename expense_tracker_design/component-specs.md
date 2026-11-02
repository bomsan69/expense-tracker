# Component Specifications — Expense Tracker

The following implementation classes are **recommendations**, not verified requirements. Use installed `shadcn/ui` primitives and existing project theme tokens, adapting minor details as needed.

| Component / variant | Base | Size and layout | Token and example Tailwind | States | Used on |
|---|---|---|---|---|---|
| Button / primary | shadcn Button | min-h-12, px-4, full-width form actions | `bg-accent text-white rounded-[10px] font-semibold` | focus, disabled, loading | SCR-01/03/04/05, SUP-01/02/03 |
| Button / secondary | shadcn Button | min-h-12, px-4 | `bg-secondary text-foreground rounded-[10px]` | focus, disabled | SCR-04, SUP-01 |
| Button / destructive | shadcn Button | min-h-12 | `bg-red-50 text-destructive border border-red-200` | confirm, pending, error | SCR-03 |
| Input / standard | shadcn Input | 48px minimum height, px-3 | `border-input bg-background rounded-[10px] focus-visible:ring-accent` | default, focus, invalid, disabled | Login, Expense, Settings, Password |
| Select / category | shadcn Select | 48px minimum | `rounded-[10px] border-border` | open, selected, empty | SCR-02/03/04 |
| Card / standard | shadcn Card | p-4, radius 14px | `bg-surface border-border rounded-[14px]` | loading, empty | SCR-02/06, SUP-01 |
| Summary / total | Custom composition | p-4, fluid width | `bg-primary text-white rounded-[14px]` | loading, empty | SCR-02 |
| ExpenseListItem | Custom | min-h-16, flex, right aligned amount | `border-b border-border py-4` | active, keyboard focus | SCR-02 |
| BottomNavigation | Custom + Next Link | 4 equal columns, safe-area inset | `fixed bottom-0 inset-x-0 border-t bg-background` | active, focus | All except SCR-01 |
| Dialog / delete | shadcn AlertDialog | full accessible modal | `rounded-[14px]` | confirm, cancel, pending | SCR-03 |
| ReceiptRow | Custom | p-4, editable list | `border rounded-[14px]` | editing, error, remove | SUP-01 |
| CategoryRow | Custom | row edit action | `border-b py-4` | editing, validation | SUP-02 |
| Charts | Approved chart solution TBD | compact, responsive | neutral bars, accent highlight | loading, empty, tooltip | SCR-06 |

## Icon map
| Purpose | Lucide React icon | Size | Where |
|---|---|---|---|
| Home navigation | `House` | 20 | Footer |
| Add navigation | `CirclePlus` | 20 | Footer |
| Statistics navigation | `ChartNoAxesColumn` | 20 | Footer |
| Settings navigation | `Settings` | 20 | Footer |
| Back | `ChevronLeft` | 20 | Header |
| Camera action | `Camera` | 20 | SCR-04 |
| Album action | `ImagePlus` | 20 | SCR-04 |
| Edit | `Pencil` | 16 | SUP-01/02 |
| Delete | `Trash2` | 16 | SCR-03, SUP-01 |
| Receipt | `ReceiptText` | 20 | SUP-01 |

## Interaction rules
Use semantic buttons/links; keyboard `Enter` submits forms. Buttons are disabled *during* mutation but form data is preserved on failure. Error copy must be precise. `aria-invalid` and a linked error element accompany failed validation. AlertDialog announces its title and description. Avoid custom interaction shortcuts outside source requirements.
