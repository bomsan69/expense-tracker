# Open Decisions and Design Assumptions

The source slide deck explicitly calls the following **CONFIRM REQUIRED** or **PROPOSED**. These are not approved functional specifications.

1. Authentication: username vs email, registration/recovery, session expiration, method of protected route auth.
2. Expense model: currency USD proposal, timezone/device-local proposal, merchant and category required proposal, note and receipt storage.
3. Default date range: today minus 7 calendar days through today inclusive is eight displayed dates; clarify vs last seven dates.
4. Receipt OCR/AI: one expense per receipt vs each line item, tax/tip allocation and duplicate handling; provider/model not defined.
5. AI configuration: server-owned or bring-your-own key, allowed providers/models, encryption and user-level policy.
6. Batch save: atomic vs partial success; receipt images retention, consent and deletion policy.
7. Analytics: current month plus five prior months vs six *completed* months, chart library, reliable timezones.
8. Categories: whether delete/merge is supported, order, historical category rename behavior.
9. Password strength and post-change session invalidation; a11y error copy and future localization.

**Additional visual assumptions only:** Inter font, color set, 14px cards/10px controls, recommended Lucide icon names, conceptual example merchants and numbers, specific layout of charts, route example names. These should be reviewed with stakeholders. The static preview uses compact visual type for illustrative density; production typography should follow `design-system.md`.
