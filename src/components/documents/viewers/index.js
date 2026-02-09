// src/components/documents/viewers/index.js
export { default as DocumentViewer } from "./DocumentViewer";

// Re-export data services สำหรับความสะดวก
export {
  getInvoiceData,
  getReceiptData,
  formatCurrencyNoDecimal,
  formatCurrencyWithDecimal,
  numberToEnglishText,
} from "../services/documentDataMapper";

export {
  getVoucherData,
  canPrintVoucher,
  prepareVoucherForPrint,
} from "../services/voucherDataService";

export {
  getReceiptDataForPrint,
  processReceiptSelection,
  createDefaultReceiptSelection,
  calculateReceiptTotals,
  canGenerateReceipt,
} from "../services/receiptDataService";

export { getOtherData } from "../services/otherDataService";

// Re-export shared components
export { default as DocumentHeader } from "../shared/DocumentHeader";
export { default as DocumentFooter } from "../shared/DocumentFooter";
export { default as DocumentToolbar } from "../shared/DocumentToolbar";
export { default as PageContainer } from "../shared/PageContainer";

// Re-export table components
export { default as InvoiceTable } from "../tables/InvoiceTable";
export { default as VoucherTable } from "../tables/VoucherTable";
export { default as ReceiptTable } from "../tables/ReceiptTable";
