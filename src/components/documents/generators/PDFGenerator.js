// src/components/documents/generators/PDFGenerator.js
// Main PDF Generator - Index file

// Import all PDF generators
export {
  generateInvoicePDF,
  generatePDFSafely,
  waitForFonts,
  waitForImages,
  formatCurrencyWithDecimal,
  formatCurrency,
} from "./InvoicePDFGenerator";

export {
  generateReceiptPDF,
  generateReceiptPDFSafely,
} from "./ReceiptPDFGenerator";

export {
  generateMultiPOReceiptPDF,
  generateMultiPOReceiptPDFSafely,
} from "./MultiPOReceiptPDFGenerator";

export {
  generateVoucherPDF,
  generateVoucherPDFSafely,
} from "./VoucherPDFGenerator";

// Default exports
export { generateInvoicePDF as default } from "./InvoicePDFGenerator";
