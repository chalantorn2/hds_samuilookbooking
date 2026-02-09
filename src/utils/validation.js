// src/utils/validation.js

/**
 * ตรวจสอบความถูกต้องของข้อมูลตั๋วเครื่องบิน
 * @param {Object} data - ข้อมูลตั๋วเครื่องบินที่ต้องการตรวจสอบ
 * @returns {Object} - ผลการตรวจสอบและข้อผิดพลาด
 */
export const validateFlightTicket = (data) => {
  const errors = {};

  // ✅ ตรวจสอบชื่อลูกค้า - บังคับกรอก
  if (!data.customer?.trim()) {
    errors.customer = "กรุณาระบุชื่อลูกค้า";
  }

  // ✅ ตรวจสอบรายการผู้โดยสาร - บังคับกรอก
  if (!data.passengers || data.passengers.length === 0) {
    errors.passengers = "กรุณาระบุข้อมูลผู้โดยสารอย่างน้อย 1 คน";
  } else {
    const passengerErrors = [];
    data.passengers.forEach((passenger, index) => {
      const error = {};
      if (!passenger.name?.trim()) {
        error.name = "กรุณาระบุชื่อผู้โดยสาร";
      }
      if (Object.keys(error).length > 0) {
        passengerErrors[index] = error;
      }
    });
    if (passengerErrors.length > 0) {
      errors.passengers = passengerErrors;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * ฟังก์ชันช่วยในการตรวจสอบความถูกต้องของอีเมล
 * @param {string} email - อีเมลที่ต้องการตรวจสอบ
 * @returns {boolean} - ผลการตรวจสอบ
 */
export const isValidEmail = (email) => {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

/**
 * ฟังก์ชันช่วยในการตรวจสอบความถูกต้องของเบอร์โทรศัพท์
 * @param {string} phone - เบอร์โทรศัพท์ที่ต้องการตรวจสอบ
 * @returns {boolean} - ผลการตรวจสอบ
 */
export const isValidPhone = (phone) => {
  const re = /^[0-9]{9,10}$/;
  return re.test(String(phone).replace(/[^0-9]/g, ""));
};

/**
 * ตรวจสอบการกรอกข้อมูลจำเป็นในฟอร์ม
 * @param {Object} data - ข้อมูลฟอร์ม
 * @param {Array} requiredFields - รายการฟิลด์ที่จำเป็น
 * @returns {Object} - ผลการตรวจสอบและข้อผิดพลาด
 */
export const validateRequired = (data, requiredFields) => {
  const errors = {};

  requiredFields.forEach((field) => {
    if (!data[field]?.toString().trim()) {
      errors[field] = `กรุณากรอกข้อมูล ${field}`;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
