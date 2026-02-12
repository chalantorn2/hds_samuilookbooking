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

/**
 * สร้าง PDF จาก Invoice data โดยรองรับหลายหน้า
 * @param {Object} invoiceData - ข้อมูล Invoice ที่จะสร้าง PDF
 * @param {number} ticketId - ID ของ ticket
 * @returns {Promise<string>} - PDF ในรูปแบบ base64
 */
export const generateInvoicePDF = async (invoiceData, ticketId) => {
  try {
    console.log("Starting PDF generation for ticket:", ticketId);
    console.log("Invoice data:", invoiceData);

    // สร้าง container สำหรับ render component
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.top = "-9999px";
    container.style.left = "-9999px";
    container.style.width = "210mm";
    container.style.height = "auto";
    container.style.background = "white";
    container.style.fontFamily = "Prompt, sans-serif";

    document.body.appendChild(container);

    // คำนวดหน้า
    const { totalPages, passengerPages } = calculatePages(invoiceData);

    // สร้าง wrapper div สำหรับเนื้อหาทั้งหมด
    const printWrapper = document.createElement("div");
    printWrapper.style.width = "100%";
    printWrapper.style.background = "white";
    printWrapper.style.padding = "0";
    printWrapper.style.boxSizing = "border-box";

    container.appendChild(printWrapper);

    // สร้างเนื้อหาทั้งหมด
    const printContent = createMultiPageHTML(
      invoiceData,
      passengerPages,
      totalPages
    );
    printWrapper.innerHTML = printContent;

    // รอให้ fonts และ images โหลด
    await waitForFonts();
    await waitForImages(printWrapper);

    console.log("Content rendered, capturing canvas...");

    // สร้าง canvas จาก HTML
    const canvas = await html2canvas(printWrapper, {
      scale: 3.0,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: 794, // A4 width in pixels at 96 DPI
      height: printWrapper.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      logging: false,
      quality: 0.95,
    });

    console.log("Canvas created, generating PDF...");

    // สร้าง PDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: false,
    });

    // คำนวดขนาดและแบ่งหน้า
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // เพิ่มรูปลงใน PDF (หน้าแรก)
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // *** เพิ่มเงื่อนไขใหม่ตรงนี้ ***
    // เช็คว่าควรจะมีกี่หน้าจริงๆ ตามจำนวนผู้โดยสาร
    if (totalPages === 1) {
      // ถ้าเป็นหน้าเดียว ไม่ต้องเพิ่มหน้าใหม่
      console.log("Single page detected, not adding extra pages");
    } else {
      // เพิ่มหน้าถัดไปถ้าจำเป็น (สำหรับหลายหน้าเท่านั้น)
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    }
    // ทำความสะอาด
    document.body.removeChild(container);

    // แปลงเป็น base64
    const pdfBase64 = pdf.output("datauristring").split(",")[1];

    // ตรวจสอบขนาดไฟล์
    const fileSizeInMB = (pdfBase64.length * 0.75) / 1024 / 1024;
    console.log(`PDF size: ${fileSizeInMB.toFixed(2)} MB`);
    if (fileSizeInMB > 10) {
      throw new Error(`ไฟล์ PDF ใหญ่เกิน 10MB (${fileSizeInMB.toFixed(2)} MB)`);
    }

    console.log("PDF generated successfully");
    return pdfBase64;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error(`ไม่สามารถสร้าง PDF ได้: ${error.message}`);
  }
};

/**
 * คำนวดจำนวนหน้าและแบ่งผู้โดยสาร
 */
const calculatePages = (invoiceData) => {
  const PASSENGERS_PER_PAGE = 9;

  if (!invoiceData?.passengers?.length) {
    return { totalPages: 1, passengerPages: [[]] };
  }

  const totalPassengers = invoiceData.passengers.length;
  const totalPages =
    totalPassengers <= PASSENGERS_PER_PAGE
      ? 1
      : Math.ceil(totalPassengers / PASSENGERS_PER_PAGE);

  // แบ่งผู้โดยสารเป็นหน้าๆ
  const passengerPages = [];
  for (let i = 0; i < totalPassengers; i += PASSENGERS_PER_PAGE) {
    passengerPages.push(
      invoiceData.passengers.slice(i, i + PASSENGERS_PER_PAGE)
    );
  }

  return { totalPages, passengerPages };
};

/**
 * สร้าง HTML content สำหรับหลายหน้า
 */
const createMultiPageHTML = (invoiceData, passengerPages, totalPages) => {
  const pages = passengerPages.map((passengers, pageIndex) => {
    const pageNumber = pageIndex + 1;
    const isFirstPage = pageNumber === 1;

    return `
      <div class="print-page ${
        !isFirstPage ? "page-break" : ""
      }" id="page-${pageNumber}">
        ${renderPageHeader(invoiceData)}
        ${renderPassengerTable(invoiceData, passengers, pageNumber, totalPages)}
        ${renderPageFooter(pageNumber, totalPages, invoiceData)}
      </div>
    `;
  });

  return `
    <div class="print-document">
      <style>${getDocumentStyles()}</style>
      ${pages.join("")}
    </div>
  `;
};

/**
 * สร้าง Header ของแต่ละหน้า
 */
const renderPageHeader = (invoiceData) => {
  // เรียก helper functions ก่อนสร้าง template
  const customerName = getDisplayCustomerName(invoiceData);
  const customerAddress = getDisplayCustomerAddress(invoiceData);
  const customerPhone = getDisplayCustomerPhone(invoiceData);
  const customerIdNumber = getDisplayCustomerIdNumber(invoiceData);
  const customerBranchType = getDisplayCustomerBranchType(invoiceData);
  const customerBranchNumber = getDisplayCustomerBranchNumber(invoiceData);

  // แบ่งที่อยู่เป็นบรรทัด
  const addressLines = customerAddress ? customerAddress.split("\n") : [];

  return `
    <!-- Header -->
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
        <div class="print-document-title-text">ใบแจ้งหนี้</div>
        <div class="print-document-title-text">Invoice</div>
      </div>
    </div>

  
    <!-- Customer & Invoice Info -->
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
            invoiceData.invoice?.poNumber || ""
          }</span>
        </div>
        <div class="print-info-row">
          <span class="print-info-label">วันที่:</span>
          <span class="print-info-value">${
            invoiceData.invoice?.date || ""
          }</span>
        </div>
        <div class="print-info-row">
          <span class="print-info-label">วันที่ครบกำหนด:</span>
          <span class="print-info-value">${
            invoiceData.invoice?.dueDate || ""
          }</span>
        </div>
        <div class="print-info-row">
          <span class="print-info-label">Sale /Staff:</span>
          <span class="print-info-value">${
            invoiceData.invoice?.salesPerson || ""
          }</span>
        </div>
      </div>
    </div>
  `;
};

/**
 * สร้างตารางผู้โดยสารสำหรับแต่ละหน้า
 */
const renderPassengerTable = (
  invoiceData,
  passengers,
  pageNumber,
  totalPages
) => {
  const adt1Price =
    invoiceData.passengerTypes?.find((p) => p.type === "ADT 1")?.priceDisplay ||
    "";
  const adt2Price =
    invoiceData.passengerTypes?.find((p) => p.type === "ADT 2")?.priceDisplay ||
    "";
  const adt3Price =
    invoiceData.passengerTypes?.find((p) => p.type === "ADT 3")
      ?.priceDisplay || "";

  // เตรียม routes สำหรับแสดง (สูงสุด 5 routes) - เปลี่ยนเป็น object
  let routesList = [];
  if (invoiceData.flights?.routes && invoiceData.flights.routes.length > 0) {
    const maxRoutes = 5;
    routesList = invoiceData.flights.routes.slice(0, maxRoutes).map((route) => {
      return {
        flight: route.flight_number || route.flight || "",
        // rbd: route.rbd || "",
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
  } else if (invoiceData.flights?.routeDisplay) {
    routesList = [
      {
        flight: invoiceData.flights.routeDisplay,
        // rbd: "",
        date: "",
        path: "",
        time: "",
      },
    ];
  }

  // เติมบรรทัดว่างให้ครบ 5 routes
  while (routesList.length < 5) {
    routesList.push({
      flight: "",
      /* rbd: "", */ date: "",
      path: "",
      time: "",
    });
  }

  // 🔧 คำนวณความกว้างของ route-path ที่ยาวที่สุด
  const maxPathLength = Math.max(
    ...routesList.map((r) => (r.path || "").length)
  );
  const pathWidthPx = Math.max(100, maxPathLength * 7 + 20); // เพิ่ม padding 30px สำหรับ gap

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
          
          <!-- NAME Section - แสดงชื่อผู้โดยสาร + ราคาตามประเภท -->
          <tr>
            <td class="print-section-header">NAME /ชื่อผู้โดยสาร</td>
            <td class="print-td-amount"></td>
          </tr>
          ${(() => {
            const priceList = [];
            if (adt1Price) priceList.push({ label: "ADT 1", price: adt1Price });
            if (adt2Price) priceList.push({ label: "ADT 2", price: adt2Price });
            if (adt3Price) priceList.push({ label: "ADT 3", price: adt3Price });

            return passengers
              .map(
                (passenger, index) => `
  <tr>
    <td class="print-passenger-item print-airline-row">
      <div class="print-passenger-grid">
        <span class="passenger-index">
          ${passenger.displayData?.index || ""}
        </span>
        <span class="passenger-name">
          ${passenger.displayData?.name || "\u00A0"}
        </span>
      </div>
      <span class="print-passenger-type">
        ${priceList[index]?.label || ""}
      </span>
    </td>
    <td class="print-td-amount">${priceList[index]?.price || ""}</td>
  </tr>
`
              )
              .join("");
          })()}

          <!-- AIR TICKET Section - 7 บรรทัดเสมอ (แบบ Deposit) -->
          <tr>
            <td class="print-section-header">AIR TICKET /ตั๋วเครื่องบิน</td>
            <td class="print-td-amount"></td>
          </tr>

          <!-- บรรทัดที่ 1-5: Route[0]-Route[4] (แสดงแค่ route ไม่มีราคา) -->
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
            <td class="print-section-item">${invoiceData.remark || "\u00A0"}</td>
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

         <!-- Summary -->
<tr class="print-summary-row">
  <td class="print-td-amount print-summary-label">Sub-Total</td>
  <td class="print-td-amount print-summary-value">
    ${formatCurrencyWithDecimal(invoiceData.summary?.subtotal || 0)} Baht
  </td>
</tr>
<tr class="print-summary-row">
  <td class="print-td-amount print-summary-label">VAT ${Math.floor(
    invoiceData.summary?.vatPercent || 0
  )}%</td>
  <td class="print-td-amount print-summary-value">
    ${formatCurrency(invoiceData.summary?.vat || 0)} Baht
  </td>
</tr>
<tr class="print-total-row">
  <td class="print-total-label-cell">
    <span class="print-total-english-text">
      (${numberToEnglishText(invoiceData.summary?.total || 0)} Baht)
    </span>
    <span class="print-td-amount print-summary-label">
      Total
    </span>
  </td>
  <td class="print-td-amount print-summary-value">
    ${formatCurrencyWithDecimal(invoiceData.summary?.total || 0)} Baht
  </td>
</tr>
        </tbody>
      </table>
    </div>
  `;
};

/**
 * สร้าง Footer ของแต่ละหน้า
 * ✅ อัพเดท: ให้เหมือน Print - รองรับ updatedByName และ issueDate
 */
const renderPageFooter = (pageNumber, totalPages, invoiceData) => {
  // Format วันที่แบบ DD/MM/YY (เหมือน Print)
  const getFormattedIssueDate = () => {
    const issueDate = invoiceData?.invoice?.date;
    if (!issueDate) return "";

    try {
      // ถ้าวันที่อยู่ในรูปแบบ DD/MM/YYYY อยู่แล้ว (จาก data mapper)
      // ให้แปลงเป็น DD/MM/YY
      if (typeof issueDate === "string" && issueDate.includes("/")) {
        const parts = issueDate.split("/");
        if (parts.length === 3) {
          const day = parts[0];
          const month = parts[1];
          const year = parts[2].slice(-2); // เอาแค่ 2 หลักสุดท้าย
          return `${day}/${month}/${year}`;
        }
      }

      // ถ้าเป็นรูปแบบอื่น ให้ลอง parse ด้วย Date
      const date = new Date(issueDate);
      if (isNaN(date.getTime())) return "";

      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear().toString().slice(-2);
      return `${day}/${month}/${year}`;
    } catch (e) {
      return "";
    }
  };

  const updatedByName = invoiceData?.updatedByName || null;
  const formattedDate = getFormattedIssueDate();

  const remark = invoiceData?.remark || "";

  return `
    ${remark ? `
    <!-- Remark -->
    <div style="margin: 8px 0; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px;">
      <strong>Remark:</strong> ${remark}
    </div>
    ` : ""}

    <!-- Payment Info & Signatures -->
    <div class="print-bottom-section">
    <div class="print-spacer"></div>

      <!-- Signatures -->
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
          <div class="print-signature-title">Received by</div>
          <div class="print-signature-area">
          ${
            updatedByName
              ? `<div style="font-weight: 500; font-size: 14px; visibility: hidden;">${updatedByName}</div>`
              : '<img src="/assets/logo-print.png" alt="Approved Signature" class="print-signature-logo" style="visibility: hidden;" crossorigin="anonymous" />'
          }
          </div>
          <div class="print-signature-date">Date: ...............................</div>
        </div>
      </div>
    </div>

    <!-- Page Footer -->
    <div class="print-footer">หน้า ${pageNumber}/${totalPages}</div>
  `;
};

/**
 * CSS Styles สำหรับ PDF (Copy จาก PrintInvoice.jsx)
 */
const getDocumentStyles = () => {
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

    .print-info-value.print-address {
      white-space: normal !important;
      word-wrap: break-word !important;
    }

    .print-address div {
      margin: 1px 0;
      display: block;
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

        /* เส้นแบ่งคอลัม - เฉพาะ td ที่ 2 ในแต่ละแถว */
        .print-table td:nth-child(2) {
          border-left: 1px solid #000;
        }

        /* ยกเลิกเส้นซ้ายสุดของตาราง */
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
          grid-template-columns: 10px 1fr !important;
          gap: 8px !important;
          align-items: center !important;
        }

      .passenger-index {
        text-align: left !important;
      }

      .passenger-name {
        text-align: left !important;
        white-space: nowrap;
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

/* .route-rbd {
  text-align: center !important;
} */

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

.print-summary-text {
  text-align: left;
  padding-left: 8px;
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
 * รอให้ Google Fonts โหลดเสร็จ
 */
export async function waitForFonts() {
  try {
    if ("fonts" in document) {
      await document.fonts.ready;
      console.log("Fonts loaded successfully");
    } else {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.warn("Font loading error:", error);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

/**
 * รอให้รูปภาพโหลดเสร็จ
 */
export async function waitForImages(container) {
  const images = container.querySelectorAll("img");

  if (!images.length) {
    return Promise.resolve();
  }

  const imagePromises = Array.from(images).map((img) => {
    return new Promise((resolve) => {
      if (img.complete) {
        resolve();
      } else {
        img.onload = resolve;
        img.onerror = resolve;
        setTimeout(resolve, 2000);
      }
    });
  });

  await Promise.all(imagePromises);
  console.log("All images loaded");
}

/**
 * จัดรูปแบบตัวเลขมีทศนิยม 2 ตำแหน่ง (สำหรับยอดรวม)
 */
export function formatCurrencyWithDecimal(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "0.00";
  return parseFloat(amount).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * จัดรูปแบบตัวเลขไม่มีทศนิยม
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "0";
  return Math.floor(parseFloat(amount)).toLocaleString("th-TH");
}

/**
 * สร้าง PDF พร้อมกับจัดการ error
 */
export async function generatePDFSafely(invoiceData, ticketId) {
  try {
    const pdfBase64 = await generateInvoicePDF(invoiceData, ticketId);

    return {
      success: true,
      pdfBase64: pdfBase64,
      message: "สร้าง PDF สำเร็จ",
    };
  } catch (error) {
    console.error("PDF generation failed:", error);

    return {
      success: false,
      error: error.message,
      message: "ไม่สามารถสร้าง PDF ได้",
    };
  }
}
