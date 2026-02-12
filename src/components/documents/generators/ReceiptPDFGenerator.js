// src/components/documents/generators/ReceiptPDFGenerator.js
// Refactored version - ใช้ส่วนกลางจาก InvoicePDFGenerator
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
 * สร้าง Receipt PDF โดยใช้ logic เดียวกับ Invoice
 * แค่เปลี่ยนชื่อเอกสารและ rcNumber
 */
export const generateReceiptPDF = async (receiptData, ticketId) => {
  try {
    console.log("Starting Receipt PDF generation for ticket:", ticketId);

    // สร้าง container เหมือน Invoice
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.top = "-9999px";
    container.style.left = "-9999px";
    container.style.width = "210mm";
    container.style.height = "auto";
    container.style.background = "white";
    container.style.fontFamily = "Prompt, sans-serif";

    document.body.appendChild(container);

    // คำนวณหน้า - ใช้ logic เดียวกับ Invoice
    const { totalPages, passengerPages } = calculateReceiptPages(receiptData);

    const printWrapper = document.createElement("div");
    printWrapper.style.width = "100%";
    printWrapper.style.background = "white";
    printWrapper.style.padding = "0";
    printWrapper.style.boxSizing = "border-box";

    container.appendChild(printWrapper);

    // สร้างเนื้อหา Receipt
    const printContent = createReceiptHTML(
      receiptData,
      passengerPages,
      totalPages
    );
    printWrapper.innerHTML = printContent;

    // รอ fonts และ images
    await waitForFonts();
    await waitForImages(printWrapper);

    console.log("Content rendered, capturing canvas...");

    // สร้าง PDF - logic เดียวกับ Invoice
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
    if (totalPages === 1) {
      console.log("Single page Receipt detected");
    } else {
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    }

    // ทำความสะอาด
    document.body.removeChild(container);

    const pdfBase64 = pdf.output("datauristring").split(",")[1];
    const fileSizeInMB = (pdfBase64.length * 0.75) / 1024 / 1024;

    if (fileSizeInMB > 10) {
      throw new Error(
        `ไฟล์ Receipt PDF ใหญ่เกิน 10MB (${fileSizeInMB.toFixed(2)} MB)`
      );
    }

    console.log("Receipt PDF generated successfully");
    return pdfBase64;
  } catch (error) {
    console.error("Error generating Receipt PDF:", error);
    throw new Error(`ไม่สามารถสร้าง Receipt PDF ได้: ${error.message}`);
  }
};

/**
 * คำนวณจำนวนหน้าและแบ่งผู้โดยสาร - เหมือน Invoice
 */
const calculateReceiptPages = (receiptData) => {
  const PASSENGERS_PER_PAGE = 9;

  if (!receiptData?.passengers?.length) {
    return { totalPages: 1, passengerPages: [[]] };
  }

  const totalPassengers = receiptData.passengers.length;
  const totalPages =
    totalPassengers <= PASSENGERS_PER_PAGE
      ? 1
      : Math.ceil(totalPassengers / PASSENGERS_PER_PAGE);

  const passengerPages = [];
  for (let i = 0; i < totalPassengers; i += PASSENGERS_PER_PAGE) {
    passengerPages.push(
      receiptData.passengers.slice(i, i + PASSENGERS_PER_PAGE)
    );
  }

  return { totalPages, passengerPages };
};

/**
 * สร้าง HTML สำหรับหลายหน้า - ใช้ structure เดียวกับ Invoice
 */
const createReceiptHTML = (receiptData, passengerPages, totalPages) => {
  const pages = passengerPages.map((passengers, pageIndex) => {
    const pageNumber = pageIndex + 1;
    const isFirstPage = pageNumber === 1;

    return `
      <div class="print-page ${
        !isFirstPage ? "page-break" : ""
      }" id="page-${pageNumber}">
        ${renderReceiptHeader(receiptData)}
        ${renderReceiptTable(receiptData, passengers, pageNumber, totalPages)}
        ${renderReceiptFooter(pageNumber, totalPages, receiptData)}
      </div>
    `;
  });

  return `
    <div class="print-document">
      <style>${getReceiptStyles()}</style>
      ${pages.join("")}
    </div>
  `;
};

/**
 * สร้าง Header สำหรับ Receipt - คัดลอกจาก Invoice แล้วแก้ชื่อเอกสาร
 */
const renderReceiptHeader = (receiptData) => {
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
        ${
          // ⭐ แสดง Ref: INV Number เฉพาะ Receipt เดี่ยวๆ (ไม่ใช่ Multi INV Receipt)
          !receiptData.selectedPOs || receiptData.selectedPOs.length === 0
            ? `<div class="print-info-row">
          <span class="print-info-label">Ref:</span>
          <span class="print-info-value">${
            receiptData.invoice?.poNumber || ""
          }</span>
        </div>`
            : ""
        }
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
 * สร้างตารางสำหรับ Receipt - เหมือน Invoice เป๊ะ
 */
const renderReceiptTable = (
  receiptData,
  passengers,
  pageNumber,
  totalPages
) => {
  // เตรียม routes สำหรับแสดง (เหมือน Invoice - สูงสุด 5 routes)
  let routesList = [];
  if (receiptData.flights?.routes && receiptData.flights.routes.length > 0) {
    const maxRoutes = 5;
    routesList = receiptData.flights.routes.slice(0, maxRoutes).map((route) => {
      return {
        flight: route.flight_number || route.flight || "",
        date: route.date || "",
        path:
          route.origin_city_name && route.destination_city_name
            ? `${route.origin_city_name.toUpperCase()}-${route.destination_city_name.toUpperCase()}`
            : route.origin && route.destination
            ? `${route.origin}-${route.destination}`
            : "",
        time:
          route.departure_time && route.arrival_time
            ? `${route.departure_time}-${route.arrival_time}`
            : "",
      };
    });
  } else if (receiptData.flights?.routeDisplay) {
    routesList = [
      {
        flight: receiptData.flights.routeDisplay,
        date: "",
        path: "",
        time: "",
      },
    ];
  }

  // เติมบรรทัดว่างให้ครบ 5 routes
  while (routesList.length < 5) {
    routesList.push({ flight: "", date: "", path: "", time: "" });
  }

  // คำนวณความกว้างของ route-path (เหมือน Invoice)
  const maxPathLength = Math.max(...routesList.map(r => (r.path || "").length));
  const pathWidthPx = Math.max(100, maxPathLength * 7 + 20);

  return `
    <style>
      .print-route-grid {
        grid-template-columns: 40px 40px ${pathWidthPx}px 100px !important;
      }
    </style>
    <div class="print-items-table">
      <table class="print-table">
        <thead>
          <tr>
            <th class="print-th-detail">รายละเอียด</th>
            <th class="print-th-amount">จำนวน</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="print-section-header">NAME /ชื่อผู้โดยสาร</td>
            <td class="print-td-amount"></td>
          </tr>
          ${(() => {
            const priceList = [];
            const adt1Entry = receiptData.passengerTypes?.find((p) => p.type === "ADT 1");
            const adt2Entry = receiptData.passengerTypes?.find((p) => p.type === "ADT 2");
            const adt3Entry = receiptData.passengerTypes?.find((p) => p.type === "ADT 3");
            if (adt1Entry?.priceDisplay) priceList.push({ label: "ADT 1", price: adt1Entry.priceDisplay });
            if (adt2Entry?.priceDisplay) priceList.push({ label: "ADT 2", price: adt2Entry.priceDisplay });
            if (adt3Entry?.priceDisplay) priceList.push({ label: "ADT 3", price: adt3Entry.priceDisplay });

            return passengers
              .map(
                (passenger, index) => `
            <tr>
              <td class="print-passenger-item print-airline-row">
                <div class="print-passenger-grid">
                  <span class="passenger-index">${
                    passenger.displayData?.index || ""
                  }</span>
                  <span class="passenger-name">${
                    passenger.displayData?.name || "\u00A0"
                  }</span>
                </div>
                <span class="print-passenger-type">${
                  priceList[index]?.label || ""
                }</span>
              </td>
              <td class="print-td-amount">${priceList[index]?.price || ""}</td>
            </tr>
          `
              )
              .join("");
          })()}

          <tr>
            <td class="print-section-header">AIR TICKET /ตั๋วเครื่องบิน</td>
            <td class="print-td-amount"></td>
          </tr>

          <!-- บรรทัดที่ 1-5: Route[0]-Route[4] (เหมือน Invoice - แสดงแค่ route ไม่มีราคา) -->
          ${[0, 1, 2, 3, 4].map(i => `
          <tr>
            <td class="print-section-item print-airline-row">
              <div class="print-airline-name print-route-grid">
                <span class="route-flight">${routesList[i].flight}</span>
                <span class="route-date">${routesList[i].date}</span>
                <span class="route-path">${routesList[i].path}</span>
                <span class="route-time">${routesList[i].time}</span>
              </div>
            </td>
            <td class="print-td-amount"></td>
          </tr>`).join("")}

          <!-- บรรทัดที่ 6-7: ว่าง -->
          <tr>
            <td class="print-section-item">&nbsp;</td>
            <td class="print-td-amount">&nbsp;</td>
          </tr>
          <tr>
            <td class="print-section-item">&nbsp;</td>
            <td class="print-td-amount">&nbsp;</td>
          </tr>

          <!-- OTHER Section - 3 บรรทัดเสมอ (แสดง Remark แทน) -->
          <tr>
            <td class="print-section-header">Remark</td>
            <td class="print-td-amount"></td>
          </tr>
          <tr>
            <td class="print-section-item">${receiptData.remark || "\u00A0"}</td>
            <td class="print-td-amount">&nbsp;</td>
          </tr>
          <tr>
            <td class="print-section-item">&nbsp;</td>
            <td class="print-td-amount">&nbsp;</td>
          </tr>
          <tr>
            <td class="print-section-item">&nbsp;</td>
            <td class="print-td-amount">&nbsp;</td>
          </tr>

          <tr class="print-summary-row">
            <td class="print-td-amount print-summary-label">Sub-Total</td>
            <td class="print-td-amount print-summary-value">
              ${formatCurrencyWithDecimal(
                receiptData.summary?.subtotal || 0
              )} Baht
            </td>
          </tr>
          <tr class="print-summary-row">
            <td class="print-td-amount print-summary-label">VAT ${
              Math.floor(receiptData.summary?.vatPercent || 0)
            }%</td>
            <td class="print-td-amount print-summary-value">
              ${formatCurrency(receiptData.summary?.vat || 0)} Baht
            </td>
          </tr>
          <tr class="print-total-row">
            <td class="print-total-label-cell">
              <span class="print-total-english-text">
                (${numberToEnglishText(receiptData.summary?.total || 0)} Baht)
              </span>
              <span class="print-td-amount print-summary-label">Total</span>
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
 * สร้าง Footer สำหรับ Receipt
 * ✅ อัพเดท: ให้เหมือน Print - รองรับ updatedByName และ issueDate
 */
const renderReceiptFooter = (pageNumber, totalPages, receiptData) => {
  // Format วันที่แบบ DD/MM/YY (เหมือน Print)
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
  const remark = receiptData?.remark || "";

  return `
    ${remark ? `
    <!-- Remark -->
    <div style="margin: 8px 0; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px;">
      <strong>Remark:</strong> ${remark}
    </div>
    ` : ""}

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

    <div class="print-footer">หน้า ${pageNumber}/${totalPages}</div>
  `;
};

/**
 * CSS Styles สำหรับ Receipt - ใช้ของ Invoice + เพิ่มสีใหม่
 */
const getReceiptStyles = () => {
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
    
    .page-break {
      page-break-before: always !important;
      break-before: page !important;
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

    /* Override สำหรับ print-info-invoice - ให้ label แคบลง */
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

    .print-th-detail { 
      width: 75%; 
    }
    .print-th-amount { 
      width: 25%; 
      border-left: 1px solid #000; 
    }

    .print-table td {
      padding: 4px;
      font-size: 12px;
      vertical-align: middle;
    }

    .print-td-amount {
      text-align: right;
      padding-right: 8px;
    }

    .print-table td:nth-child(2) {
      border-left: 1px solid #000;
    }

    .print-table {
      border-left: none;
    }

    .print-section-header {
      font-weight: bold;
      background-color: transparent;
    }

    .print-section-item {
      padding-left: 30px !important;
    }

    .print-passenger-item {
      padding-left: 30px !important;
    }

    .print-passenger-grid {
      display: grid !important;
      grid-template-columns: 10px minmax(240px, max-content) 40px 30px 120px !important;
      gap: 8px !important;
      align-items: center !important;
    }

    .passenger-name {
      text-align: left !important;
      white-space: nowrap;
    }
          
    .passenger-index {
      text-align: left !important;
    }

    .passenger-name {
      text-align: left !important;
    }

    .passenger-age {
      text-align: center !important;
    }

    .passenger-ticket {
      text-align: center !important;
    }

    .passenger-code {
      text-align: left !important;
      white-space: nowrap !important;
      word-break: keep-all !important;
    }

    .print-airline-row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding-left: 30px !important;
      padding-right: 8px !important;
    }

    .print-airline-name {
      flex: 1;
      text-align: left;
    }

    .print-passenger-type {
      text-align: right;
      min-width: 60px;
    }

    .print-route-grid {
      display: grid !important;
      grid-template-columns: 40px 40px 200px 100px !important;
      gap: 16px !important;
      align-items: center !important;
    }

    .route-flight {
      text-align: left !important;
    }

    .route-date {
      text-align: left !important;
    }

    .route-path {
      text-align: left !important;
    }

    .route-time {
      text-align: left !important;
    }

    .print-summary-row {
      border-top: 1px solid #000;
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
    
    .print-total-label-cell {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 4px;
    }

    .print-total-english-text {
      text-align: left;
      font-weight: bold;
      flex: 1;
    }
    
    .print-spacer {
      flex: 1;
    }
  `;
};

/**
 * สร้าง Receipt PDF พร้อมจัดการ error
 */
export async function generateReceiptPDFSafely(receiptData, ticketId) {
  try {
    const pdfBase64 = await generateReceiptPDF(receiptData, ticketId);

    return {
      success: true,
      pdfBase64: pdfBase64,
      message: "สร้าง Receipt PDF สำเร็จ",
    };
  } catch (error) {
    console.error("Receipt PDF generation failed:", error);

    return {
      success: false,
      error: error.message,
      message: "ไม่สามารถสร้าง Receipt PDF ได้",
    };
  }
}
