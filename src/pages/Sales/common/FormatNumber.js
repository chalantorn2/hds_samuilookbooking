/**
 * formatNumber - แปลงตัวเลขให้มี comma และรองรับทศนิยม
 * @param {string|number} value - ค่าที่ต้องการ format
 * @returns {string} - ตัวเลขที่มี comma
 */
export const formatNumber = (value) => {
  if (!value && value !== 0) return "";

  // แปลงเป็น string และลบ comma เก่าออก
  const str = String(value).replace(/,/g, "");

  // ตรวจสอบว่ามีจุดทศนิยมหรือไม่
  const parts = str.split(".");

  // Format ส่วนจำนวนเต็ม
  const integerPart = parseInt(parts[0] || 0).toLocaleString("en-US");

  // ถ้าไม่มีทศนิยม ให้คืนค่าแค่จำนวนเต็ม
  if (parts.length === 1) {
    return integerPart;
  }

  // ถ้ามีทศนิยม ให้เก็บไว้
  const decimalPart = parts[1] || "";

  return `${integerPart}.${decimalPart}`;
};

/**
 * parseInput - ลบ comma ออกจาก string เพื่อให้เป็นตัวเลขสะอาด
 * @param {string} value - string ที่ต้องการลบ comma
 * @returns {string} - string ที่ไม่มี comma
 */
export const parseInput = (value) => {
  if (!value) return "";
  return value.replace(/,/g, "");
};

/**
 * cleanupNumber - ทำความสะอาดตัวเลขเมื่อ blur (เอา .00 ออก)
 * @param {string} value - ค่าที่ต้องการ cleanup
 * @returns {string} - ตัวเลขที่สะอาด
 */
export const cleanupNumber = (value) => {
  if (!value && value !== 0) return "";

  const num = parseFloat(String(value).replace(/,/g, ""));

  if (isNaN(num)) return "";

  // ถ้าเป็นจำนวนเต็ม (เช่น 1000.00) ให้แสดงแบบไม่มีทศนิยม
  if (num % 1 === 0) {
    return num.toLocaleString("en-US");
  }

  // ถ้ามีทศนิยมจริงๆ ให้เก็บไว้ (ตัดทศนิยมเกินออก)
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 10, // รองรับทศนิยมได้เยอะ
  });
};

/**
 * validateNumberInput - ป้องกันการพิมพ์ผิดรูปแบบ
 * @param {string} value - ค่าที่ user พิมพ์
 * @returns {boolean} - true ถ้าถูกต้อง
 */
export const validateNumberInput = (value) => {
  if (!value) return true;

  // อนุญาตแค่ตัวเลข, จุด, และ comma
  const cleanValue = value.replace(/,/g, "");

  // ตรวจสอบว่ามีจุดเกิน 1 ตัวหรือไม่
  const dotCount = (cleanValue.match(/\./g) || []).length;
  if (dotCount > 1) return false;

  // ตรวจสอบว่าเป็นรูปแบบตัวเลขที่ถูกต้อง
  return /^-?\d*\.?\d*$/.test(cleanValue);
};
