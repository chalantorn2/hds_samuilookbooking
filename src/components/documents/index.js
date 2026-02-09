// src/components/documents/index.js
// Main entry point สำหรับ documents module

// Main DocumentViewer
export { DocumentViewer } from "./viewers";

// Shared components
export {
  DocumentHeader,
  DocumentFooter,
  DocumentToolbar,
  PageContainer,
} from "./viewers";

// Table components
export { InvoiceTable, VoucherTable, ReceiptTable } from "./viewers";

// Data services
export {
  // Invoice & Receipt
  getInvoiceData,
  getReceiptData,
  getReceiptDataForPrint,
  processReceiptSelection,
  createDefaultReceiptSelection,
  calculateReceiptTotals,
  canGenerateReceipt,

  // Voucher
  getVoucherData,
  canPrintVoucher,
  prepareVoucherForPrint,

  // Utilities
  formatCurrencyNoDecimal,
  formatCurrencyWithDecimal,
  numberToEnglishText,
} from "./viewers";

// PDF Generator (if needed)
export { generateInvoicePDF } from "./generators/PDFGenerator";

// Default export
export { DocumentViewer as default } from "./viewers";
