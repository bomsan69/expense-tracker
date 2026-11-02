# Next.js / Tailwind Implementation Handoff

## Scope
This folder defines visual design only. Do **not** treat the mockups as executable application logic. Existing app/project dependency versions take precedence. Use Next.js App Router, TypeScript, Tailwind CSS and shadcn/ui, with `lucide-react` icons. All user-facing text is English.

## Font setup — `app/layout.tsx`
```tsx
import { Inter } from 'next/font/google';
import './globals.css';
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={inter.variable}>{children}</body></html>;
}
```

## CSS tokens
Copy `globals.css` into the project style system and reconcile it with existing shadcn/ui tokens. The proposed file targets Tailwind v4 `@theme inline`; if the existing application uses v3, map these semantic colors into `tailwind.config.ts` rather than copying v4 directives.

## Suggested file organization
```text
app/(auth)/login/page.tsx
app/(app)/layout.tsx
app/(app)/page.tsx
app/(app)/expenses/new/page.tsx
app/(app)/expenses/[id]/page.tsx
app/(app)/settings/page.tsx
app/(app)/stats/page.tsx
app/(app)/receipt/review/page.tsx
app/(app)/settings/categories/page.tsx
app/(app)/settings/password/page.tsx
components/app/bottom-nav.tsx
components/expenses/expense-form.tsx
components/expenses/expense-row.tsx
components/expenses/spending-summary.tsx
components/receipts/receipt-row.tsx
components/charts/monthly-spending.tsx
```
Routes are examples only; internal routes are **not** fixed in the input PPTX. Build a reusable authenticated shell rather than duplicate navigation in each page.

## Representative component classes
```tsx
<Button className="min-h-12 w-full rounded-[10px] bg-accent text-white">Save Expense</Button>
<Card className="rounded-[14px] border-border bg-surface p-4">...</Card>
<Input className="min-h-12 rounded-[10px] border-border focus-visible:ring-accent" />
```
Prefer semantic utility classes and shared component variants; avoid hardcoded colors in individual pages.

## Data and behavior boundaries
Use numeric money minor units internally if accepted; never perform expense arithmetic using floating point without controls. Verify server-side validation and credentials. All protected routes require an authenticated session. Expense edits preserve form state on failed requests. Filters refresh list AND total atomically from a common query condition. AI receipt import is a proposal for REVIEW, never auto-save. API keys may not be placed in frontend logs or returned unmasked; storage/provider/ownership require a security decision.

## Responsive / accessibility verification
Check 320px, 390px, 430px and wide screens. Bottom nav is accessible and should not block save when the mobile keyboard appears. Use labels, `aria-invalid`, `aria-describedby`, explicit focus visibility, accessible chart table alternative and buttons with >=44px targets. Run keyboard-only flows, screen-reader smoke test and visual comparison against `ui-mockups.pdf`.

## Validation checklist
- Every SCR and SUP screen present with same ID and core behavior.
- English UI labels and Inter font throughout.
- 3 brand roles + neutral and limited status palettes; same icons and buttons across pages.
- Primary CTA, error/empty/loading, confirmation, focus, accessible table alternative.
- No assumption from `open-decisions.md` silently treated as approved.
- Reconcile PDF mockup concept measurements with this token guide; production should use 16px body text.
