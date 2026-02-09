// src/pages/Information/services/informationService.js - Migrated to API Gateway
// เปลี่ยนจาก Supabase calls เป็น API Gateway calls
// รักษา function signatures และ return formats เหมือนเดิม

import { apiClient } from "../../../services/apiClient";
// 🔄 MIGRATION PHASE: แปลงจาก Supabase เป็น API Gateway
// ✅ ACTIVE: ใช้ API Gateway แล้ว
// import { supabase } from "../../../services/supabase"; // 🔄 Rollback: uncomment หากมีปัญหา

/**
 * ดึงรายการ Suppliers ตามประเภทและค้นหา
 * @param {string|Array} category - ประเภท Supplier (string หรือ array)
 * @param {string} search - คำค้นหา
 * @param {boolean} active - สถานะ active (default: true)
 * @returns {Promise<Object>} - ผลลัพธ์การดึงข้อมูล
 */
export const fetchSuppliers = async (
  category = null,
  search = "",
  active = true
) => {
  try {
    let type = "all"; // default เป็น all เพื่อค้นหาทั้งหมด

    if (category) {
      if (Array.isArray(category)) {
        // ถ้าเป็น array และมีหลายตัว = ค้นหาทั้งหมด
        if (category.length > 1) {
          type = "all";
        } else {
          // ถ้ามีตัวเดียว
          const firstCategory = category[0];
          if (firstCategory === "airline") type = "Airline";
          // ✅ Changed: "supplier-voucher" now maps to "Other" (2026-01-09)
          else if (firstCategory === "supplier-voucher") type = "Other";
          else type = "Other";
        }
      } else {
        // ถ้าเป็น string
        if (category === "airline") type = "Airline";
        // ✅ Changed: "supplier-voucher" now maps to "Other" (2026-01-09)
        else if (category === "supplier-voucher") type = "Other";
        else type = "Other";
      }
    }

    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.get("/gateway.php", {
      action: "getSuppliers",
      type: type,
      search: search,
      limit: 100, // กำหนด limit เพื่อป้องกันข้อมูลมากเกินไป
    });

    if (!response.success) {
      console.error("Error fetching suppliers:", response.error);
      return { success: false, error: response.error };
    }

    return { success: true, data: response.data || [] };
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ดึงรายการ Customers ตามการค้นหา
 * @param {string} search - คำค้นหา
 * @param {boolean} active - สถานะ active (default: true)
 * @returns {Promise<Object>} - ผลลัพธ์การดึงข้อมูล
 */
export const fetchCustomers = async (search = "", active = true) => {
  try {
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.get("/gateway.php", {
      action: "getCustomers",
      search: search,
      limit: 100, // กำหนด limit
      active: active,
    });

    if (!response.success) {
      console.error("Error fetching customers:", response.error);
      return { success: false, error: response.error };
    }

    return { success: true, data: response.data || [] };
  } catch (error) {
    console.error("Error fetching customers:", error);
    return { success: false, error: error.message };
  }
};

/**
 * สร้าง Supplier ใหม่
 * @param {Object} supplierData - ข้อมูล Supplier
 * @returns {Promise<Object>} - ผลลัพธ์การสร้าง
 */
export const createSupplier = async (supplierData) => {
  try {
    // เตรียมข้อมูลให้ตรงกับรูปแบบที่ API Gateway ต้องการ
    const payload = {
      type: supplierData.type || "Other",
      code: supplierData.code || "",
      name: supplierData.name || "",
      phone: supplierData.phone || null,
      numeric_code: supplierData.numeric_code || null,
    };

    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.post("/gateway.php", {
      action: "createSupplier",
      data: payload,
    });

    if (!response.success) {
      console.error("Error creating supplier:", response.error);
      return { success: false, error: response.error };
    }

    // ดึงข้อมูล supplier ที่สร้างใหม่เพื่อ return ในรูปแบบเดิม
    if (
      response.data &&
      typeof response.data === "object" &&
      response.data.supplierId
    ) {
      // ถ้า API Gateway return { supplierId: number }
      const supplierId = response.data.supplierId || response.data;

      // ดึงข้อมูล supplier ที่สร้างใหม่
      const newSupplierResponse = await apiClient.get("/gateway.php", {
        action: "getSupplierById",
        id: supplierId,
      });

      if (newSupplierResponse.success) {
        return { success: true, data: newSupplierResponse.data };
      }
    }

    // Fallback: return success with basic info
    return {
      success: true,
      data: {
        id: response.data.supplierId || response.data,
        ...payload,
      },
    };
  } catch (error) {
    console.error("Error creating supplier:", error);
    return { success: false, error: error.message };
  }
};

/**
 * อัปเดต Supplier
 * @param {number} id - ID ของ Supplier
 * @param {Object} supplierData - ข้อมูล Supplier ที่ต้องการอัปเดต
 * @returns {Promise<Object>} - ผลลัพธ์การอัปเดต
 */
export const updateSupplier = async (id, supplierData) => {
  try {
    // เตรียมข้อมูลให้ตรงกับรูปแบบที่ API Gateway ต้องการ
    const payload = {
      type: supplierData.type || "Other",
      code: supplierData.code || "",
      name: supplierData.name || "",
      phone: supplierData.phone || null,
      numeric_code: supplierData.numeric_code || null,
    };

    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.put("/gateway.php", {
      action: "updateSupplier",
      id: id,
      data: payload,
    });

    if (!response.success) {
      console.error("Error updating supplier:", response.error);
      return { success: false, error: response.error };
    }

    // ตรวจสอบว่า response มีข้อมูลที่อัปเดต
    if (response.data && typeof response.data === "object") {
      return { success: true, data: response.data };
    }

    // ถ้าไม่มีข้อมูลใน response ให้ดึงข้อมูลใหม่
    const updatedSupplierResponse = await apiClient.get("/gateway.php", {
      action: "getSupplierById",
      id: id,
    });

    if (updatedSupplierResponse.success) {
      return { success: true, data: updatedSupplierResponse.data };
    }

    // Fallback
    return { success: true, data: { id, ...payload } };
  } catch (error) {
    console.error("Error updating supplier:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ปิดการใช้งาน Item (Soft Delete)
 * @param {string} table - ชื่อตาราง ('information' หรือ 'customers')
 * @param {number} id - ID ของรายการ
 * @returns {Promise<Object>} - ผลลัพธ์การปิดการใช้งาน
 */
export const deactivateItem = async (table, id) => {
  try {
    // กำหนด action ตามตาราง
    let action = "";
    if (table === "information") {
      action = "deactivateSupplier";
    } else if (table === "customers") {
      action = "deactivateCustomer";
    } else {
      throw new Error(`Unsupported table: ${table}`);
    }

    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.put("/gateway.php", {
      action: action,
      id: id,
      data: { active: false }, // soft delete โดยเซ็ต active = false
    });

    if (!response.success) {
      console.error(`Error deactivating item in ${table}:`, response.error);
      return { success: false, error: response.error };
    }

    return { success: true };
  } catch (error) {
    console.error(`Error deactivating item in ${table}:`, error);
    return { success: false, error: error.message };
  }
};
