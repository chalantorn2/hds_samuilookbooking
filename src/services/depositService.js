// services/depositService.js - Deposit Service Layer
// ตาม Pattern ของ voucherService.js สำหรับ SaleDeposit

import { apiClient } from "./apiClient";
import { toThaiTimeZone } from "../utils/helpers";

/**
 * สร้าง Deposit ใหม่
 * @param {Object} depositData - ข้อมูล Deposit
 * @returns {Promise<Object>} - ผลลัพธ์การสร้าง deposit
 */
export const createDeposit = async (depositData) => {
  try {
    // เตรียมข้อมูลสำหรับส่งไป API Gateway
    const payload = {
      customerId: depositData.customerId,
      supplierId: depositData.supplierId,
      depositType: depositData.depositType || "airTicket",
      otherTypeDescription: depositData.otherTypeDescription,
      groupName: depositData.groupName,
      status: depositData.status || "pending",
      paymentStatus: depositData.paymentStatus || "unpaid",
      createdBy: depositData.createdBy,
      updatedBy: depositData.updatedBy,

      // ✅ Dates (ไม่ต้องแปลง timezone เพราะ PHP Server ตั้งเป็น Bangkok timezone แล้ว)
      issueDate: depositData.issueDate || null,
      dueDate: depositData.dueDate || null,
      creditDays: parseInt(depositData.creditDays) || 0,

      // Pricing data
      pricing: depositData.pricing || {},
      vatPercent: parseFloat(depositData.vatPercent) || 0,

      // Deposit specific
      depositAmount: parseFloat(depositData.depositAmount) || 0,
      depositPax: parseInt(depositData.depositPax) || 0,

      // 3 วันที่สำคัญของ Deposit (ไม่ต้องแปลง timezone)
      depositDueDate: depositData.depositDueDate || null,
      passengerInfoDueDate: depositData.passengerInfoDueDate || null,
      fullPaymentDueDate: depositData.fullPaymentDueDate || null,

      // Payment methods (old)
      companyPaymentMethod: depositData.companyPaymentMethod,
      companyPaymentDetails: depositData.companyPaymentDetails,
      customerPaymentMethod: depositData.customerPaymentMethod,
      customerPaymentDetails: depositData.customerPaymentDetails,

      // Payment methods (new - arrays)
      companyPayments: depositData.companyPayments || [],
      customerPayments: depositData.customerPayments || [],

      // Additional info
      code: depositData.code,
      salesName: depositData.salesName,
      description: depositData.description,
      routes: depositData.routes || [],
      extras: depositData.extras || [],
    };

    console.log("🚀 Sending deposit payload:", payload);

    const response = await apiClient.post("/gateway.php", {
      action: "createDeposit",
      data: payload,
    });

    if (!response.success) {
      console.error("Error creating deposit:", response.error);
      return {
        success: false,
        error: response.error,
      };
    }

    // API Gateway จะ return: { depositId, referenceNumber, depositType, grandTotal }
    return {
      success: true,
      referenceNumber: response.data.referenceNumber,
      depositId: response.data.depositId,
      depositType: response.data.depositType,
      grandTotal: response.data.grandTotal,
      message: response.data.message,
    };
  } catch (error) {
    console.error("Error creating deposit:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * ดึงข้อมูล deposit ตาม ID
 * @param {number} depositId - ID ของ deposit
 * @returns {Promise<Object>} - ข้อมูล deposit
 */
export const getDeposit = async (depositId) => {
  try {
    const response = await apiClient.get("/gateway.php", {
      action: "getDepositById",
      depositId: depositId,
    });

    if (!response.success) {
      console.error("Error fetching deposit:", response.error);
      return { success: false, error: response.error };
    }

    const depositData = response.data;

    // รวมข้อมูลให้ตรงกับ format เดิม
    const fullDepositData = {
      ...depositData.deposit,
      details: depositData.details || {},
      terms: depositData.terms || {},
      pricing: depositData.pricing || {},
      additionalInfo: depositData.additionalInfo || {},
    };

    return { success: true, data: fullDepositData };
  } catch (error) {
    console.error("Error fetching deposit:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ดึงรายการ deposits ทั้งหมด
 * @param {Object} filters - ฟิลเตอร์การค้นหา
 * @returns {Promise<Object>} - รายการ deposits
 */
export const getDeposits = async (filters = {}) => {
  try {
    const params = {
      action: "getDepositsList",
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
      console.error("Error fetching deposits:", response.error);
      return { success: false, error: response.error };
    }

    return { success: true, data: response.data || [] };
  } catch (error) {
    console.error("Error fetching deposits:", error);
    return { success: false, error: error.message };
  }
};

/**
 * อัปเดตสถานะของ deposit
 * @param {number} depositId - ID ของ deposit
 * @param {string} status - สถานะใหม่
 * @param {number} userId - ID ของผู้ใช้ที่ทำการอัปเดต
 * @param {string} cancelReason - เหตุผลการยกเลิก (ถ้าสถานะเป็น cancelled)
 * @returns {Promise<Object>} - ผลลัพธ์การอัปเดต
 */
export const updateDepositStatus = async (
  depositId,
  status,
  userId = null,
  cancelReason = ""
) => {
  try {
    const response = await apiClient.post("/gateway.php", {
      action: "updateDepositStatus",
      depositId: depositId,
      status: status,
      userId: userId,
      cancelReason: cancelReason,
    });

    if (!response.success) {
      console.error("Error updating deposit status:", response.error);
      return { success: false, error: response.error };
    }

    return {
      success: true,
      message: response.message || "Deposit status updated successfully",
    };
  } catch (error) {
    console.error("Error updating deposit status:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ยกเลิก deposit
 * @param {number} depositId - ID ของ deposit
 * @param {number} userId - ID ของผู้ใช้ที่ยกเลิก
 * @param {string} cancelReason - เหตุผลการยกเลิก
 * @returns {Promise<Object>} - ผลลัพธ์การยกเลิก
 */
export const cancelDeposit = async (depositId, userId, cancelReason) => {
  return await updateDepositStatus(
    depositId,
    "cancelled",
    userId,
    cancelReason
  );
};

/**
 * ค้นหา deposit ด้วย reference number
 * @param {string} referenceNumber - หมายเลขอ้างอิง
 * @returns {Promise<Object>} - ข้อมูล deposit
 */
export const getDepositByReference = async (referenceNumber) => {
  try {
    const response = await apiClient.get("/gateway.php", {
      action: "getDepositsList",
      filters: { reference_number: referenceNumber },
      limit: 1,
    });

    if (!response.success) {
      console.error("Error searching deposit:", response.error);
      return { success: false, error: response.error };
    }

    const deposits = response.data || [];

    if (deposits.length === 0) {
      return { success: false, error: "Deposit not found" };
    }

    return await getDeposit(deposits[0].id);
  } catch (error) {
    console.error("Error searching deposit:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ดึงรายการผู้ให้บริการ deposit (airlines)
 * @param {string} search - คำค้นหา
 * @param {number} limit - จำนวนจำกัด
 * @returns {Promise<Array>} - รายการผู้ให้บริการ
 */
export const getDepositSuppliers = async (search = "", limit = 100) => {
  try {
    const response = await apiClient.get("/gateway.php", {
      action: "getDepositSuppliers",
      search: search,
      limit: limit,
    });

    if (!response.success) {
      console.error("Error fetching deposit suppliers:", response.error);
      return [];
    }

    return response.data || [];
  } catch (error) {
    console.error("Error fetching deposit suppliers:", error);
    return [];
  }
};

/**
 * สร้าง reference number สำหรับ deposit
 * @param {string} depositType - ประเภท deposit (airTicket, package, land, other)
 * @returns {Promise<string>} - reference number ที่สร้างขึ้น
 */
export const generateDepositReferenceNumber = async (
  depositType = "airTicket"
) => {
  try {
    const response = await apiClient.get("/gateway.php", {
      action: "generateDepositReferenceNumber",
      depositType: depositType,
    });

    if (!response.success) {
      console.error(
        "Error generating deposit reference number:",
        response.error
      );
      // Fallback: สร้างเลขอ้างอิงแบบง่าย
      const year = new Date().getFullYear().toString().slice(-2);
      const month = new Date().getMonth() + 1;
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      return `DP-${year}-${month}-${randomPart.toString().padStart(4, "0")}`;
    }

    return response.data.reference_number;
  } catch (error) {
    console.error("Error generating deposit reference number:", error);
    // Fallback
    const year = new Date().getFullYear().toString().slice(-2);
    const month = new Date().getMonth() + 1;
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `DP-${year}-${month}-${randomPart.toString().padStart(4, "0")}`;
  }
};

/**
 * อัปเดต deposit แบบครบถ้วน
 * @param {number} depositId - ID ของ deposit
 * @param {Object} updateData - ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<Object>} - ผลลัพธ์การอัปเดต
 */
export const updateDepositComplete = async (depositId, updateData) => {
  try {
    const response = await apiClient.post("/gateway.php", {
      action: "updateDepositComplete",
      id: depositId,
      data: updateData,
    });

    if (!response.success) {
      console.error("Error updating deposit:", response.error);
      return { success: false, error: response.error };
    }

    return {
      success: true,
      message: response.message || "Deposit updated successfully",
    };
  } catch (error) {
    console.error("Error updating deposit:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ตรวจสอบว่า deposit สามารถแก้ไขได้หรือไม่
 * @param {Object} deposit - ข้อมูล deposit
 * @returns {boolean} - สามารถแก้ไขได้หรือไม่
 */
export const canEditDeposit = (deposit) => {
  if (!deposit) return false;

  // ไม่สามารถแก้ไข deposit ที่ถูกยกเลิกแล้ว
  if (deposit.status === "cancelled") return false;

  // อื่นๆ สามารถแก้ไขได้
  return true;
};

/**
 * ตรวจสอบว่า deposit สามารถยกเลิกได้หรือไม่
 * @param {Object} deposit - ข้อมูล deposit
 * @returns {boolean} - สามารถยกเลิกได้หรือไม่
 */
export const canCancelDeposit = (deposit) => {
  if (!deposit) return false;

  // ไม่สามารถยกเลิก deposit ที่ถูกยกเลิกแล้ว
  if (deposit.status === "cancelled") return false;

  // อื่นๆ สามารถยกเลิกได้
  return true;
};

/**
 * ดึงสถิติการขาย deposit
 * @param {Object} dateRange - ช่วงวันที่
 * @returns {Promise<Object>} - สถิติการขาย
 */
export const getDepositStats = async (dateRange = {}) => {
  try {
    const { startDate, endDate } = dateRange;

    const response = await apiClient.get("/gateway.php", {
      action: "getDepositsList",
      startDate: startDate,
      endDate: endDate,
      limit: 1000,
    });

    if (!response.success) {
      console.error("Error getting deposit stats:", response.error);
      return { success: false, error: response.error };
    }

    const deposits = response.data || [];

    // คำนวณสถิติ
    const stats = {
      totalDeposits: deposits.length,
      totalAmount: deposits.reduce(
        (sum, deposit) => sum + parseFloat(deposit.grand_total || 0),
        0
      ),
      statusBreakdown: {
        pending: deposits.filter((d) => d.status === "pending").length,
        confirmed: deposits.filter((d) => d.status === "confirmed").length,
        cancelled: deposits.filter((d) => d.status === "cancelled").length,
      },
      paymentBreakdown: {
        unpaid: deposits.filter((d) => d.payment_status === "unpaid").length,
        paid: deposits.filter((d) => d.payment_status === "paid").length,
        partial: deposits.filter((d) => d.payment_status === "partial").length,
      },
      typeBreakdown: {
        airTicket: deposits.filter((d) => d.deposit_type === "airTicket")
          .length,
        package: deposits.filter((d) => d.deposit_type === "package").length,
        land: deposits.filter((d) => d.deposit_type === "land").length,
        other: deposits.filter((d) => d.deposit_type === "other").length,
      },
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error("Error getting deposit stats:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ตรวจสอบว่า deposit สามารถยืนยันได้หรือไม่
 * @param {Object} deposit - ข้อมูล deposit
 * @returns {boolean} - สามารถยืนยันได้หรือไม่
 */
export const canIssueDeposit = (deposit) => {
  if (!deposit) return false;

  // สามารถออกเอกสารได้เฉพาะสถานะ pending
  if (deposit.status !== "pending") return false;

  return true;
};

/**
 * ยืนยัน deposit
 * @param {number} depositId - ID ของ deposit
 * @param {number} userId - ID ของผู้ใช้ที่ยืนยัน
 * @returns {Promise<Object>} - ผลลัพธ์การยืนยัน
 */
export const issueDeposit = async (depositId, userId) => {
  return await updateDepositStatus(depositId, "issued", userId);
};

/**
 * ฟอร์แมตวันที่สำหรับแสดงผล
 * @param {string} dateString - วันที่ในรูปแบบ YYYY-MM-DD
 * @returns {string} - วันที่ในรูปแบบ DD/MM/YYYY
 */
export const formatDisplayDate = (dateString) => {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

/**
 * คำนวณจำนวนวันที่เหลือจากวันครบกำหนด
 * @param {string} dueDateString - วันครบกำหนดในรูปแบบ YYYY-MM-DD
 * @returns {number} - จำนวนวันที่เหลือ (ติดลบถ้าเกินกำหนด)
 */
export const getDaysUntilDue = (dueDateString) => {
  if (!dueDateString) return null;

  try {
    const dueDate = new Date(dueDateString);
    const today = new Date();
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch (error) {
    console.error("Error calculating days until due:", error);
    return null;
  }
};
