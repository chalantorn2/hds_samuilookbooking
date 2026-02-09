// src/components/documents/generators/MultiPOReceiptPDFGenerator.js
// PDF Generator สำหรับ Multi PO Receipt
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { numberToEnglishText } from "../services/documentDataMapper";
import {
  getDisplayCustomerName,
  getDisplayCustomerAddress,
  getDisplayCustomerPhone,
  getDisplayCustomerIdNumber,
  getDisplayCustomerBranchType,
  getDisplayCustomerBranchNumber,
} from "../../../utils/customerOverrideHelpers";

// ✅ Import ส่วนกลางจาก InvoicePDFGenerator
import {
  waitForFonts,
  waitForImages,
  formatCurrencyWithDecimal,
  formatCurrency,
} from "./InvoicePDFGenerator";

/**
 * สร้าง Multi PO Receipt PDF
 * แตกต่างจาก Receipt ธรรมดาตรงที่แสดงรายการ PO แทนที่จะเป็น Passengers
 */
export const generateMultiPOReceiptPDF = async (receiptData, ticketId) => {
  try {
    console.log(
      "Starting Multi PO Receipt PDF generation for ticket:",
      ticketId
    );

    // สร้าง container
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.top = "-9999px";
    container.style.left = "-9999px";
    container.style.width = "210mm";
    container.style.height = "auto";
    container.style.background = "white";
    container.style.fontFamily = "Prompt, sans-serif";

    document.body.appendChild(container);

    const printWrapper = document.createElement("div");
    printWrapper.style.width = "100%";
    printWrapper.style.background = "white";
    printWrapper.style.padding = "0";
    printWrapper.style.boxSizing = "border-box";

    container.appendChild(printWrapper);

    // สร้างเนื้อหา Multi PO Receipt (ใช้หน้าเดียว)
    const printContent = createMultiPOReceiptHTML(receiptData);
    printWrapper.innerHTML = printContent;

    // รอ fonts และ images
    await waitForFonts();
    await waitForImages(printWrapper);

    console.log("Content rendered, capturing canvas...");

    // สร้าง PDF
    const canvas = await html2canvas(printWrapper, {
      scale: 3.0,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: 794,
      height: printWrapper.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      logging: false,
      quality: 0.95,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: false,
    });

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // เพิ่มหน้าถัดไปถ้าจำเป็น
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // ทำความสะอาด
    document.body.removeChild(container);

    const pdfBase64 = pdf.output("datauristring").split(",")[1];
    const fileSizeInMB = (pdfBase64.length * 0.75) / 1024 / 1024;

    if (fileSizeInMB > 10) {
      throw new Error(
        `ไฟล์ Multi PO Receipt PDF ใหญ่เกิน 10MB (${fileSizeInMB.toFixed(2)} MB)`
      );
    }

    console.log("Multi PO Receipt PDF generated successfully");
    return pdfBase64;
  } catch (error) {
    console.error("Error generating Multi PO Receipt PDF:", error);
    throw new Error(
      `ไม่สามารถสร้าง Multi PO Receipt PDF ได้: ${error.message}`
    );
  }
};

/**
 * สร้าง HTML สำหรับ Multi PO Receipt (หน้าเดียว)
 */
const createMultiPOReceiptHTML = (receiptData) => {
  return `
    <div class="print-document">
      <style>${getMultiPOReceiptStyles()}</style>
      <div class="print-page">
        ${renderMultiPOReceiptHeader(receiptData)}
        ${renderMultiPOReceiptTable(receiptData)}
        ${renderMultiPOReceiptFooter(receiptData)}
      </div>
    </div>
  `;
};

/**
 * สร้าง Header สำหรับ Multi PO Receipt
 */
const renderMultiPOReceiptHeader = (receiptData) => {
  const customerName = getDisplayCustomerName(receiptData);
  const customerAddress = getDisplayCustomerAddress(receiptData);
  const customerPhone = getDisplayCustomerPhone(receiptData);
  const customerIdNumber = getDisplayCustomerIdNumber(receiptData);
  const customerBranchType = getDisplayCustomerBranchType(receiptData);
  const customerBranchNumber = getDisplayCustomerBranchNumber(receiptData);

  const addressLines = customerAddress ? customerAddress.split("\n") : [];

  return `
    <div class="print-header">
      <div class="print-company-info">
        <img src="/assets/logo-print.png" alt="Company Logo" class="print-company-logo" crossorigin="anonymous" />
        <div class="print-company-details">
          <div class="print-company-title">บริษัท สมุย ลุค จำกัด</div>
          <div class="print-company-text">63/27 ม.3 ต.บ่อผุด อ.เกาะสมุย จ.สุราษฎร์ธานี 84320</div>
          <div class="print-company-text">โทร 077-950550 Email: samuilook@yahoo.com</div>
          <div class="print-company-text">เลขประจำตัวผู้เสียภาษี 0845545002700</div>
        </div>
      </div>
      <div class="print-document-title">
        <div class="print-document-title-text">ใบเสร็จรับเงิน</div>
        <div class="print-document-title-text">Receipt</div>
      </div>
    </div>

    <div class="print-info-section">
      <div class="print-info-customer">
        <div class="print-info-row">
          <span class="print-info-label">ลูกค้า:</span>
          <span class="print-info-value">${customerName}</span>
        </div>
        <div class="print-info-row">
          <span class="print-info-label">ที่อยู่:</span>
          <div class="print-info-value print-address">
            ${addressLines
              .map((line) => (line.trim() ? `<div>${line.trim()}</div>` : ""))
              .join("")}
          </div>
        </div>
        <div class="print-info-row">
          <span class="print-info-label">เบอร์โทร:</span>
          <span class="print-info-value">${customerPhone}</span>
        </div>
        <div class="print-info-row">
          <span class="print-info-label">เลขประจำตัวผู้เสียภาษี:</span>
          <span class="print-info-value">${customerIdNumber} <strong>สาขา:</strong> ${
    customerBranchType === "Branch" && customerBranchNumber
      ? `${customerBranchType} ${customerBranchNumber}`
      : customerBranchType || "Head Office"
  }</span>
        </div>
      </div>
      <div class="print-info-invoice">
        <div class="print-info-row">
          <span class="print-info-label">เลขที่:</span>
          <span class="print-info-value">${
            receiptData.invoice?.rcNumber || ""
          }</span>
        </div>
        <div class="print-info-row">
          <span class="print-info-label">วันที่:</span>
          <span class="print-info-value">${
            receiptData.invoice?.date || ""
          }</span>
        </div>
        <div class="print-info-row">
          <span class="print-info-label">Sale /Staff:</span>
          <span class="print-info-value">${
            receiptData.invoice?.salesPerson || ""
          }</span>
        </div>
      </div>
    </div>
  `;
};

/**
 * Format วันที่แบบ DD/MM/YYYY
 */
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * สร้างตารางสำหรับ Multi PO Receipt - แสดงรายการ PO
 */
const renderMultiPOReceiptTable = (receiptData) => {
  const MIN_ROWS = 15;
  const selectedPOs = receiptData.selectedPOs || [];

  // เรียงลำดับ PO ตามเลขที่
  const sortedPOs = selectedPOs.slice().sort((a, b) => {
    const poA = a.po_number || "";
    const poB = b.po_number || "";
    return poA.localeCompare(poB, "th", { numeric: true });
  });

  // สร้างแถวข้อมูล
  const dataRows = sortedPOs
    .map(
      (po, index) => `
    <tr>
      <td class="print-td-center">${index + 1}</td>
      <td class="print-td-left">${po.po_number || "-"}</td>
      <td class="print-td-left">${formatDate(po.po_date)}</td>
      <td class="print-td-center">${
        po.supplier?.code ||
        po.supplier?.supplier_code ||
        po.supplierCode ||
        "-"
      }</td>
      <td class="print-td-left">${po.routingDisplay || "-"}</td>
      <td class="print-td-amount">
        ${
          po.selectedAmount
            ? formatCurrencyWithDecimal(po.selectedAmount)
            : formatCurrencyWithDecimal(po.total_amount || 0)
        }
      </td>
    </tr>
  `
    )
    .join("");

  // เพิ่มบรรทัดว่าง 1 บรรทัดก่อนรายการที่ 1
  const emptyFirstRow = `
    <tr>
      <td class="print-td-center">&nbsp;</td>
      <td class="print-td-left">&nbsp;</td>
      <td class="print-td-left">&nbsp;</td>
      <td class="print-td-center">&nbsp;</td>
      <td class="print-td-left">&nbsp;</td>
      <td class="print-td-amount">&nbsp;</td>
    </tr>
  `;

  // เพิ่มบรรทัดว่าง 1 บรรทัดหลังรายการสุดท้าย
  const emptyLastRow = `
    <tr>
      <td class="print-td-center">&nbsp;</td>
      <td class="print-td-left">&nbsp;</td>
      <td class="print-td-left">&nbsp;</td>
      <td class="print-td-center">&nbsp;</td>
      <td class="print-td-left">&nbsp;</td>
      <td class="print-td-amount">&nbsp;</td>
    </tr>
  `;

  // สร้างแถวว่างเพื่อให้ครบ 15 แถว (รวมบรรทัดว่างบน 1 + ล่าง 1)
  const emptyRowsCount = Math.max(0, MIN_ROWS - sortedPOs.length - 2);
  const emptyRows = Array.from(
    { length: emptyRowsCount },
    () => `
    <tr>
      <td class="print-td-center">&nbsp;</td>
      <td class="print-td-left">&nbsp;</td>
      <td class="print-td-left">&nbsp;</td>
      <td class="print-td-center">&nbsp;</td>
      <td class="print-td-left">&nbsp;</td>
      <td class="print-td-amount">&nbsp;</td>
    </tr>
  `
  ).join("");

  return `
    <div class="print-items-table">
      <table class="print-table multi-po-receipt-table">
        <thead>
          <tr>
            <th class="print-th-no">ลำดับ</th>
            <th class="print-th-doc-no">เลขที่เอกสาร</th>
            <th class="print-th-doc-date">เอกสารวันที่</th>
            <th class="print-th-airline">สายการบิน</th>
            <th class="print-th-routing">เส้นทาง</th>
            <th class="print-th-payment">ยอดชำระ</th>
          </tr>
        </thead>
        <tbody>
          ${emptyFirstRow}
          ${dataRows}
          ${emptyRows}
          ${emptyLastRow}

          <!-- Summary Rows -->
          <tr class="print-total-row">
            <td colspan="5" class="print-total-label-cell">
              <span class="print-total-english-text">
                (${numberToEnglishText(receiptData.summary?.total || 0)} Baht)
              </span>
              <span class="print-summary-label">Total</span>
            </td>
            <td class="print-td-amount print-summary-value">
              ${formatCurrencyWithDecimal(receiptData.summary?.total || 0)} Baht
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
};

/**
 * สร้าง Footer สำหรับ Multi PO Receipt
 */
const renderMultiPOReceiptFooter = (receiptData) => {
  // Format วันที่แบบ DD/MM/YY
  const getFormattedIssueDate = () => {
    const issueDate = receiptData?.invoice?.date;
    if (!issueDate) return "";
    try {
      const date = new Date(issueDate);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear().toString().slice(-2);
      return `${day}/${month}/${year}`;
    } catch (e) {
      return "";
    }
  };

  const updatedByName = receiptData?.updatedByName || null;
  const formattedDate = getFormattedIssueDate();

  return `
    <div class="print-bottom-section">
      <div class="print-spacer"></div>

      <div class="print-signatures">
        <div class="print-signature">
          <div class="print-signature-title">Issued by</div>
          <div class="print-signature-area">
          ${
            updatedByName
              ? `<div style="font-weight: 500; font-size: 14px;">${updatedByName}</div>`
              : '<img src="/assets/logo-print.png" alt="Approved Signature" class="print-signature-logo" crossorigin="anonymous" />'
          }
          </div>
          <div class="print-signature-date">Date: ${formattedDate}</div>
        </div>
        <div class="print-signature">
          <div class="print-signature-title">ผู้รับชำระเงิน</div>
          <div class="print-signature-area"></div>
          <div class="print-signature-date">Date: ...............................</div>
        </div>
      </div>
    </div>

    <div class="print-footer">หน้า 1/1</div>
  `;
};

/**
 * CSS Styles สำหรับ Multi PO Receipt
 */
const getMultiPOReceiptStyles = () => {
  return `
    * {
      font-family: 'Prompt', sans-serif !important;
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      color: #333;
      line-height: 1.3;
      font-size: 12px;
    }

    .print-document {
      font-family: "Prompt", sans-serif;
      color: #333;
      line-height: 1.3;
      padding: 0;
      box-sizing: border-box;
      width: auto;
      background: transparent;
    }

    .print-page {
      width: 210mm;
      height: auto;
      min-height: 297mm;
      position: relative;
      background: white;
      margin: 0;
      padding: 10mm 15mm;
      box-sizing: border-box;
      overflow: hidden;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .print-header {
      display: flex;
      justify-content: space-between;
      align-items: stretch;
      margin-bottom: 24px;
      min-height: 100px;
    }

    .print-company-info {
      display: flex;
      align-items: flex-start;
      border-bottom: 4px solid #881f7e;
      padding-bottom: 8px;
      flex: 1;
      box-sizing: border-box;
    }

    .print-company-logo {
      width: 110px;
      height: auto;
      margin-right: 16px;
    }

    .print-company-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .print-company-text {
      font-size: 12px;
      margin: 2px 0;
    }

    .print-document-title {
      width: 256px;
      background-color: #f4bb19 !important;
      padding: 10px;
      text-align: center;
      border-bottom: 4px solid #fbe73a !important;
      display: flex;
      flex-direction: column;
      justify-content: center;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-document-title-text {
      font-size: 20px;
      font-weight: bold;
      color: white !important;
      margin: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-info-section {
      margin: 20px 0;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 12px;
      display: grid;
      grid-template-columns: 5fr 2fr;
      gap: 16px;
    }

    .print-info-row {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 6px;
      margin-bottom: 6px;
      font-size: 12px;
      align-items: start;
    }

    .print-info-invoice .print-info-row {
      grid-template-columns: 90px 1fr;
    }

    .print-info-label {
      font-weight: bold;
    }

    .print-info-value {
      word-break: normal;
      white-space: normal;
      overflow-wrap: break-word;
    }

    .print-address div {
      margin: 1px 0;
    }

    .print-items-table {
      margin: 18px 0;
    }

    .print-table {
      width: 100%;
      border-collapse: collapse;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
    }

    .print-table th {
      background-color: #e5e7eb !important;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      font-weight: bold;
      text-align: center;
      padding: 6px 4px;
      font-size: 12px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-table td {
      padding: 4px;
      font-size: 12px;
      vertical-align: middle;
    }

    /* Multi PO Receipt Table Specific Styles */
    .multi-po-receipt-table .print-th-no {
      width: 4%;
      text-align: center;
    }

    .multi-po-receipt-table .print-th-doc-no {
      width: 15%;
      text-align: center;
    }

    .multi-po-receipt-table .print-th-doc-date {
      width: 14%;
      text-align: center;
    }

    .multi-po-receipt-table .print-th-airline {
      width: 10%;
      text-align: center;
    }

    .multi-po-receipt-table .print-th-routing {
      width: 25%;
      text-align: left;
      padding-left: 8px;
    }

    .multi-po-receipt-table .print-th-payment {
      width: 15%;
      text-align: center;
      border-left: 1px solid #000;
    }

    .multi-po-receipt-table .print-td-center {
      text-align: center;
    }

    .multi-po-receipt-table .print-td-left {
      text-align: left;
      padding-left: 8px;
    }

    .multi-po-receipt-table .print-td-amount {
      text-align: right;
      padding-right: 8px;
      padding-left: 8px;
    }

    /* Override default border for multi-po table */
    .multi-po-receipt-table td:nth-child(2) {
      border-left: none;
    }

    .multi-po-receipt-table td:last-child {
      border-left: 1px solid #000;
    }

    .print-summary-row {
      border-top: 1px solid #000;
    }

    .print-summary-row td {
      padding: 7px 4px;
    }

    .print-summary-label {
      font-weight: bold;
      text-align: right;
      padding-right: 8px;
    }

    .print-summary-value {
      font-weight: bold;
      text-align: right;
      padding-right: 8px;
    }

    .print-total-row {
      background-color: #e5e7eb !important;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-total-row td {
      padding: 7px 4px;
    }

    /* Summary rows alignment for multi-po table */
    .multi-po-receipt-table .print-total-row .print-total-label-cell {
      display: table-cell !important;
      padding: 6px 4px;
    }

    .multi-po-receipt-table .print-total-row .print-total-label-cell::after {
      content: "";
      display: table;
      clear: both;
    }

    .multi-po-receipt-table .print-total-english-text {
      float: left;
      text-align: left;
      font-weight: bold;
      margin-left: 4px;
    }

    .multi-po-receipt-table .print-total-row .print-summary-label {
      float: right;
      text-align: right;
      font-weight: bold;
    }

    .print-bottom-section {
      display: flex;
      justify-content: space-between;
      margin-top: 15px;
      gap: 24px;
    }

    .print-signatures {
      display: flex;
      gap: 32px;
    }

    .print-signature {
      text-align: center;
      font-size: 12px;
      min-width: 120px;
    }

    .print-signature-title {
      font-weight: bold;
      margin-bottom: 20px;
    }

    .print-signature-area {
      border-bottom: 1px solid #6b7280;
      height: 50px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .print-signature-logo {
      width: 40px;
      height: auto;
      opacity: 0.7;
    }

    .print-footer {
      text-align: right;
      font-size: 12px;
      color: #6b7280;
      padding-top: 30px;
    }

    .print-spacer {
      flex: 1;
    }
  `;
};

/**
 * สร้าง Multi PO Receipt PDF พร้อมจัดการ error
 */
export async function generateMultiPOReceiptPDFSafely(receiptData, ticketId) {
  try {
    const pdfBase64 = await generateMultiPOReceiptPDF(receiptData, ticketId);

    return {
      success: true,
      pdfBase64: pdfBase64,
      message: "สร้าง Multi PO Receipt PDF สำเร็จ",
    };
  } catch (error) {
    console.error("Multi PO Receipt PDF generation failed:", error);

    return {
      success: false,
      error: error.message,
      message: "ไม่สามารถสร้าง Multi PO Receipt PDF ได้",
    };
  }
}
