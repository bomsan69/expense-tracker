// The sessionStorage contract between the picker (writer) and SUP-01 review
// (reader) — client-side only, per D10. Never touches the server.
export const RECEIPT_DRAFT_KEY = "receipt_draft";

export interface ReceiptDraftItem {
  spentOn: string;
  categoryId: number | null;
  merchant: string;
  amountMinor: number;
  isDuplicate: boolean;
}

export interface ReceiptDraft {
  filename: string;
  items: ReceiptDraftItem[];
}
