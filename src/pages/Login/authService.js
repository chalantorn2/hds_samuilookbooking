// services/authService.js - Migrated to API Gateway
// เปลี่ยนจาก Supabase calls เป็น API Gateway calls
// รักษา function signatures และ return formats เหมือนเดิม

import { apiClient } from "../../services/apiClient";
// 🔄 MIGRATION PHASE: แปลงจาก Supabase เป็น API Gateway
// ✅ ACTIVE: ใช้ API Gateway แล้ว
// import { supabase } from "../../services/supabase"; // 🔄 Rollback: uncomment หากมีปัญหา

/**
 * ดึงข้อมูลผู้ใช้ทั้งหมด
 * @returns {Promise<{data: Array, error: Object}>} ข้อมูลผู้ใช้หรือข้อผิดพลาด
 */
export const fetchAllUsers = async () => {
  try {
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.get("/gateway.php", {
      action: "getUsers",
      search: "", // ค้นหาทั้งหมด
      limit: 1000, // เพิ่ม limit เพื่อให้ได้ผู้ใช้ทั้งหมด
    });

    if (!response.success) {
      console.error("Error fetching users:", response.error);
      return { data: null, error: response.error };
    }

    // Sort by username ตาม logic เดิม
    const sortedData = (response.data || []).sort((a, b) => {
      const usernameA = a.username || "";
      const usernameB = b.username || "";
      return usernameA.localeCompare(usernameB);
    });

    return { data: sortedData, error: null };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { data: null, error: error.message };
  }
};

/**
 * สร้างผู้ใช้ใหม่
 * @param {Object} userData ข้อมูลผู้ใช้
 * @returns {Promise<{success: boolean, error: string}>} สถานะการสร้างผู้ใช้
 */
export const createUser = async (userData) => {
  try {
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.post("/gateway.php", {
      action: "createUser",
      data: {
        username: userData.username,
        password: userData.password, // API Gateway จะจัดการ plain text storage
        fullname: userData.fullname,
        email: userData.email,
        role: userData.role,
        active: userData.active,
      },
    });

    if (!response.success) {
      // ตรวจสอบข้อความ error จาก API Gateway
      if (response.error && response.error.includes("มีอยู่ในระบบแล้ว")) {
        return {
          success: false,
          error: "ชื่อผู้ใช้หรืออีเมลนี้มีอยู่ในระบบแล้ว",
        };
      }
      return { success: false, error: response.error };
    }

    return { success: true };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, error: error.message };
  }
};

/**
 * อัปเดตข้อมูลผู้ใช้
 * @param {string} userId ID ของผู้ใช้
 * @param {Object} userData ข้อมูลผู้ใช้ที่ต้องการอัปเดต
 * @returns {Promise<{success: boolean, error: string}>} สถานะการอัปเดต
 */
export const updateUser = async (userId, userData) => {
  try {
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.put("/gateway.php", {
      action: "updateUser",
      id: userId,
      data: {
        fullname: userData.fullname,
        email: userData.email,
        role: userData.role,
        active: userData.active,
      },
    });

    if (!response.success) {
      // ตรวจสอบข้อความ error จาก API Gateway
      if (response.error && response.error.includes("มีอยู่ในระบบแล้ว")) {
        return { success: false, error: "อีเมลนี้มีอยู่ในระบบแล้ว" };
      }
      return { success: false, error: response.error };
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, error: error.message };
  }
};

/**
 * เปลี่ยนรหัสผ่านผู้ใช้
 * @param {string} userId ID ของผู้ใช้
 * @param {string} newPassword รหัสผ่านใหม่
 * @returns {Promise<{success: boolean, error: string}>} สถานะการเปลี่ยนรหัสผ่าน
 */
export const changePassword = async (userId, newPassword) => {
  try {
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.post("/gateway.php", {
      action: "changePassword",
      userId: userId,
      newPassword: newPassword,
    });

    if (!response.success) {
      return { success: false, error: response.error };
    }

    return { success: true };
  } catch (error) {
    console.error("Error changing password:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ลบผู้ใช้
 * @param {string} userId ID ของผู้ใช้
 * @param {boolean} hardDelete หากต้องการลบข้อมูลออกจากฐานข้อมูลเลย
 * @returns {Promise<{success: boolean, error: string}>} สถานะการลบ
 */
export const deleteUser = async (userId, hardDelete = false) => {
  try {
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.delete("/gateway.php", {
      action: "deleteUser",
      userId: userId,
      hardDelete: hardDelete,
    });

    if (!response.success) {
      return { success: false, error: response.error };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ดึงข้อมูลผู้ใช้ตาม ID
 * @param {string} userId ID ของผู้ใช้
 * @returns {Promise<{data: Object, error: Object}>} ข้อมูลผู้ใช้หรือข้อผิดพลาด
 */
export const fetchUserById = async (userId) => {
  try {
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.get("/gateway.php", {
      action: "getUserById",
      id: userId,
    });

    if (!response.success) {
      console.error("Error fetching user:", response.error);
      return { data: null, error: response.error };
    }

    return { data: response.data, error: null };
  } catch (error) {
    console.error("Error fetching user:", error);
    return { data: null, error: error.message };
  }
};
