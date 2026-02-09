// services/userService.js - Migrated to API Gateway
// เปลี่ยนจาก Supabase calls เป็น API Gateway calls
// รักษา function signatures และ return formats เหมือนเดิม

import { apiClient } from "./apiClient";
// 🔄 MIGRATION PHASE: แปลงจาก Supabase เป็น API Gateway
// ✅ ACTIVE: ใช้ API Gateway แล้ว
// import { supabase, insertData, fetchData } from "./supabase"; // 🔄 Rollback: uncomment หากมีปัญหา
// import { transformToUpperCase } from "../utils/helpers"; // 🔄 ย้ายไปทำใน PHP แล้ว

/**
 * ดึงรายการ Users พร้อม search และ limit
 * @param {string} search - คำค้นหา
 * @param {number} limit - จำนวนจำกัด
 * @returns {Promise<Array>} - รายการ Users
 */
export const getUsers = async (search = "", limit = 10) => {
  try {
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.get("/gateway.php", {
      action: "getUsers",
      search: search,
      limit: limit,
    });

    if (!response.success) {
      console.error("Error fetching users:", response.error);
      return [];
    }

    return response.data || [];
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

/**
 * ดึงข้อมูล User ตาม ID
 * @param {number} id - ID ของ User
 * @returns {Promise<Object|null>} - ข้อมูล User
 */
export const getUserById = async (id) => {
  try {
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.get("/gateway.php", {
      action: "getUserById",
      id: id,
    });

    if (!response.success) {
      console.error("Error fetching user:", response.error);
      return null;
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
};

/**
 * สร้าง User ใหม่
 * @param {Object} userData - ข้อมูล User
 * @returns {Promise<Object>} - ผลลัพธ์การสร้าง User
 */
export const createUser = async (userData) => {
  try {
    // เตรียมข้อมูลสำหรับส่งไป API (รักษา structure เดิม)
    const payload = {
      username: userData.username,
      password: userData.password_hash || userData.password, // รองรับทั้ง 2 format
      fullname: userData.full_name || userData.fullname, // รองรับทั้ง 2 format
      email: userData.email,
      role: userData.role || "viewer",
      active: userData.active !== undefined ? userData.active : true,
    };

    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.post("/gateway.php", {
      action: "createUser",
      data: payload,
    });

    return response; // API Gateway จะ return { success, userId } หรือ { success: false, error }
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, error: error.message };
  }
};

/**
 * อัปเดตข้อมูล User
 * @param {number} id - ID ของ User
 * @param {Object} userData - ข้อมูล User ที่ต้องการอัปเดต
 * @returns {Promise<Object>} - ผลลัพธ์การอัปเดต
 */
export const updateUser = async (id, userData) => {
  try {
    // เตรียมข้อมูลสำหรับอัปเดต
    const payload = {
      fullname: userData.full_name || userData.fullname,
      email: userData.email,
      role: userData.role || "viewer",
      active: userData.active !== undefined ? userData.active : true,
    };

    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.put("/gateway.php", {
      action: "updateUser",
      id: id,
      data: payload,
    });

    return response; // API Gateway จะ return { success } หรือ { success: false, error }
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, error: error.message };
  }
};

/**
 * เปลี่ยนรหัสผ่าน User
 * @param {number} userId - ID ของ User
 * @param {string} newPassword - รหัสผ่านใหม่
 * @returns {Promise<Object>} - ผลลัพธ์การเปลี่ยนรหัสผ่าน
 */
export const changePassword = async (userId, newPassword) => {
  try {
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.post("/gateway.php", {
      action: "changePassword",
      userId: userId,
      newPassword: newPassword,
    });

    return response; // API Gateway จะ return { success } หรือ { success: false, error }
  } catch (error) {
    console.error("Error changing password:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ลบ User
 * @param {number} userId - ID ของ User
 * @param {boolean} hardDelete - ลบถาวรหรือไม่ (default: false = soft delete)
 * @returns {Promise<Object>} - ผลลัพธ์การลบ
 */
export const deleteUser = async (userId, hardDelete = false) => {
  try {
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.delete("/gateway.php", {
      action: "deleteUser",
      userId: userId,
      hardDelete: hardDelete,
    });

    return response; // API Gateway จะ return { success } หรือ { success: false, error }
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: error.message };
  }
};
