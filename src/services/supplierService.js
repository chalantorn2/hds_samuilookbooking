// services/supplierService.js - Migrated to API Gateway
// เปลี่ยนจาก Supabase calls เป็น API Gateway calls
// รักษา function signatures และ return formats เหมือนเดิม

import { apiClient } from "./apiClient";
// 🔄 MIGRATION PHASE: แปลงจาก Supabase เป็น API Gateway
// ✅ ACTIVE: ใช้ API Gateway แล้ว
// import { supabase } from "./supabase"; // 🔄 Rollback: uncomment หากมีปัญหา
// import { transformToUpperCase } from "../utils/helpers"; // 🔄 ย้ายไปทำใน PHP แล้ว

/**
 * ดึงรายการ Suppliers ตามประเภทและค้นหา
 * @param {string} type - ประเภท Supplier (Airline, Voucher, Other)
 * @param {string} search - คำค้นหา
 * @param {number} limit - จำนวนจำกัด
 * @returns {Promise<Array>} - รายการ Suppliers
 */
export const getSuppliers = async (
  type = "Airline",
  search = "",
  limit = 100
) => {
  try {
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.get("/gateway.php", {
      action: "getSuppliers",
      type: type,
      search: search,
      limit: limit,
    });

    if (!response.success) {
      console.error("Error fetching suppliers:", response.error);
      return [];
    }

    return response.data || [];
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return [];
  }
};

/**
 * ดึงข้อมูล Supplier ตาม ID
 * @param {number} id - ID ของ Supplier
 * @returns {Promise<Object|null>} - ข้อมูล Supplier
 */
export const getSupplierById = async (id) => {
  try {
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.get("/gateway.php", {
      action: "getSupplierById",
      id: id,
    });

    if (!response.success) {
      console.error("Error fetching supplier:", response.error);
      return null;
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching supplier:", error);
    return null;
  }
};

/**
 * สร้าง Supplier ใหม่
 * @param {Object} supplierData - ข้อมูล Supplier
 * @returns {Promise<Object>} - ผลลัพธ์การสร้าง Supplier
 */
export const createSupplier = async (supplierData) => {
  try {
    // เตรียมข้อมูลสำหรับส่งไป API
    const payload = {
      type: supplierData.type || "Other",
      code: supplierData.code || "",
      name: supplierData.name || "",
      numeric_code: supplierData.numeric_code || null,
    };

    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.post("/gateway.php", {
      action: "createSupplier",
      data: payload,
    });

    return response; // API Gateway จะ return { success, supplierId } หรือ { success: false, error }
  } catch (error) {
    console.error("Error creating supplier:", error);
    return { success: false, error: error.message };
  }
};

/**
 * อัปเดตข้อมูล Supplier
 * @param {number} id - ID ของ Supplier
 * @param {Object} supplierData - ข้อมูล Supplier ที่ต้องการอัปเดต
 * @returns {Promise<Object>} - ผลลัพธ์การอัปเดต
 */
export const updateSupplier = async (id, supplierData) => {
  try {
    // เตรียมข้อมูลสำหรับอัปเดต
    const payload = {
      type: supplierData.type || "Other",
      code: supplierData.code || "",
      name: supplierData.name || "",
      numeric_code: supplierData.numeric_code || null,
    };

    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.put("/gateway.php", {
      action: "updateSupplier",
      id: id,
      data: payload,
    });

    return response; // API Gateway จะ return { success, data } หรือ { success: false, error }
  } catch (error) {
    console.error("Error updating supplier:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ค้นหา Supplier ด้วย numeric_code
 * @param {string} numericCode - รหัสตัวเลขของ Supplier
 * @returns {Promise<Object|null>} - ข้อมูล Supplier หรือ null หากไม่พบ
 */
export const searchSupplierByNumericCode = async (numericCode) => {
  try {
    const response = await apiClient.get("/gateway.php", {
      action: "searchSupplierByNumericCode",
      numericCode: numericCode,
    });

    if (!response.success) {
      console.error(
        "Error searching supplier by numeric code:",
        response.error
      );
      return null;
    }

    return response.data || null;
  } catch (error) {
    console.error("Error in searchSupplierByNumericCode:", error);
    return null;
  }
};

/**
 * ค้นหา Supplier ด้วย code
 * @param {string} code - รหัสของ Supplier
 * @returns {Promise<Object|null>} - ข้อมูล Supplier หรือ null หากไม่พบ
 */
export const searchSupplierByCode = async (code) => {
  console.log("searchSupplierByCode called with:", code);
  try {
    const response = await apiClient.get("/gateway.php", {
      action: "searchSupplierByCode",
      code: code.toUpperCase(),
    });

    if (!response.success) {
      console.error("Error searching supplier by code:", response.error);
      return null;
    }

    console.log("Database search result:", response.data);
    return response.data || null;
  } catch (error) {
    console.error("Error in searchSupplierByCode:", error);
    return null;
  }
};
