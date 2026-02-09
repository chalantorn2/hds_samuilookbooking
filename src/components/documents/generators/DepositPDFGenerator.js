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
 * สร้าง PDF จาก Deposit data
 */
export const generateDepositPDF = async (depositData, depositId) => {
  try {
    console.log("Starting Deposit PDF generation:", depositId);

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

    const printContent = createDepositHTML(depositData);
    printWrapper.innerHTML = printContent;

    await waitForFonts();
    await waitForImages(printWrapper);

    console.log("Capturing canvas...");

    const canvas = await html2canvas(printWrapper, {
      scale: 3.0,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: 794,
      height: printWrapper.scrollHeight,
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

    // คำนวณขนาดและแบ่งหน้า
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    console.log("=== DEPOSIT PDF DEBUG ===");
    console.log("Canvas height:", canvas.height, "px");
    console.log("Canvas width:", canvas.width, "px");
    console.log("Image height:", imgHeight, "mm");
    console.log("Page height:", pageHeight, "mm");

    let heightLeft = imgHeight;
    let position = 0;

    // เพิ่มรูปลงใน PDF (หน้าแรก)
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    console.log("Height left after first page:", heightLeft, "mm");

    // ⭐ ใช้ tolerance เพื่อป้องกันการเพิ่มหน้าจากข้อผิดพลาดการคำนวณเล็กน้อย
    const TOLERANCE = 1; // mm - ยอมให้เกินได้ไม่เกิน 1mm

    // เช็คว่าเนื้อหาเหลือมากกว่า tolerance จริงๆ หรือไม่
    if (heightLeft > TOLERANCE) {
      console.log("⚠️ Adding extra page(s) because heightLeft > TOLERANCE");
      // มีเนื้อหาเหลือเยอะ - ต้องเพิ่มหน้า
      while (heightLeft > TOLERANCE) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        console.log("Added page, heightLeft:", heightLeft);
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    } else {
      console.log(
        "✅ Single page only, heightLeft:",
        heightLeft,
        "mm (within tolerance)"
      );
    }

    // ทำความสะอาด
    document.body.removeChild(container);

    const pdfBase64 = pdf.output("datauristring").split(",")[1];

    const fileSizeInMB = (pdfBase64.length * 0.75) / 1024 / 1024;
    console.log(`PDF size: ${fileSizeInMB.toFixed(2)} MB`);

    if (fileSizeInMB > 10) {
      throw new Error(`ไฟล์ PDF ใหญ่เกิน 10MB (${fileSizeInMB.toFixed(2)} MB)`);
    }

    console.log("Deposit PDF generated successfully");
    return pdfBase64;
  } catch (error) {
    console.error("Error generating Deposit PDF:", error);
    throw new Error(`ไม่สามารถสร้าง PDF ได้: ${error.message}`);
  }
};

/**
 * สร้าง HTML content สำหรับ Deposit
 */
const createDepositHTML = (depositData) => {
  return `
    <div class="print-document">
      <style>${getDepositStyles()}</style>
      <div class="print-page">
        ${renderDepositHeader(depositData)}
        ${renderDepositTable(depositData)}
        ${renderPaymentInstructions(depositData)}
        ${renderDepositFooter(depositData)}
      </div>
    </div>
  `;
};

/**
 * สร้าง Header
 */
const renderDepositHeader = (depositData) => {
  const customerName = getDisplayCustomerName(depositData);
  const customerAddress = getDisplayCustomerAddress(depositData);
  const customerPhone = getDisplayCustomerPhone(depositData);
  const customerIdNumber = getDisplayCustomerIdNumber(depositData);
  const customerBranchType = getDisplayCustomerBranchType(depositData);
  const customerBranchNumber = getDisplayCustomerBranchNumber(depositData);

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
        <div class="print-document-title-text">ใบมัดจำ</div>
        <div class="print-document-title-text">Deposit</div>
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
            depositData.invoice?.dpNumber || ""
          }</span>
        </div>
        <div class="print-info-row">
          <span class="print-info-label">วันที่:</span>
          <span class="print-info-value">${
            depositData.invoice?.date || ""
          }</span>
        </div>
        <div class="print-info-row">
          <span class="print-info-label">วันที่ครบกำหนด:</span>
          <span class="print-info-value">${
            depositData.invoice?.dueDate || ""
          }</span>
        </div>
        <div class="print-info-row">
          <span class="print-info-label">Sale /Staff:</span>
          <span class="print-info-value">${
            depositData.invoice?.salesPerson || ""
          }</span>
        </div>
      </div>
    </div>
  `;
};

/**
 * แสดง Description Section - 7 บรรทัดเสมอ (ฟิกซ์)
 */
const renderDescriptionRows = (
  flights,
  adultPrice,
  childPrice,
  infantPrice
) => {
  const MAX_DESCRIPTION_ROWS = 7;
  const descriptionRows = [];

  // เตรียม routes สำหรับแสดง (สูงสุด 4 routes) - เปลี่ยนเป็น object
  let routesList = [];
  if (flights?.routes && flights.routes.length > 0) {
    const maxRoutes = 4;
    routesList = flights.routes.slice(0, maxRoutes).map((route) => {
      return {
        flight: route.flight_number || route.flight || "",
        rbd: route.rbd || "",
        date: route.date || "",
        path:
          route.origin && route.destination
            ? `${route.origin}-${route.destination}`
            : "",
        time:
          route.departure_time && route.arrival_time
            ? `${route.departure_time}-${route.arrival_time}`
            : "",
      };
    });
  } else if (flights?.routeDisplay) {
    routesList = [
      {
        flight: flights.routeDisplay,
        rbd: "",
        date: "",
        path: "",
        time: "",
      },
    ];
  }

  // บรรทัดที่ 1: Supplier only
  descriptionRows.push(`
    <tr>
      <td class="print-section-item print-airline-row">
        <span class="print-airline-name">${flights?.supplierName || ""}</span>
      </td>
      <td class="print-td-amount"></td>
    </tr>
  `);

  // บรรทัดที่ 2: Route[0] + ADULT (ซ่อนข้อความถ้าไม่มีราคา)
  descriptionRows.push(`
    <tr>
      <td class="print-section-item print-airline-row">
        <div class="print-airline-name print-route-grid">
          <span class="route-flight">${routesList[0]?.flight || ""}</span>
          <span class="route-rbd">${routesList[0]?.rbd || ""}</span>
          <span class="route-date">${routesList[0]?.date || ""}</span>
          <span class="route-path">${routesList[0]?.path || ""}</span>
          <span class="route-time">${routesList[0]?.time || ""}</span>
        </div>
        <span class="print-passenger-type">${adultPrice ? "ADULT" : ""}</span>
      </td>
      <td class="print-td-amount">${adultPrice}</td>
    </tr>
  `);

  // บรรทัดที่ 3: Route[1] + CHILD (ซ่อนข้อความถ้าไม่มีราคา)
  descriptionRows.push(`
    <tr>
      <td class="print-section-item print-airline-row">
        <div class="print-airline-name print-route-grid">
          <span class="route-flight">${routesList[1]?.flight || ""}</span>
          <span class="route-rbd">${routesList[1]?.rbd || ""}</span>
          <span class="route-date">${routesList[1]?.date || ""}</span>
          <span class="route-path">${routesList[1]?.path || ""}</span>
          <span class="route-time">${routesList[1]?.time || ""}</span>
        </div>
        <span class="print-passenger-type">${childPrice ? "CHILD" : ""}</span>
      </td>
      <td class="print-td-amount">${childPrice}</td>
    </tr>
  `);

  // บรรทัดที่ 4: Route[2] + INFANT (ซ่อนข้อความถ้าไม่มีราคา)
  descriptionRows.push(`
    <tr>
      <td class="print-section-item print-airline-row">
        <div class="print-airline-name print-route-grid">
          <span class="route-flight">${routesList[2]?.flight || ""}</span>
          <span class="route-rbd">${routesList[2]?.rbd || ""}</span>
          <span class="route-date">${routesList[2]?.date || ""}</span>
          <span class="route-path">${routesList[2]?.path || ""}</span>
          <span class="route-time">${routesList[2]?.time || ""}</span>
        </div>
        <span class="print-passenger-type">${infantPrice ? "INFANT" : ""}</span>
      </td>
      <td class="print-td-amount">${infantPrice}</td>
    </tr>
  `);

  // บรรทัดที่ 5: Route[3] (แสดงแค่ route ไม่มีราคา)
  descriptionRows.push(`
    <tr>
      <td class="print-section-item print-airline-row">
        <div class="print-airline-name print-route-grid">
          <span class="route-flight">${routesList[3]?.flight || ""}</span>
          <span class="route-rbd">${routesList[3]?.rbd || ""}</span>
          <span class="route-date">${routesList[3]?.date || ""}</span>
          <span class="route-path">${routesList[3]?.path || ""}</span>
          <span class="route-time">${routesList[3]?.time || ""}</span>
        </div>
      </td>
      <td class="print-td-amount"></td>
    </tr>
  `);

  // เติมบรรทัดว่างให้ครบ 7 บรรทัด
  while (descriptionRows.length < MAX_DESCRIPTION_ROWS) {
    descriptionRows.push(`
      <tr>
        <td class="print-section-item">&nbsp;</td>
        <td class="print-td-amount">&nbsp;</td>
      </tr>
    `);
  }

  return descriptionRows.join("");
};

/**
 * แสดง Other Section - 5 บรรทัดเสมอ (ฟิกซ์)
 */
const renderOtherRows = (extras) => {
  const MAX_OTHER_ROWS = 5;
  const otherRows = [];
  const displayExtras = (extras || []).slice(0, MAX_OTHER_ROWS);

  // แสดง extras ที่มี
  displayExtras.forEach((extra) => {
    otherRows.push(`
      <tr>
        <td class="print-section-item">${extra.description || "&nbsp;"}</td>
        <td class="print-td-amount">${extra.priceDisplay || "&nbsp;"}</td>
      </tr>
    `);
  });

  // เติมบรรทัดว่างให้ครบ 5 บรรทัด
  while (otherRows.length < MAX_OTHER_ROWS) {
    otherRows.push(`
      <tr>
        <td class="print-section-item">&nbsp;</td>
        <td class="print-td-amount">&nbsp;</td>
      </tr>
    `);
  }

  return otherRows.join("");
};

/**
 * สร้างตาราง Deposit
 */
const renderDepositTable = (depositData) => {
  const { flights, passengerTypes, extras, summary, depositInfo } = depositData;

  const adultPrice =
    passengerTypes?.find((p) => p.type === "ADULT")?.priceDisplay || "";
  const childPrice =
    passengerTypes?.find((p) => p.type === "CHILD")?.priceDisplay || "";
  const infantPrice =
    passengerTypes?.find((p) => p.type === "INFANT")?.priceDisplay || "";

  return `
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
            <td class="print-section-header">Description /รายการ</td>
            <td class="print-td-amount"></td>
          </tr>

          ${renderDescriptionRows(flights, adultPrice, childPrice, infantPrice)}

          <tr>
            <td class="print-section-header">Other</td>
            <td class="print-td-amount"></td>
          </tr>
          ${renderOtherRows(extras)}

          <tr class="print-summary-row">
            <td class="print-td-amount print-summary-label">Sub-Total</td>
            <td class="print-td-amount print-summary-value">
              ${formatCurrencyWithDecimal(summary?.subtotal || 0)} Baht
            </td>
          </tr>

          <tr class="print-summary-row">
            <td class="print-td-amount print-summary-label">VAT ${Math.floor(
              summary?.vatPercent || 0
            )}%</td>
            <td class="print-td-amount print-summary-value">
              ${formatCurrency(summary?.vat || 0)} Baht
            </td>
          </tr>

          <tr class="print-total-row">
            <td class="print-total-label-cell">
              <span class="print-total-english-text">
                (${numberToEnglishText(summary?.total || 0)} Baht)
              </span>
              <span class="print-td-amount print-summary-label">Total</span>
            </td>
            <td class="print-td-amount print-summary-value">
              ${formatCurrencyWithDecimal(summary?.total || 0)} Baht
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
};

/**
 * สร้าง Payment Instructions
 */
const renderPaymentInstructions = (depositData) => {
  const { depositInfo, summary } = depositData;

  if (!depositInfo) return "";

  // แปลงวันที่เป็นรูปแบบ DD.MM.YYYY
  const formatDateWithDots = (dateString) => {
    if (!dateString) return "";
    try {
      const parts = dateString.split("/");
      if (parts.length === 3) {
        const [day, month, year] = parts;
        if (day && month && year) {
          return `${day}.${month}.${year}`;
        }
      }
      // ถ้าไม่ใช่รูปแบบ DD/MM/YYYY ให้คืนค่าเดิม
      return dateString;
    } catch (e) {
      return dateString;
    }
  };

  return `
    <div class="deposit-payment-instructions">
      <table class="deposit-payment-table">
        <tbody>
          ${
            depositInfo.depositDueDate
              ? `
            <tr>
              <td class="payment-label">กรุณาชำระเงินมัดจำครั้งที่ 1 ภายในวันที่</td>
              <td class="payment-date">${depositInfo.depositDueDate}</td>
              <td class="payment-amount-label">จำนวน</td>
              <td class="payment-amount">${formatCurrencyWithDecimal(
                depositInfo.depositAmount || 0
              )}</td>
              <td class="payment-currency">บาท</td>
            </tr>
          `
              : ""
          }
          ${
            depositInfo.secondDepositAmount > 0
              ? `
            <tr>
              <td class="payment-label">กรุณาชำระเงินมัดจำครั้งที่ 2 ภายในวันที่</td>
              <td class="payment-date">${
                depositInfo.secondDepositDueDate || "-"
              }</td>
              <td class="payment-amount-label">จำนวน</td>
              <td class="payment-amount">${formatCurrencyWithDecimal(
                depositInfo.secondDepositAmount || 0
              )}</td>
              <td class="payment-currency">บาท</td>
            </tr>
          `
              : ""
          }
          ${
            depositInfo.fullPaymentDueDate
              ? `
            <tr>
              <td class="payment-label">กรุณาชำระทั้งหมดภายในวันที่</td>
              <td class="payment-date">${depositInfo.fullPaymentDueDate}</td>
              <td class="payment-amount-label">จำนวน</td>
              <td class="payment-amount">${formatCurrencyWithDecimal(
                (summary?.total || 0) -
                  (depositInfo.depositAmount || 0) -
                  (depositInfo.secondDepositAmount || 0)
              )}</td>
              <td class="payment-currency">บาท</td>
            </tr>
          `
              : ""
          }
        </tbody>
      </table>
    </div>
    ${
      depositInfo.passengerInfoDueDate
        ? `
    <div class="deposit-passenger-info-notice">
      * แจ้งชื่อผู้โดยสารก่อนวันที่ ${formatDateWithDots(
        depositInfo.passengerInfoDueDate
      )}
    </div>
    `
        : ""
    }
  `;
};

/**
 * สร้าง Footer
 * ✅ อัพเดท: ให้เหมือน Print - รองรับ updatedByName และ issueDate
 */
const renderDepositFooter = (depositData) => {
  // Format วันที่แบบ DD/MM/YY (เหมือน Print)
  const getFormattedIssueDate = () => {
    const issueDate = depositData?.invoice?.date;
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

  const updatedByName = depositData?.updatedByName || null;
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
    <div class="print-footer">หน้า 1/1</div>
  `;
};

/**
 * CSS Styles สำหรับ Deposit
 */
const getDepositStyles = () => {
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

    .print-section-header {
      font-weight: bold;
      background-color: transparent;
    }

    .print-section-item {
      padding-left: 30px !important;
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
      grid-template-columns: 40px 20px 40px 60px 100px !important;
      gap: 8px !important;
      align-items: center !important;
    }

    .route-flight {
      text-align: left !important;
    }

    .route-rbd {
      text-align: center !important;
    }

    .route-date {
      text-align: center !important;
    }

    .route-path {
      text-align: center !important;
    }

    .route-time {
      text-align: left !important;
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

    .print-total-label-cell {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .print-total-english-text {
      text-align: left;
      font-weight: bold;
      flex: 1;
    }

    .deposit-payment-instructions {
      margin: 12px 0;
      padding: 12px;
      background-color: #f9fafb;
      border: 1px solid #d1d5db;
      border-radius: 6px;
    }

    .deposit-payment-table {
      width: 100%;
      border-collapse: collapse;
    }

    .deposit-payment-table td {
      padding: 8px 4px;
      font-size: 13px;
      vertical-align: middle;
    }

    .payment-label {
      width: 30%;
      font-weight: 500;
    }

    .payment-date {
      width: 20%;
      font-weight: bold;
      color: #1e40af;
    }

    .payment-amount-label {
      width: 10%;
      text-align: right;
      font-weight: 500;
    }

    .payment-amount {
      width: 25%;
      text-align: right;
      font-weight: bold;
      font-size: 14px;
      color: #dc2626;
    }

    .payment-currency {
      width: 5%;
      text-align: left;
    }

    .deposit-passenger-info-notice {
      margin-top: 5px;
      font-size: 14px;
      color: #1e40af !important;
      font-weight: normal;
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

    .print-spacer {
      flex: 1;
    }
  `;
};

/**
 * Helper functions
 */
export function formatCurrencyWithDecimal(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "0.00";
  return parseFloat(amount).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "0";
  return Math.floor(parseFloat(amount)).toLocaleString("th-TH");
}

export async function waitForFonts() {
  try {
    if ("fonts" in document) {
      await document.fonts.ready;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

export async function waitForImages(container) {
  const images = container.querySelectorAll("img");
  if (!images.length) return Promise.resolve();

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
}

/**
 * Safe wrapper
 */
export async function generateDepositPDFSafely(depositData, depositId) {
  try {
    const pdfBase64 = await generateDepositPDF(depositData, depositId);
    return {
      success: true,
      pdfBase64: pdfBase64,
      message: "สร้าง PDF สำเร็จ",
    };
  } catch (error) {
    console.error("Deposit PDF generation failed:", error);
    return {
      success: false,
      error: error.message,
      message: "ไม่สามารถสร้าง PDF ได้",
    };
  }
}
