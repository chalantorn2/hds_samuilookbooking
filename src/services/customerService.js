// services/customerService.js - Migrated to API Gateway
// เปลี่ยนจาก Supabase calls เป็น API Gateway calls
// รักษา function signatures และ return formats เหมือนเดิม

import { apiClient } from "./apiClient";
// 🔄 MIGRATION PHASE: แปลงจาก Supabase เป็น API Gateway
// ✅ ACTIVE: ใช้ API Gateway แล้ว
// import { supabase, insertData, fetchData } from "./supabase"; // 🔄 Rollback: uncomment หากมีปัญหา
// import { transformToUpperCase } from "../utils/helpers"; // 🔄 ย้ายไปทำใน PHP แล้ว

// ฟังก์ชันตัดข้อความให้มีความยาวสูงสุด (เก็บไว้ในฝั่ง frontend)
const truncateText = (text, maxLength = 50) => {
  if (!text) return text;
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

// ฟังก์ชันสำหรับจัดการที่อยู่แบบใหม่ (เก็บไว้ในฝั่ง frontend)
const formatFullAddress = (customer) => {
  const addressParts = [
    customer.address_line1,
    customer.address_line2,
    customer.address_line3,
  ].filter((part) => part && part.trim() !== "");

  return addressParts.join(" ");
};

/**
 * ดึงรายการลูกค้า พร้อม search และ limit
 * @param {string} search - คำค้นหา
 * @param {number} limit - จำนวนจำกัด
 * @returns {Promise<Array>} - รายการลูกค้า
 */
export const getCustomers = async (search = "", limit = 10) => {
  try {
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.get("/gateway.php", {
      action: "getCustomers",
      search: search,
      limit: limit,
      active: true,
    });

    if (!response.success) {
      console.error("Error fetching customers:", response.error);
      return [];
    }

    // Process data ให้ตรงกับ format เดิม
    const processedData = response.data.map((customer) => ({
      ...customer,
      name: truncateText(customer.name),
      address: formatFullAddress(customer), // สำหรับ backward compatibility
      full_address: formatFullAddress(customer),
      full_name: customer.name,
    }));

    return processedData;
  } catch (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
};

/**
 * ดึงข้อมูลลูกค้าตาม ID
 * @param {number} id - ID ของลูกค้า
 * @returns {Promise<Object|null>} - ข้อมูลลูกค้า
 */
export const getCustomerById = async (id) => {
  try {
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.get("/gateway.php", {
      action: "getCustomerById",
      id: id,
    });

    if (!response.success) {
      console.error("Error fetching customer:", response.error);
      return null;
    }

    const customer = response.data;

    // เพิ่ม address สำหรับ backward compatibility
    if (customer) {
      customer.address = formatFullAddress(customer);
      customer.full_address = formatFullAddress(customer);
    }

    return customer;
  } catch (error) {
    console.error("Error fetching customer:", error);
    return null;
  }
};

/**
 * สร้างลูกค้าใหม่
 * @param {Object} customerData - ข้อมูลลูกค้า
 * @returns {Promise<Object>} - ผลลัพธ์การสร้างลูกค้า
 */
export const createCustomer = async (customerData) => {
  try {
    // ตรวจสอบรหัสลูกค้า (รักษา validation logic เดิม)
    if (customerData.code) {
      // ตรวจสอบความยาว 3-5 ตัว
      if (customerData.code.length < 3 || customerData.code.length > 5) {
        return { success: false, error: "รหัสลูกค้าต้องเป็น 3-5 ตัวอักษร" };
      }
      // ลบการเช็ครหัสซ้ำออก - อนุญาตให้ซ้ำกันได้
    }

    // ตรวจสอบรูปแบบอีเมล
    if (customerData.email && customerData.email.trim() !== "") {
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(customerData.email)) {
        return { success: false, error: "รูปแบบอีเมลไม่ถูกต้อง" };
      }
    }

    // จัดการข้อมูลที่อยู่ - ถ้าเป็นแบบเก่า (address) ให้ย้ายไป address_line1
    let addressLine1 = customerData.address_line1;
    let addressLine2 = customerData.address_line2;
    let addressLine3 = customerData.address_line3;

    // Backward compatibility: ถ้ามี address แต่ไม่มี address_line1
    if (!addressLine1 && customerData.address) {
      addressLine1 = customerData.address;
    }

    // เตรียมข้อมูลสำหรับส่งไป API
    const payload = {
      name: customerData.name,
      code: customerData.code,
      email: customerData.email,
      address_line1: addressLine1,
      address_line2: addressLine2,
      address_line3: addressLine3,
      id_number: customerData.id_number || null,
      phone: customerData.phone,
      credit_days: customerData.credit_days || 0,
      branch_type: customerData.branch_type || "Head Office",
      branch_number: customerData.branch_number || null,
    };

    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.post("/gateway.php", {
      action: "createCustomer",
      data: payload,
    });

    // ✅ Parse response - customerId อยู่ใน response.data.customerId
    if (response.success && response.data) {
      return {
        success: true,
        customerId: response.data.customerId,
        message: response.message
      };
    }

    return response; // Return as-is if error
  } catch (error) {
    console.error("Error creating customer:", error);
    return { success: false, error: error.message };
  }
};

/**
 * อัปเดตข้อมูลลูกค้า
 * @param {number} id - ID ของลูกค้า
 * @param {Object} customerData - ข้อมูลลูกค้าที่ต้องการอัปเดต
 * @returns {Promise<Object>} - ผลลัพธ์การอัปเดต
 */
export const updateCustomer = async (id, customerData) => {
  try {
    // ตรวจสอบข้อมูลที่จำเป็น (รักษา validation logic เดิม)
    if (!customerData.name) {
      return { success: false, error: "Customer name is required" };
    }

    // ตรวจสอบว่ามี address_line1 หรือไม่
    if (!customerData.address_line1 && !customerData.address) {
      return {
        success: false,
        error: "ที่อยู่บรรทัดที่ 1 เป็นข้อมูลที่จำเป็น",
      };
    }

    // ตรวจสอบรหัสลูกค้า
    if (customerData.code) {
      // ตรวจสอบความยาว 3-5 ตัว
      if (customerData.code.length < 3 || customerData.code.length > 5) {
        return { success: false, error: "รหัสลูกค้าต้องเป็น 3-5 ตัวอักษร" };
      }
      // อนุญาตให้รหัสลูกค้าซ้ำกันได้ - ไม่ต้องเช็ค
    }

    // ตรวจสอบรูปแบบอีเมล
    if (customerData.email && customerData.email.trim() !== "") {
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(customerData.email)) {
        return { success: false, error: "รูปแบบอีเมลไม่ถูกต้อง" };
      }
    }

    // ตรวจสอบความถูกต้องของข้อมูลสาขา
    if (customerData.branch_type === "Branch" && !customerData.branch_number) {
      return {
        success: false,
        error: "Branch number is required when branch type is Branch",
      };
    }

    // จัดการข้อมูลที่อยู่ - Backward compatibility
    let addressLine1 = customerData.address_line1;
    if (!addressLine1 && customerData.address) {
      addressLine1 = customerData.address;
    }

    // เตรียมข้อมูลสำหรับอัปเดต
    const payload = {
      name: customerData.name,
      code: customerData.code,
      email: customerData.email,
      address_line1: addressLine1,
      address_line2: customerData.address_line2,
      address_line3: customerData.address_line3,
      id_number: customerData.id_number || null,
      phone: customerData.phone,
      branch_type: customerData.branch_type || "Head Office",
      branch_number:
        customerData.branch_type === "Branch"
          ? customerData.branch_number
          : null,
      credit_days: customerData.credit_days || 0,
    };

    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.put("/gateway.php", {
      action: "updateCustomer",
      id: id,
      data: payload,
    });

    // Process response เพื่อให้ตรงกับ format เดิม
    if (response.success && response.data) {
      const customer = response.data;

      // เพิ่ม address สำหรับ backward compatibility
      customer.address = formatFullAddress(customer);
      customer.full_address = formatFullAddress(customer);

      return { success: true, customer: customer };
    }

    return response; // จะ return { success: false, error } ถ้ามีปัญหา
  } catch (error) {
    console.error("Error updating customer:", error);
    return { success: false, error: error.message };
  }
};
