// src/components/documents/generators/VoucherPDFGenerator.js
// แก้ไข: ลบ Header และปรับ layout เป็น 2 คอลัม

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Import shared functions
import { waitForFonts, waitForImages } from "./InvoicePDFGenerator";

/**
 * สร้าง Voucher PDF
 * ✅ เพิ่ม: รองรับ serviceType สำหรับแสดงชื่อเอกสาร
 */
export const generateVoucherPDF = async (voucherData, voucherId) => {
  try {
    console.log("Starting Voucher PDF generation for voucher:", voucherId);
    console.log("Service type:", voucherData?.voucherData?.serviceType); // 🔍 Debug

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

    // ✅ แก้ไข: ส่ง serviceType ไปด้วย
    const serviceType = voucherData?.voucherData?.serviceType || "bus";
    const printContent = createVoucherHTML(voucherData, serviceType);
    printWrapper.innerHTML = printContent;

    await waitForFonts();
    await waitForImages(printWrapper);

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
      letterRendering: true,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: false,
    });

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);

    document.body.removeChild(container);

    const pdfBase64 = pdf.output("datauristring").split(",")[1];
    const fileSizeInMB = (pdfBase64.length * 0.75) / 1024 / 1024;

    if (fileSizeInMB > 10) {
      throw new Error(
        `ไฟล์ Voucher PDF ใหญ่เกิน 10MB (${fileSizeInMB.toFixed(2)} MB)`
      );
    }

    console.log("Voucher PDF generated successfully");
    return pdfBase64;
  } catch (error) {
    console.error("Error generating Voucher PDF:", error);
    throw new Error(`ไม่สามารถสร้าง Voucher PDF ได้: ${error.message}`);
  }
};

/**
 * สร้าง HTML สำหรับ Voucher
 * ✅ แสดง Company Header + ตาราง (ไม่มี Customer Info)
 */
const createVoucherHTML = (voucherData, serviceType = "bus") => {
  return `
    <div class="print-document">
      <style>${getVoucherStyles()}</style>
      <div class="print-page">
        ${renderCompanyHeader(voucherData)}
        ${renderVoucherContent(voucherData)}
        ${renderVoucherFooter(voucherData)}
      </div>
    </div>
  `;
};

/**
 * สร้าง Company Header (โลโก้ + ชื่อบริษัท + ชื่อเอกสาร)
 * ไม่มีข้อมูลลูกค้า
 */
const renderCompanyHeader = (voucherData) => {
  const vcNumber = voucherData.invoice?.vcNumber || "";

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
      <div class="print-document-title voucher-title">
        <div class="print-document-title-text">Voucher</div>
        <div class="print-document-title-text" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">${vcNumber}</div>
      </div>
    </div>
  `;
};

/**
 * สร้างเนื้อหาหลักสำหรับ Voucher (ไม่เปลี่ยน)
 */
const renderVoucherContent = (voucherData) => {
  const voucher = voucherData.voucherData || {};
  const passengers = voucherData.passengers || [];
  const pricing = voucherData.pricing || {};

  // ✅ แก้ไข: ดึง Pax จากฐานข้อมูลแทนนับจากจำนวนช่องชื่อผู้โดยสาร
  const calculateTotalPax = () => {
    // เช็คว่า pricing object มีข้อมูล pax หรือไม่ (รองรับค่า 0)
    if (
      pricing &&
      typeof pricing === "object" &&
      ("adult_pax" in pricing ||
        "child_pax" in pricing ||
        "infant_pax" in pricing)
    ) {
      const adultPax = parseInt(pricing.adult_pax || 0);
      const childPax = parseInt(pricing.child_pax || 0);
      const infantPax = parseInt(pricing.infant_pax || 0);
      return adultPax + childPax + infantPax;
    }
    // Fallback: นับจาก passengers array (กรณีไม่มี pricing)
    return passengers ? passengers.length : 0;
  };

  // จัดรูปแบบรายชื่อผู้โดยสาร - 6 บรรทัดเสมอ (แสดงได้ 5 ชื่อ)
  const formatPassengerNames = () => {
    const passengerSlots = [];
    const maxNames = 5;
    const totalRows = 6;

    // แสดงชื่อได้สูงสุด 5 ชื่อ
    for (let i = 0; i < maxNames; i++) {
      if (
        passengers[i] &&
        passengers[i].passenger_name &&
        passengers[i].passenger_name.trim()
      ) {
        passengerSlots.push(`${i + 1}. ${passengers[i].passenger_name.trim()}`);
      } else {
        passengerSlots.push(""); // บรรทัดว่าง
      }
    }

    // เพิ่มบรรทัดว่างที่ 6 เสมอ
    passengerSlots.push("");

    return passengerSlots;
  };

  const totalPax = calculateTotalPax();
  const passengerList = formatPassengerNames();

  // จัดรูปแบบ Remark ให้เป็น 2 บรรทัดสูงสุด พร้อม ...
  const formatRemark = (remark) => {
    if (!remark || remark.trim() === "") {
      return "";
    }

    // คำนวณจำนวนตัวอักษรต่อบรรทัด (โดยประมาณ 80 ตัวอักษรต่อบรรทัด)
    const charsPerLine = 80;
    const maxLines = 2;
    const maxLength = charsPerLine * maxLines;

    if (remark.length > maxLength) {
      // ตัดที่ตัวอักษรที่ maxLength - 3 เพื่อใส่ ...
      return remark.substring(0, maxLength - 3) + "...";
    }

    return remark;
  };

  const displayRemark = formatRemark(voucher.remark);

  // จัดรูปแบบ Total Pax - เพิ่ม "คน" ถ้ามีข้อมูล
  const displayTotalPax = totalPax > 0 ? `${totalPax} คน` : "";

  // จัดรูปแบบ Pickup Time - เพิ่ม "น." ถ้ามีข้อมูล
  const displayPickupTime = voucher.pickupTime
    ? `${voucher.pickupTime} น.`
    : "";

  return `
    <div class="print-items-table">
      <table class="print-table">
        <thead>
          <tr>
            <th class="print-th-detail">รายละเอียด</th>
          </tr>
        </thead>
        <tbody>
          <!-- Row 1: Name และ Total Pax (2 คอลัม fixed width) -->
          <tr>
            <td class="print-section-item" style="padding-top: 16px;">
              <table style="width: 100%; border-collapse: collapse; border: none;">
                <tr>
                  <td style="width: 55%; vertical-align: top; border: none; padding: 0; padding-right: 10px;">
                    <table style="width: 100%; border-collapse: collapse; border: none;">
                      <tr>
                        <td style="width: 110px; vertical-align: top; border: none; padding: 0;"><strong>Name :</strong></td>
                        <td style="vertical-align: top; border: none; padding: 0;">
                          ${passengerList
                            .map(
                              (line) =>
                                `<div style="line-height: 1.5; min-height: 20px;">${
                                  line || ""
                                }</div>`
                            )
                            .join("")}
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="width: 45%; vertical-align: top; border: none; padding: 0; padding-left: 30px;">
                    <table style="width: 100%; border-collapse: collapse; border: none;">
                      <tr>
                        <td style="width: 110px; vertical-align: top; border: none; padding: 0;"><strong>Total Pax :</strong></td>
                        <td style="vertical-align: top; border: none; padding: 0;">${displayTotalPax}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Row 2: Description (เต็มความกว้าง) -->
          <tr>
            <td class="print-section-item">
              <table style="width: 100%; border-collapse: collapse; border: none;">
                <tr>
                  <td style="width: 110px; vertical-align: top; border: none; padding: 0;"><strong>Description :</strong></td>
                  <td style="vertical-align: top; border: none; padding: 0;">${
                    voucher.description || ""
                  }</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Row 3: Date of Trip และ Pickup Time (2 คอลัม fixed width) -->
          <tr>
            <td class="print-section-item">
              <table style="width: 100%; border-collapse: collapse; border: none;">
                <tr>
                  <td style="width: 55%; vertical-align: top; border: none; padding: 0; padding-right: 10px;">
                    <table style="width: 100%; border-collapse: collapse; border: none;">
                      <tr>
                        <td style="width: 110px; vertical-align: top; border: none; padding: 0;"><strong>Date of Trip :</strong></td>
                        <td style="vertical-align: top; border: none; padding: 0;">${
                          voucher.tripDate || ""
                        }</td>
                      </tr>
                    </table>
                  </td>
                  <td style="width: 45%; vertical-align: top; border: none; padding: 0; padding-left: 30px;">
                    <table style="width: 100%; border-collapse: collapse; border: none;">
                      <tr>
                        <td style="width: 110px; vertical-align: top; border: none; padding: 0;"><strong>Pickup Time :</strong></td>
                        <td style="vertical-align: top; border: none; padding: 0;">${displayPickupTime}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Row 4: Hotel และ Room No (2 คอลัม fixed width) -->
          <tr>
            <td class="print-section-item">
              <table style="width: 100%; border-collapse: collapse; border: none;">
                <tr>
                  <td style="width: 55%; vertical-align: top; border: none; padding: 0; padding-right: 10px;">
                    <table style="width: 100%; border-collapse: collapse; border: none;">
                      <tr>
                        <td style="width: 110px; vertical-align: top; border: none; padding: 0;"><strong>Hotel :</strong></td>
                        <td style="vertical-align: top; border: none; padding: 0;">${
                          voucher.hotel || ""
                        }</td>
                      </tr>
                    </table>
                  </td>
                  <td style="width: 45%; vertical-align: top; border: none; padding: 0; padding-left: 30px;">
                    <table style="width: 100%; border-collapse: collapse; border: none;">
                      <tr>
                        <td style="width: 110px; vertical-align: top; border: none; padding: 0;"><strong>Room No :</strong></td>
                        <td style="vertical-align: top; border: none; padding: 0;">${
                          voucher.roomNo || ""
                        }</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Row 5: Service by และ Tel (2 คอลัม fixed width) -->
          <tr>
            <td class="print-section-item">
              <table style="width: 100%; border-collapse: collapse; border: none;">
                <tr>
                  <td style="width: 55%; vertical-align: top; border: none; padding: 0; padding-right: 10px;">
                    <table style="width: 100%; border-collapse: collapse; border: none;">
                      <tr>
                        <td style="width: 110px; vertical-align: top; border: none; padding: 0;"><strong>Service by :</strong></td>
                        <td style="vertical-align: top; border: none; padding: 0;">${
                          voucher.supplierName || ""
                        }</td>
                      </tr>
                    </table>
                  </td>
                  <td style="width: 45%; vertical-align: top; border: none; padding: 0; padding-left: 30px;">
                    <table style="width: 100%; border-collapse: collapse; border: none;">
                      <tr>
                        <td style="width: 110px; vertical-align: top; border: none; padding: 0;"><strong>Tel :</strong></td>
                        <td style="vertical-align: top; border: none; padding: 0;">${
                          voucher.supplierPhone || ""
                        }</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Row 6: Remark (เต็มความกว้าง, สูงสุด 2 บรรทัด) -->
          <tr>
            <td class="print-section-item" style="padding-bottom: 16px;">
              <table style="width: 100%; border-collapse: collapse; border: none;">
                <tr>
                  <td style="width: 110px; vertical-align: top; border: none; padding: 0;"><strong>Remark :</strong></td>
                  <td style="vertical-align: top; border: none; padding: 0; line-height: 1.5; word-wrap: break-word;">${displayRemark}</td>
                </tr>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
};

/**
 * สร้าง Footer สำหรับ Voucher (Non Refundable + Issued by + Thank You)
 */
const renderVoucherFooter = (voucherData) => {
  // Format วันที่แบบ DD/MM/YY (เหมือน Invoice)
  const getFormattedIssueDate = () => {
    // ลองหาจากหลายที่
    const issueDate =
      voucherData?.issueDate ||
      voucherData?.invoice?.issueDate ||
      voucherData?.invoice?.date;
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

  const updatedByName = voucherData?.updatedByName || null;
  const formattedDate = getFormattedIssueDate();

  return `
    <div class="print-bottom-section">
      <div class="non-refundable-box">
        <div>- Please present this voucher according to a document</div>
        <div>&nbsp;&nbsp;for the time to pick up or check in</div>
        <div>- This voucher is non refundable, Emergecy call 063-5153931</div>
      </div>
      <div class="print-signatures">
        <div class="print-signature">
          <div class="print-signature-title">Issued by</div>
          <div class="print-signature-area">
          ${
            updatedByName
              ? `<div style="font-weight: 500; font-size: 14px;">${updatedByName}</div>`
              : ""
          }
          </div>
          <div class="print-signature-date">Date: ${formattedDate}</div>
        </div>
      </div>
    </div>
  `;
};

/**
 * CSS Styles สำหรับ Voucher (ไม่เปลี่ยน)
 */
const getVoucherStyles = () => {
  return `
    * {
      font-family: 'Prompt', sans-serif !important;
      box-sizing: border-box;
    }
    
    .print-document {
      font-family: "Prompt", sans-serif;
      color: #333;
      line-height: 1.4;
      padding: 0;
      box-sizing: border-box;
    }
    
    .print-page {
      width: 210mm;
      height: auto;
      position: relative;
      background: white;
      margin: 0;
      padding: 15mm;
      box-sizing: border-box;
    }

    /* Header styles เหมือน Invoice/Receipt */
    .print-header {
      display: flex;
      justify-content: space-between;
      align-items: stretch;
      margin-bottom: 10px;
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
      font-size: 22px;
      font-weight: bold;
      color: white !important;
      margin: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Voucher: ย่อขนาดเฉพาะบรรทัดที่ 2 (VC Number) */
    .voucher-title .print-document-title-text:nth-child(2) {
      color: #777 !important;
      font-size: 16px !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-info-section {
      margin: 20px 0;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 12px;
      display: grid;
      grid-template-columns: 3fr 2fr;
      gap: 16px;
    }

    .print-info-row {
      display: grid;
      grid-template-columns: 140px 1fr;
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
      margin: 20px 0;
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
      width: 100%; 
    }

    .print-table td {
      padding: 4px;
      font-size: 14px;
      vertical-align: middle;
      line-height: 1.5;
    }

    .print-section-item {
      padding-left: 30px !important;
      vertical-align: middle !important;
    }

    .print-document-title-text {
      color: white !important;  /* บรรทัดแรก = สีขาว */
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .voucher-english-title {
      color: #777 !important;   /* บรรทัดสอง = สีเทา */
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Non Refundable Box */
    .non-refundable-box {
      border: 1px solid #333;
      padding: 5px 12px;
      text-align: left;
      font-size: 13px;
      color: #333;
      border-radius: 4px;
      width: fit-content;
      align-self: flex-start;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .non-refundable-box div {
      margin: 1px 0;
    }

    /* Thank You Text */
    .print-thank-you {
      text-align: center;
      font-size: 14px;
      font-style: italic;
      margin-top: 60px;
      color: #333;
    }

    /* Bottom Section - แสดง Non Refundable ซ้าย + Signature ขวา */
    .print-bottom-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 30px;
      gap: 24px;
    }

    /* Signature area - no logo */
    .print-signature-area {
      height: auto;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 1px solid #333;
      width: fit-content;
      margin-left: auto;
      margin-right: auto;
      padding-bottom: 7px;
      min-width: 80px;
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

    .print-signature-date {
      font-size: 12px;
      color: #333;
      margin-top: 4px;
    }

    .print-signatures {
      display: flex;
      gap: 32px;
    }
  `;
};

/**
 * สร้าง Voucher PDF พร้อมจัดการ error
 */
export async function generateVoucherPDFSafely(voucherData, voucherId) {
  try {
    const pdfBase64 = await generateVoucherPDF(voucherData, voucherId);

    return {
      success: true,
      pdfBase64: pdfBase64,
      message: "สร้าง Voucher PDF สำเร็จ",
    };
  } catch (error) {
    console.error("Voucher PDF generation failed:", error);

    return {
      success: false,
      error: error.message,
      message: "ไม่สามารถสร้าง Voucher PDF ได้",
    };
  }
}
