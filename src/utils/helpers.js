// src/utils/helpers.js - Migrated to API Gateway
// เปลี่ยนจาก Supabase calls เป็น API Gateway calls
// รักษา function signatures และ return formats เหมือนเดิม

// 🔄 MIGRATION PHASE: แปลงจาก Supabase เป็น API Gateway
// ✅ ACTIVE: ใช้ API Gateway แล้ว
// import { supabase } from "../services/supabase"; // 🔄 Rollback: uncomment หากมีปัญหา

// Import reference service ที่ migrate ไปแล้ว
import { generateReferenceNumber as generateRefFromService } from "../services/referencesService";

/**
 * แปลงวันที่เป็นรูปแบบ YYYY-MM-DD โดยใช้ local timezone
 * แก้ปัญหา UTC timezone ที่ทำให้วันที่ย้อนกลับ 1 วัน
 * @param {Date} date - วันที่ที่ต้องการแปลง (ถ้าไม่ระบุจะใช้วันที่ปัจจุบัน)
 * @returns {string} - วันที่ในรูปแบบ YYYY-MM-DD
 */
export const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * แปลงที่อยู่ลูกค้าจากหลายบรรทัดเป็นบรรทัดเดียว
 * รองรับทั้งรูปแบบใหม่ (address_line1, 2, 3) และรูปแบบเก่า (address)
 * @param {Object} customer - ข้อมูลลูกค้า
 * @returns {string} - ที่อยู่ที่รวมแล้ว
 */
export const formatCustomerAddress = (customer) => {
  if (!customer) return "";

  // ลองใช้รูปแบบใหม่ก่อน (address_line1, 2, 3)
  const addressParts = [
    customer.address_line1,
    customer.address_line2,
    customer.address_line3,
  ].filter((part) => part && part.trim() !== "");

  if (addressParts.length > 0) {
    return addressParts.join(" ");
  }

  // Backward compatibility - ใช้แบบเก่าสำหรับข้อมูลที่ยังไม่ได้ migrate
  return customer.address || customer.full_address || "";
};

/**
 * สร้างเลขอ้างอิงสำหรับเอกสาร
 * 🔄 MIGRATED: ใช้ referencesService แทน direct Supabase call
 * @param {string} prefix - คำนำหน้าเลขอ้างอิง (เช่น FT สำหรับ Flight Ticket)
 * @returns {string} - เลขอ้างอิงที่สร้างขึ้น
 */
export const generateReferenceNumber = async (prefix = "FT") => {
  try {
    // 🔄 เปลี่ยนจาก direct Supabase call เป็นการใช้ referencesService
    return await generateRefFromService(
      "bookings_ticket",
      prefix,
      "reference_number"
    );
  } catch (error) {
    console.error("Error generating reference number:", error);
    // Fallback: สร้างเลขอ้างอิงแบบง่ายเพื่อให้ระบบยังทำงานได้
    const year = new Date().getFullYear().toString().slice(-2);
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${year}-1-${String(randomPart).padStart(4, "0")}`;
  }
};

/**
 * ✅ เก็บฟังก์ชันนี้ไว้ - ไม่เกี่ยวกับ timezone
 * แปลงวันที่เป็นรูปแบบ ddMMMyy
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
 * แสดงวันที่เวลาในรูปแบบไทย (dd/mm/yyyy HH:MM)
 * ✅ ลบการแปลง timezone ออก - ใช้ข้อมูลตรงๆ จากฐานข้อมูล
 * @param {string|Date} dateTime - วันที่และเวลาที่ต้องการแปลง
 * @returns {string} - วันที่และเวลาในรูปแบบ dd/mm/yyyy HH:MM
 */
export const displayThaiDateTime = (dateTime) => {
  if (!dateTime) return "";

  // ✅ ใช้ข้อมูลตรงๆ ไม่แปลง timezone
  const date = new Date(dateTime);

  // ✅ แสดงผลตามรูปแบบไทย
  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false, // ใช้รูปแบบ 24 ชั่วโมง
  });
};

/**
 * แปลงตัวเลขเป็นรูปแบบเงิน
 * @param {number|string} amount - จำนวนเงิน
 * @param {string} locale - รูปแบบภาษา (default: th-TH)
 * @param {string} currency - สกุลเงิน (default: THB)
 * @returns {string} - จำนวนเงินในรูปแบบเงิน
 */
export const formatCurrency = (amount, locale = "th-TH", currency = "THB") => {
  if (amount === null || amount === undefined || isNaN(amount)) return "0.00";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * แปลงข้อความเป็นตัวพิมพ์ใหญ่เฉพาะตัวแรก
 * @param {string} str - ข้อความที่ต้องการแปลง
 * @returns {string} - ข้อความที่แปลงแล้ว
 */
export const capitalizeFirstLetter = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * หาความแตกต่างระหว่างวันที่
 * @param {string|Date} dateStart - วันที่เริ่มต้น
 * @param {string|Date} dateEnd - วันที่สิ้นสุด
 * @returns {number} - จำนวนวันที่แตกต่าง
 */
export const getDaysDifference = (dateStart, dateEnd) => {
  if (!dateStart || !dateEnd) return 0;

  const start = new Date(dateStart);
  const end = new Date(dateEnd);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

/**
 * แปลงวันที่เป็นรูปแบบไทย (dd/mm/yyyy) โดยเปลี่ยน ค.ศ. เป็น พ.ศ.
 * @param {string|Date} date - วันที่ที่ต้องการแปลง
 * @returns {string} - วันที่ในรูปแบบไทย
 */
export const formatThaiDate = (date) => {
  if (!date) return "";
  if (typeof date === "string") {
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    date = d;
  }

  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const yearThai = date.getFullYear() + 543; // แปลง ค.ศ. เป็น พ.ศ. โดยบวก 543

  return `${day}/${month}/${yearThai}`;
};

/**
 * แปลงข้อมูลเป็นตัวพิมพ์ใหญ่
 * @param {Object} data - ข้อมูลที่ต้องการแปลง
 * @param {Array} excludeFields - ฟิลด์ที่ไม่ต้องแปลง
 * @returns {Object} - ข้อมูลที่แปลงแล้ว
 */
export const transformToUpperCase = (data, excludeFields = []) => {
  if (!data || typeof data !== "object") return data;

  // ฟิลด์ที่ไม่ต้องแปลงเป็นตัวใหญ่
  const defaultExcludeFields = [
    "email",
    "password",
    "phone",
    "username",
    "fullname",
    "password_hash",
    "created_at",
    "updated_at",
    "id",
    "active",
    "credit_days",
    "age",
    "quantity",
    "net_price",
    "sale_price",
    "total_amount",
    "pax",
    "total",
    "vat_percent",
    "vat_amount",
    "grand_total",
    "subtotal_before_vat",
    "pricing_total",
    "extras_total",
    "issue_date",
    "due_date",
    "departure_time",
    "arrival_time",
    "date",
    "po_generated_at",
    "cancelled_at",
    "last_login",
  ];

  const allExcludeFields = [...defaultExcludeFields, ...excludeFields];
  const transformed = { ...data };

  Object.keys(transformed).forEach((key) => {
    const value = transformed[key];

    // ข้ามฟิลด์ที่ไม่ต้องแปลง
    if (allExcludeFields.includes(key)) return;

    // แปลง string เป็นตัวใหญ่
    if (typeof value === "string" && value.trim()) {
      transformed[key] = value.toUpperCase();
    }
    // แปลง object/array ซ้อน (recursive)
    else if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        transformed[key] = value.map((item) =>
          transformToUpperCase(item, excludeFields)
        );
      } else {
        transformed[key] = transformToUpperCase(value, excludeFields);
      }
    }
  });

  return transformed;
};

/**
 * ✅ เพิ่มฟังก์ชันใหม่สำหรับ format วันที่อย่างเดียว (ไม่มีเวลา)
 */
export const formatDateOnly = (date) => {
  if (!date) return "";
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return "-";

  return dateObj.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * แปลงเวลาให้เป็น UTC+7 (เวลาประเทศไทย)
 * @param {Date} date - วันที่ที่ต้องการแปลง
 * @param {boolean} adjustTimezone - ต้องการปรับเวลาตาม timezone หรือไม่ (default: true)
 * @returns {string} - วันที่ในรูปแบบ ISO string ที่ปรับเป็น UTC+7 แล้ว
 */
export const toThaiTimeZone = (date, adjustTimezone = true) => {
  if (!date) return "";

  // Clone วันที่เพื่อไม่ให้แก้ไขต้นฉบับ
  const newDate = new Date(date);

  if (adjustTimezone) {
    // ปรับเวลาให้เป็น UTC+7
    const thaiOffset = 7 * 60 * 60 * 1000; // 7 ชั่วโมงในมิลลิวินาที
    return new Date(newDate.getTime() + thaiOffset).toISOString();
  } else {
    // เมื่อต้องการส่งวันที่ไปยัง Supabase ตามเวลาที่กำหนด
    // ต้องคำนวณ offset ระหว่างเวลาท้องถิ่นกับ UTC แล้วบวกกลับเพื่อชดเชย
    const localOffset = newDate.getTimezoneOffset() * 60 * 1000; // offset ในมิลลิวินาที
    const thaiOffset = -7 * 60 * 60 * 1000; // UTC+7 = -7 ชั่วโมง offset จาก UTC

    // ปรับเวลาจากเวลาท้องถิ่นเป็น UTC+7
    return new Date(newDate.getTime() + localOffset + thaiOffset).toISOString();
  }
};

export const formatShortReference = (refNumber) => {
  if (!refNumber) return "-";
  const parts = refNumber.split("-");
  if (parts.length === 4) {
    return `${parts[0]}-${parts[3]}`;
  }
  return refNumber;
};

export * from "./customerOverrideHelpers";
