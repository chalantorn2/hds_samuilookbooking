// services/referencesService.js - Migrated to API Gateway
// เปลี่ยนจาก Supabase calls เป็น API Gateway calls
// รักษา function signatures และ return formats เหมือนเดิม

import { apiClient } from "./apiClient";
// 🔄 MIGRATION PHASE: แปลงจาก Supabase เป็น API Gateway
// ✅ ACTIVE: ใช้ API Gateway แล้ว
// import { supabase } from "./supabase"; // 🔄 Rollback: uncomment หากมีปัญหา

/**
 * สร้างเลขอ้างอิงสำหรับเอกสาร
 * @param {string} table - ชื่อตารางในฐานข้อมูล
 * @param {string} prefix - คำนำหน้าเลขอ้างอิง (เช่น FT สำหรับ Flight Ticket)
 * @param {string} column - ชื่อคอลัมน์ที่เก็บเลขอ้างอิง (default: reference_number)
 * @returns {Promise<string>} - เลขอ้างอิงที่สร้างขึ้น
 */
export const generateReferenceNumber = async (
  table,
  prefix = "FT",
  column = "reference_number"
) => {
  try {
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.get("/gateway.php", {
      action: "generateReferenceNumber",
      table: table,
      prefix: prefix,
      column: column,
    });

    if (!response.success) {
      console.error("Error generating reference number:", response.error);
      // Fallback: สร้างเลขอ้างอิงแบบง่าย
      const year = new Date().getFullYear().toString().slice(-2);
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      return `${prefix}-${year}-1-${randomPart.toString().padStart(4, "0")}`;
    }

    return response.data; // API Gateway จะส่ง reference number กลับมา
  } catch (error) {
    console.error("Error generating reference number:", error);
    // Fallback: สร้างเลขอ้างอิงแบบง่าย
    const year = new Date().getFullYear().toString().slice(-2);
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${year}-1-${randomPart.toString().padStart(4, "0")}`;
  }
};

/**
 * สร้าง PO Number สำหรับ bookings_ticket
 * @returns {Promise<string>} - PO Number ที่สร้างขึ้น
 */
export const generatePONumber = async () => {
  try {
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.get("/gateway.php", {
      action: "generatePONumber",
    });

    if (!response.success) {
      console.error("Error generating PO number:", response.error);
      // Fallback: ใช้ generateReferenceNumber
      return await generateReferenceNumber(
        "bookings_ticket",
        "PO",
        "po_number"
      );
    }

    return response.data; // API Gateway จะส่ง PO number กลับมา
  } catch (error) {
    console.error("Error generating PO number:", error);
    // Fallback: ใช้ generateReferenceNumber
    return await generateReferenceNumber("bookings_ticket", "PO", "po_number");
  }
};

/**
 * แปลงวันที่เป็นรูปแบบ ddMMMyy
 * @param {string|Date} date - วันที่ที่ต้องการแปลง
 * @returns {string} - วันที่ในรูปแบบ ddMMMyy
 */
export const formatDate = (date) => {
  if (!date) return "";
  if (typeof date === "string") {
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    date = d;
  }

  const day = date.getDate().toString().padStart(2, "0");
  const month = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ][date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);

  return `${day}${month}${year}`;
};

/**
 * สร้าง RC Number สำหรับ bookings_ticket
 * @returns {Promise<string>} - RC Number ที่สร้างขึ้น
 */
export const generateRCNumber = async () => {
  try {
    const response = await apiClient.get("/gateway.php", {
      action: "generateRCNumber",
    });

    if (!response.success) {
      console.error("Error generating RC number:", response.error);
      return await generateReferenceNumber(
        "bookings_ticket",
        "RC",
        "rc_number"
      );
    }

    return response.data;
  } catch (error) {
    console.error("Error generating RC number:", error);
    return await generateReferenceNumber("bookings_ticket", "RC", "rc_number");
  }
};

/**
 * สร้าง RC Number สำหรับ bookings_ticket พร้อม selection data
 * @param {number} ticketId - ID ของ ticket
 * @param {Object} selectionData - ข้อมูลที่เลือกจาก ReceiptSelectionModal
 * @returns {Promise<string>} - RC Number ที่สร้างขึ้น
 */
export const generateRCForTicket = async (
  ticketId,
  selectionData = null,
  allowOverwrite = false
) => {
  try {
    const response = await apiClient.post("/gateway.php", {
      action: "generateRCForTicket",
      ticketId: ticketId,
      selectionData: selectionData,
      allowOverwrite: allowOverwrite, // ⭐ เพิ่มบรรทัดนี้
    });

    if (!response.success) {
      console.error("Error generating RC number:", response.error);
      return {
        success: false,
        error: response.error,
        rcNumber: null,
      };
    }

    return {
      success: true,
      rcNumber: response.data.rcNumber,
      isNew: response.data.isNew,
      message: response.data.message,
      selectionDataSaved: response.data.selectionDataSaved || false,
    };
  } catch (error) {
    console.error("Error generating RC number:", error);
    return {
      success: false,
      error: error.message,
      rcNumber: null,
    };
  }
};
