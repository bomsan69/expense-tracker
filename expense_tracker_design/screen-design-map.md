# Screen-to-Component / Behavior Map

| ID | View | Reused components | Navigation / interactions | States and responsive |
|---|---|---|---|---|
| SCR-01 | Login | Input, Button | Sign In → SCR-02; Enter to submit | Invalid credentials, disabled/loading, no footer; vertical centering |
| SCR-02 | Home | Summary, DateInput, Select, ExpenseListItem, BottomNav, Pagination | Date/category filter refreshes sum and list; merchant → SCR-03; tabs → peers | Invalid date, empty, loading, pagination error; 10 per page (proposed); list stacks at 320 |
| SCR-03 | Expense Detail | FormField, Select, Buttons, AlertDialog | Save → SCR-02; Delete confirmation → SCR-02 | Not found, dirty, save failure, stale update; form scrolls |
| SCR-04 | Add | FormField, Buttons, ImagePicker | Save one → SCR-02; camera / album → parsing → SUP-01 | Invalid amount, permissions, upload/AI failure; keyboard-safe save |
| SCR-05 | Settings | SettingsRow, FormField, Buttons | Password → SUP-03; categories → SUP-02; Save; Logout → SCR-01 | Invalid config, API key masked; scrollable |
| SCR-06 | Statistics | BarChart, Donut/PieChart, Legend, data table | Tooltips and accessible data alternative | Empty, loading, error; chart fits mobile width |
| SUP-01 | Receipt Review | ReceiptRow, FormField, Buttons | Edit/remove; Confirm & Save All → SCR-02; Cancel → Add | Validation, batch error, never auto-save |
| SUP-02 | Categories | FormField, CategoryRow, Button | Create and edit; back → Settings | Duplicate/blank name, edit preserves category ID |
| SUP-03 | Change Password | PasswordInput, Button | Update credentials; return to Settings after confirmed success | Mismatch, weak new password, wrong old password, network error |

## Included visual state studies
- `STATE-01`: Login with invalid credentials.
- `STATE-02`: Home with empty filtered result and $0 total.
- `STATE-03`: Destructive delete confirmation.

## Important mapping notes
All nine screens preserve matching IDs from the source PPTX. Source proposes 10 rows/page, 6 months including current, and rolling date defaults; these are NOT approved product decisions. Receipt parsing may create multiple rows but line-item vs receipt granularity is unconfirmed. See `open-decisions.md`. Icons are detailed in `component-specs.md`.
