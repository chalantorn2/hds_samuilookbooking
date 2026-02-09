// src/utils/passwordUtils.js

/**
 * ตรวจสอบความถูกต้องของรหัสผ่าน
 * @param {string} password รหัสผ่านที่ต้องการตรวจสอบ
 * @param {string} confirmPassword รหัสผ่านยืนยัน
 * @param {boolean} isRequired บังคับให้กรอกรหัสผ่านหรือไม่
 * @returns {Object} ผลการตรวจสอบและข้อผิดพลาด
 */
export const validatePassword = (
  password,
  confirmPassword,
  isRequired = true
) => {
  const errors = {};

  // ถ้าไม่บังคับใส่รหัสผ่านและไม่มีรหัสผ่าน ให้ถือว่าผ่าน
  if (!isRequired && (!password || password.trim() === "")) {
    return { isValid: true, errors: {} };
  }

  // ตรวจสอบว่ามีรหัสผ่านหรือไม่
  if (!password) {
    errors.password = "กรุณากรอกรหัสผ่าน";
  } else if (password.length < 6) {
    // รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร
    errors.password = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
  } else if (password.length > 100) {
    // รหัสผ่านต้องไม่เกิน 100 ตัวอักษร
    errors.password = "รหัสผ่านต้องไม่เกิน 100 ตัวอักษร";
  }

  // ตรวจสอบว่ามีรหัสผ่านยืนยันตรงกันหรือไม่
  if (!confirmPassword) {
    errors.confirmPassword = "กรุณายืนยันรหัสผ่าน";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "รหัสผ่านไม่ตรงกัน";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * สร้างรหัสผ่านแบบสุ่ม
 * @param {number} length ความยาวของรหัสผ่าน
 * @returns {string} รหัสผ่านที่สร้างขึ้น
 */
export const generateRandomPassword = (length = 10) => {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+";
  let password = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }

  return password;
};
