// src/components/documents/email/EmailService.js
import { apiClient } from "../../../services/apiClient";

/**
 * ส่ง email ผ่าน PHP Email Service
 * @param {Object} emailData - ข้อมูลอีเมล
 * @returns {Promise<Object>} - ผลลัพธ์การส่ง
 */
export async function sendDocumentEmail(emailData) {
  try {
    console.log("Sending email via PHP service:", emailData);

    // Validate required fields
    if (!emailData.to?.trim()) {
      throw new Error("ที่อยู่อีเมลผู้รับว่างเปล่า");
    }

    if (!isValidEmail(emailData.to)) {
      throw new Error("รูปแบบที่อยู่อีเมลไม่ถูกต้อง");
    }

    // เตรียมข้อมูลส่งไป PHP
    const payload = {
      to: emailData.to.trim(),
      subject:
        emailData.subject || generateDefaultSubject(emailData.documentType),
      message:
        emailData.message ||
        generateDefaultMessage(emailData.documentType, emailData.documentData),
      documentType: emailData.documentType || "invoice",
      documentNumber: getDocumentNumber(emailData.documentData),
      pdfBase64: emailData.pdfBase64 || null,
      // ✅ เพิ่มข้อมูลสำหรับ Activity Log
      documentId: emailData.documentId || null,
      referenceNumber: emailData.referenceNumber || null,
      userId: emailData.userId || null,
    };

    // ส่งผ่าน API Gateway
    const response = await apiClient.post("/gateway.php", {
      action: "sendDocumentEmail",
      ...payload,
    });

    if (!response.success) {
      throw new Error(response.error || "ส่งอีเมลไม่สำเร็จ");
    }

    return {
      success: true,
      message: {
        title: "ส่งอีเมลสำเร็จ!",
        details: `ถึง: ${emailData.to}`,
        time: `เมื่อ: ${new Date().toLocaleString("th-TH")}`,
      },
      result: response.data,
    };
  } catch (error) {
    console.error("Email sending failed:", error);

    return {
      success: false,
      message: error.message,
      error: error,
    };
  }
}

/**
 * ส่ง email หลาย receipts พร้อมกัน (Multiple PDFs)
 * @param {Object} emailData - ข้อมูลอีเมล
 * @param {Array} emailData.attachments - Array ของ PDF files
 * @param {Array} emailData.receiptIds - Array ของ receipt IDs
 * @returns {Promise<Object>} - ผลลัพธ์การส่ง
 */
export async function sendBulkReceiptEmail(emailData) {
  try {
    console.log("Sending bulk receipt email:", emailData);

    // Validate required fields
    if (!emailData.to?.trim()) {
      throw new Error("ที่อยู่อีเมลผู้รับว่างเปล่า");
    }

    if (!isValidEmail(emailData.to)) {
      throw new Error("รูปแบบที่อยู่อีเมลไม่ถูกต้อง");
    }

    if (!emailData.attachments || emailData.attachments.length === 0) {
      throw new Error("ไม่มีไฟล์ PDF ที่จะส่ง");
    }

    // เตรียมข้อมูลส่งไป PHP
    const payload = {
      to: emailData.to.trim(),
      subject: emailData.subject || "ใบเสร็จรับเงินหลายฉบับ จาก บริษัท สมุย ลุค จำกัด",
      message: emailData.message || "กรุณาตรวจสอบไฟล์แนบ",
      attachments: emailData.attachments, // Array of { receiptId, receiptNumber, pdfBase64, filename }
      receiptIds: emailData.receiptIds, // Array of receipt IDs to mark as sent
    };

    // ส่งผ่าน API Gateway
    const response = await apiClient.post("/gateway.php", {
      action: "sendBulkReceiptEmail",
      ...payload,
    });

    if (!response.success) {
      throw new Error(response.error || "ส่งอีเมลไม่สำเร็จ");
    }

    return {
      success: true,
      message: `ส่งอีเมลสำเร็จ! (${emailData.attachments.length} ไฟล์) ไปที่ ${emailData.to}`,
      result: response.data,
    };
  } catch (error) {
    console.error("Bulk email sending failed:", error);

    return {
      success: false,
      message: error.message,
      error: error,
    };
  }
}

/**
 * ทดสอบการเชื่อมต่อ email
 */
export async function testEmailConnection() {
  try {
    const response = await apiClient.post("/gateway.php", {
      action: "testEmailConnection",
    });

    return response;
  } catch (error) {
    console.error("Email connection test failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * ตรวจสอบความถูกต้องของที่อยู่อีเมล (รองรับหลายอีเมลคั่นด้วย comma)
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // แยกอีเมลด้วย comma และตรวจสอบแต่ละอีเมล
  const emails = email.split(',').map(e => e.trim()).filter(e => e.length > 0);

  if (emails.length === 0) {
    return false;
  }

  // ตรวจสอบว่าทุกอีเมลถูกต้อง
  return emails.every(e => emailRegex.test(e));
}

/**
 * สร้างหัวข้ออีเมลเริ่มต้น
 */
function generateDefaultSubject(documentType) {
  const subjects = {
    invoice: "Invoice บริษัท สมุย ลุค จำกัด",
    receipt: "Receipt บริษัท สมุย ลุค จำกัด",
    voucher: "Voucher บริษัท สมุย ลุค จำกัด",
    deposit: "Deposit บริษัท สมุย ลุค จำกัด",
  };

  return subjects[documentType] || "เอกสารจาก บริษัท สมุย ลุค จำกัด";
}

/**
 * สร้างเนื้อหาอีเมลเริ่มต้น
 */
/**
 * สร้างเนื้อหาอีเมลเริ่มต้น
 */
function generateDefaultMessage(documentType, documentData) {
  if (!documentData) return "";

  const documentNames = {
    invoice: "ใบแจ้งหนี้",
    receipt: "Receipt",
    voucher: "Voucher",
    deposit: "ใบมัดจำ", // ⭐ เพิ่มบรรทัดนี้
  };

  const docName = documentNames[documentType] || "เอกสาร";
  const customerName = documentData.customer?.name || "ลูกค้า";
  const docNumber = getDocumentNumber(documentData);

  // ⭐ เพิ่ม case พิเศษสำหรับ Deposit
  if (documentType === "deposit") {
    return `เรียน ${customerName}

บริษัท สมุย ลุค จำกัด ขอส่ง${docName} ดังรายละเอียดต่อไปนี้:

เลขที่: ${docNumber}
วันที่: ${documentData.invoice?.date || ""}

รายละเอียด:
- สายการบิน: ${documentData.flights?.supplierName || "-"}
- เส้นทาง: ${documentData.flights?.routeDisplay || "-"}
- จำนวนเงินรวม: ฿${formatCurrency(documentData.summary?.total || 0)}

${
  documentData.depositInfo?.depositDueDate
    ? `
กรุณาชำระเงินมัดจำ ฿${formatCurrency(
        documentData.depositInfo?.depositAmount || 0
      )} ภายในวันที่ ${documentData.depositInfo.depositDueDate}
`
    : ""
}

${
  documentData.depositInfo?.fullPaymentDueDate
    ? `
กรุณาชำระเงินทั้งหมด ฿${formatCurrency(
        documentData.depositInfo?.fullPaymentAmount || 0
      )} ภายในวันที่ ${documentData.depositInfo.fullPaymentDueDate}
`
    : ""
}

${
  documentData.depositInfo?.passengerInfoDueDate
    ? `
*** กรุณาแจ้งชื่อผู้โดยสารก่อนวันที่ ${documentData.depositInfo.passengerInfoDueDate} ***
`
    : ""
}

กรุณาตรวจสอบรายละเอียดในไฟล์แนบ

หากมีข้อสงสัยกรุณาติดต่อกลับ

ขอบคุณที่ใช้บริการ
บริษัท สมุย ลุค จำกัด
โทร 077-950550
อีเมล samuilook@yahoo.com, usmlook@ksc.th.com`;
  }

  // Default message สำหรับ invoice, receipt, voucher
  return `เรียน ${customerName}

บริษัท สมุย ลุค จำกัด ขอส่ง${docName} ดังรายละเอียดต่อไปนี้:

เลขที่: ${docNumber}
วันที่: ${documentData.invoice?.date || ""}

กรุณาตรวจสอบรายละเอียดในไฟล์แนบ

หากมีข้อสงสัยกรุณาติดต่อกลับ

ขอบคุณที่ใช้บริการ
บริษัท สมุย ลุค จำกัด
โทร 077-950550
อีเมล samuilook@yahoo.com, usmlook@ksc.th.com`;
}

function getServiceTypeLabel(serviceType) {
  const labels = { bus: "รถโดยสาร", boat: "เรือ", tour: "ทัวร์" };
  return labels[serviceType] || serviceType || "-";
}

/**
 * ดึงเลขที่เอกสาร
 */
function getDocumentNumber(documentData) {
  if (!documentData?.invoice) return "";

  return (
    documentData.invoice.dpNumber ||
    documentData.invoice.rcNumber ||
    documentData.invoice.poNumber ||
    documentData.invoice.vcNumber ||
    ""
  );
}

/**
 * จัดรูปแบบตัวเลขเป็นสกุลเงิน
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "0";
  return Math.floor(parseFloat(amount)).toLocaleString("th-TH");
}
