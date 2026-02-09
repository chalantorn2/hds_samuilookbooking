// services/voucherService.js - Voucher Service Layer (SIMPLIFIED)
// ลบ PO/RC functions ออก เพราะ voucher ไม่ต้องใช้

import { apiClient } from "./apiClient";
import { toThaiTimeZone } from "../utils/helpers";

/**
 * สร้าง Voucher ใหม่
 * @param {Object} voucherData - ข้อมูลบริการเดินทาง
 * @returns {Promise<Object>} - ผลลัพธ์การสร้าง voucher
 */
export const createVoucher = async (voucherData) => {
  try {
    // เตรียมข้อมูลสำหรับส่งไป API Gateway
    const payload = {
      customerId: voucherData.customerId,
      supplierId: voucherData.supplierId,
      serviceType: voucherData.serviceType || "bus",
      status: voucherData.status || "not_invoiced",
      paymentStatus: voucherData.paymentStatus || "unpaid",
      createdBy: voucherData.createdBy,
      updatedBy: voucherData.updatedBy,

      // ✅ Dates (ไม่ต้องแปลง timezone เพราะ PHP Server ตั้งเป็น Bangkok timezone แล้ว)
      issueDate: voucherData.issueDate || null,
      dueDate: voucherData.dueDate || null,
      creditDays: parseInt(voucherData.creditDays) || 0, // ✅ แก้ไข: Convert to integer

      // Pricing data
      pricing: voucherData.pricing || {},
      vatPercent: parseFloat(voucherData.vatPercent) || 0, // ✅ แก้ไข: Convert to float

      // Payment methods
      companyPaymentMethod: voucherData.companyPaymentMethod,
      companyPaymentDetails: voucherData.companyPaymentDetails,
      customerPaymentMethod: voucherData.customerPaymentMethod,
      customerPaymentDetails: voucherData.customerPaymentDetails,

      // Additional info
      code: voucherData.code,
      salesName: voucherData.salesName,

      // Service details
      details: voucherData.details || {},

      // Related data
      passengers: voucherData.passengers || [],
      extras: voucherData.extras || [],
    };

    console.log("🚀 Sending simplified voucher payload:", payload);

    const response = await apiClient.post("/gateway.php", {
      action: "createVoucher",
      data: payload,
    });

    if (!response.success) {
      console.error("Error creating voucher:", response.error);
      return {
        success: false,
        error: response.error,
      };
    }

    // API Gateway จะ return: { voucherId, referenceNumber, serviceType, grandTotal }
    return {
      success: true,
      referenceNumber: response.data.referenceNumber,
      voucherId: response.data.voucherId,
      serviceType: response.data.serviceType,
      grandTotal: response.data.grandTotal,
      message: response.data.message,
    };
  } catch (error) {
    console.error("Error creating voucher:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * ดึงข้อมูล voucher ตาม ID
 * @param {number} voucherId - ID ของ voucher
 * @returns {Promise<Object>} - ข้อมูล voucher
 */
export const getVoucher = async (voucherId) => {
  try {
    const response = await apiClient.get("/gateway.php", {
      action: "getVoucherById",
      voucherId: voucherId,
    });

    if (!response.success) {
      console.error("Error fetching voucher:", response.error);
      return { success: false, error: response.error };
    }

    const voucherData = response.data;

    // รวมข้อมูลให้ตรงกับ format เดิม (ไม่มี additionalInfo)
    const fullVoucherData = {
      ...voucherData.voucher,
      details: voucherData.details || {},
      passengers: voucherData.passengers || [],
      pricing: voucherData.pricing || {},
    };

    return { success: true, data: fullVoucherData };
  } catch (error) {
    console.error("Error fetching voucher:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ดึงรายการ vouchers ทั้งหมด
 * @param {Object} filters - ฟิลเตอร์การค้นหา
 * @returns {Promise<Object>} - รายการ vouchers
 */
export const getVouchers = async (filters = {}) => {
  try {
    const params = {
      action: "getVouchersList",
      filters: filters,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    };

    // จัดการ date filters (ไม่ต้องแปลง timezone)
    if (filters.fromDate && filters.toDate) {
      params.startDate = filters.fromDate;
      params.endDate = filters.toDate;
    }

    const response = await apiClient.get("/gateway.php", params);

    if (!response.success) {
      console.error("Error fetching vouchers:", response.error);
      return { success: false, error: response.error };
    }

    return { success: true, data: response.data || [] };
  } catch (error) {
    console.error("Error fetching vouchers:", error);
    return { success: false, error: error.message };
  }
};

/**
 * อัปเดตสถานะของ voucher
 * @param {number} voucherId - ID ของ voucher
 * @param {string} status - สถานะใหม่
 * @param {number} userId - ID ของผู้ใช้ที่ทำการอัปเดต
 * @param {string} cancelReason - เหตุผลการยกเลิก (ถ้าสถานะเป็น cancelled)
 * @returns {Promise<Object>} - ผลลัพธ์การอัปเดต
 */
export const updateVoucherStatus = async (
  voucherId,
  status,
  userId = null,
  cancelReason = ""
) => {
  try {
    const response = await apiClient.post("/gateway.php", {
      action: "updateVoucherStatus",
      voucherId: voucherId,
      status: status,
      userId: userId,
      cancelReason: cancelReason,
    });

    if (!response.success) {
      console.error("Error updating voucher status:", response.error);
      return { success: false, error: response.error };
    }

    return {
      success: true,
      message: response.message || "Voucher status updated successfully",
    };
  } catch (error) {
    console.error("Error updating voucher status:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ยกเลิก voucher
 * @param {number} voucherId - ID ของ voucher
 * @param {number} userId - ID ของผู้ใช้ที่ยกเลิก
 * @param {string} cancelReason - เหตุผลการยกเลิก
 * @returns {Promise<Object>} - ผลลัพธ์การยกเลิก
 */
export const cancelVoucher = async (voucherId, userId, cancelReason) => {
  return await updateVoucherStatus(
    voucherId,
    "cancelled",
    userId,
    cancelReason
  );
};

// ❌ REMOVED: PO/RC functions - voucher ไม่ต้องใช้
// export const generatePOForVoucher = async (voucherId) => { ... }
// export const generateRCForVoucher = async (voucherId) => { ... }

/**
 * ค้นหา voucher ด้วย reference number
 * @param {string} referenceNumber - หมายเลขอ้างอิง
 * @returns {Promise<Object>} - ข้อมูล voucher
 */
export const getVoucherByReference = async (referenceNumber) => {
  try {
    const response = await apiClient.get("/gateway.php", {
      action: "getVouchersList",
      filters: { reference_number: referenceNumber },
      limit: 1,
    });

    if (!response.success) {
      console.error("Error searching voucher:", response.error);
      return { success: false, error: response.error };
    }

    const vouchers = response.data || [];

    if (vouchers.length === 0) {
      return { success: false, error: "Voucher not found" };
    }

    return await getVoucher(vouchers[0].id);
  } catch (error) {
    console.error("Error searching voucher:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ดึงรายการผู้ให้บริการ voucher
 * @param {string} search - คำค้นหา
 * @param {number} limit - จำนวนจำกัด
 * @returns {Promise<Array>} - รายการผู้ให้บริการ
 */
export const getVoucherSuppliers = async (search = "", limit = 100) => {
  try {
    const response = await apiClient.get("/gateway.php", {
      action: "getVoucherSuppliers",
      search: search,
      limit: limit,
    });

    if (!response.success) {
      console.error("Error fetching voucher suppliers:", response.error);
      return [];
    }

    return response.data || [];
  } catch (error) {
    console.error("Error fetching voucher suppliers:", error);
    return [];
  }
};

/**
 * สร้าง reference number สำหรับ voucher
 * @param {string} serviceType - ประเภทบริการ (bus, boat, tour)
 * @returns {Promise<string>} - reference number ที่สร้างขึ้น
 */
export const generateVoucherReferenceNumber = async (serviceType = "bus") => {
  try {
    const response = await apiClient.get("/gateway.php", {
      action: "generateVoucherReferenceNumber",
      serviceType: serviceType,
    });

    if (!response.success) {
      console.error(
        "Error generating voucher reference number:",
        response.error
      );
      // Fallback: สร้างเลขอ้างอิงแบบง่าย
      const prefixMap = { bus: "BS", boat: "BT", tour: "TR" };
      const prefix = prefixMap[serviceType] || "BS";
      const year = new Date().getFullYear().toString().slice(-2);
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      return `${prefix}-${year}-1-${randomPart.toString().padStart(4, "0")}`;
    }

    return response.data.reference_number;
  } catch (error) {
    console.error("Error generating voucher reference number:", error);
    // Fallback
    const prefixMap = { bus: "BS", boat: "BT", tour: "TR" };
    const prefix = prefixMap[serviceType] || "BS";
    const year = new Date().getFullYear().toString().slice(-2);
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${year}-1-${randomPart.toString().padStart(4, "0")}`;
  }
};

/**
 * ตรวจสอบว่า voucher สามารถแก้ไขได้หรือไม่
 * @param {Object} voucher - ข้อมูล voucher
 * @returns {boolean} - สามารถแก้ไขได้หรือไม่
 */
export const canEditVoucher = (voucher) => {
  if (!voucher) return false;

  // ไม่สามารถแก้ไข voucher ที่ถูกยกเลิกแล้ว
  if (voucher.status === "cancelled") return false;

  // อื่นๆ สามารถแก้ไขได้
  return true;
};

/**
 * ตรวจสอบว่า voucher สามารถยกเลิกได้หรือไม่
 * @param {Object} voucher - ข้อมูล voucher
 * @returns {boolean} - สามารถยกเลิกได้หรือไม่
 */
export const canCancelVoucher = (voucher) => {
  if (!voucher) return false;

  // ไม่สามารถยกเลิก voucher ที่ถูกยกเลิกแล้ว
  if (voucher.status === "cancelled") return false;

  // อื่นๆ สามารถยกเลิกได้
  return true;
};

// ❌ REMOVED: canGeneratePO - voucher ไม่ใช้ PO

/**
 * ดึงสถิติการขาย voucher
 * @param {Object} dateRange - ช่วงวันที่
 * @returns {Promise<Object>} - สถิติการขาย
 */
export const getVoucherStats = async (dateRange = {}) => {
  try {
    const { startDate, endDate } = dateRange;

    const response = await apiClient.get("/gateway.php", {
      action: "getVouchersList",
      startDate: startDate,
      endDate: endDate,
      limit: 1000,
    });

    if (!response.success) {
      console.error("Error getting voucher stats:", response.error);
      return { success: false, error: response.error };
    }

    const vouchers = response.data || [];

    // คำนวณสถิติ
    const stats = {
      totalVouchers: vouchers.length,
      totalAmount: vouchers.reduce(
        (sum, voucher) => sum + parseFloat(voucher.grand_total || 0),
        0
      ),
      statusBreakdown: {
        not_invoiced: vouchers.filter((v) => v.status === "not_invoiced")
          .length,
        invoiced: vouchers.filter((v) => v.status === "invoiced").length,
        cancelled: vouchers.filter((v) => v.status === "cancelled").length,
      },
      paymentBreakdown: {
        unpaid: vouchers.filter((v) => v.payment_status === "unpaid").length,
        paid: vouchers.filter((v) => v.payment_status === "paid").length,
        partial: vouchers.filter((v) => v.payment_status === "partial").length,
      },
      serviceTypeBreakdown: {
        bus: vouchers.filter((v) => v.service_type === "bus").length,
        boat: vouchers.filter((v) => v.service_type === "boat").length,
        tour: vouchers.filter((v) => v.service_type === "tour").length,
      },
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error("Error getting voucher stats:", error);
    return { success: false, error: error.message };
  }
};

/**
 * สร้างและบันทึก VC Number สำหรับ booking voucher
 * @param {number} voucherId - ID ของ booking voucher
 * @returns {Promise<Object>} - ผลลัพธ์การสร้าง VC
 */
export const generateVCForVoucher = async (voucherId) => {
  try {
    const response = await apiClient.post("/gateway.php", {
      action: "generateVCForVoucher",
      voucherId: voucherId,
    });

    if (!response.success) {
      console.error("Error generating VC Number:", response.error);
      return {
        success: false,
        error: response.error,
        vcNumber: null,
      };
    }

    return {
      success: true,
      vcNumber: response.data.vcNumber,
      isNew: response.data.isNew,
      message: response.data.message,
    };
  } catch (error) {
    console.error("Error generating VC Number:", error);
    return {
      success: false,
      error: error.message,
      vcNumber: null,
    };
  }
};

/**
 * ตรวจสอบว่า voucher สามารถออก VC ได้หรือไม่
 * @param {Object} voucher - ข้อมูล voucher
 * @returns {boolean} - สามารถออก VC ได้หรือไม่
 */
export const canGenerateVC = (voucher) => {
  if (!voucher) return false;

  // ไม่สามารถออก VC ให้ voucher ที่ถูกยกเลิกแล้ว
  if (voucher.status === "cancelled") return false;

  // ถ้ามี VC แล้วไม่ต้องออกใหม่
  if (voucher.vc_number && voucher.vc_number.trim() !== "") return false;

  return true;
};
