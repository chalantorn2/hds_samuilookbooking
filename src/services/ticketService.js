// services/ticketService.js - Migrated to API Gateway
// เปลี่ยนจาก Supabase calls เป็น API Gateway calls
// รักษา function signatures และ return formats เหมือนเดิม

import { apiClient } from "./apiClient";
import { toThaiTimeZone } from "../utils/helpers";
import { generateRCForTicket } from "./referencesService";
// 🔄 MIGRATION PHASE: แปลงจาก Supabase เป็น API Gateway
// ✅ ACTIVE: ใช้ API Gateway แล้ว
// import { supabase } from "./supabase"; // 🔄 Rollback: uncomment หากมีปัญหา
// import { generateReferenceNumber, generatePONumber } from "./referencesService"; // 🔄 API Gateway handles this
// import { transformToUpperCase } from "../utils/helpers"; // 🔄 PHP handles this

/**
 * สร้างและบันทึก PO Number สำหรับ booking ticket
 * @param {number} ticketId - ID ของ booking ticket
 * @param {number} userId - ID ของผู้ใช้ (สำหรับ Activity Log)
 * @returns {Promise<Object>} - ผลลัพธ์การสร้าง PO
 */
export const generatePOForTicket = async (ticketId, userId = null) => {
  try {
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.post("/gateway.php", {
      action: "generatePOForTicket",
      ticketId: ticketId,
      userId: userId, // ✅ ส่ง userId สำหรับ Activity Log
    });

    if (!response.success) {
      console.error("Error generating PO Number:", response.error);
      return {
        success: false,
        error: response.error,
        poNumber: null,
      };
    }

    // API Gateway จะ return: { poNumber, isNew, message }
    return {
      success: true,
      poNumber: response.data.poNumber,
      isNew: response.data.isNew,
      message: response.data.message,
    };
  } catch (error) {
    console.error("Error generating PO Number:", error);
    return {
      success: false,
      error: error.message,
      poNumber: null,
    };
  }
};

/**
 * สร้าง Flight Ticket ใหม่
 * @param {Object} ticketData - ข้อมูลตั๋วเครื่องบิน
 * @returns {Promise<Object>} - ผลลัพธ์การสร้างตั๋ว
 */
export const createFlightTicket = async (ticketData) => {
  try {
    // เตรียมข้อมูลสำหรับส่งไป API Gateway
    const payload = {
      customerId: ticketData.customerId,
      supplierId: ticketData.supplierId,
      depositId: ticketData.depositId || null,
      paymentStatus: ticketData.paymentStatus || "unpaid",
      createdBy: ticketData.createdBy,
      updatedBy: ticketData.updatedBy,

      // Dates
      bookingDate: ticketData.bookingDate || null,
      dueDate: ticketData.dueDate || null,
      creditDays: ticketData.creditDays,

      // Pricing data
      pricing: ticketData.pricing || {},
      vatPercent: ticketData.vatPercent || 0,

      // Additional info
      code: ticketData.code,
      remark: ticketData.remark || "",

      // Related data
      passengers: ticketData.passengers || [],
      routes: ticketData.routes || [],
    };

    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.post("/gateway.php", {
      action: "createFlightTicket",
      data: payload,
    });

    if (!response.success) {
      console.error("Error creating flight ticket:", response.error);
      return {
        success: false,
        error: response.error,
      };
    }

    // API Gateway จะ return: { ticketId, referenceNumber, grandTotal, subtotal, vatAmount }
    return {
      success: true,
      referenceNumber: response.data.referenceNumber,
      ticketId: response.data.ticketId,
      grandTotal: response.data.grandTotal,
      subtotal: response.data.subtotal,
      vatAmount: response.data.vatAmount,
    };
  } catch (error) {
    console.error("Error creating flight ticket:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * ดึงข้อมูลตั๋วเครื่องบินตาม ID
 * @param {number} ticketId - ID ของตั๋ว
 * @returns {Promise<Object>} - ข้อมูลตั๋ว
 */
export const getFlightTicket = async (ticketId) => {
  try {
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.get("/gateway.php", {
      action: "getFlightTicketById",
      ticketId: ticketId,
    });

    if (!response.success) {
      console.error("Error fetching flight ticket:", response.error);
      return { success: false, error: response.error };
    }

    // API Gateway จะ return: { ticket, passengers, routes, pricing, extras }
    const ticketData = response.data;

    // รวมข้อมูลให้ตรงกับ format เดิม
    const fullTicketData = {
      ...ticketData.ticket,
      passengers: ticketData.passengers || [],
      routes: ticketData.routes || [],
      pricing: ticketData.pricing || {},
      additionalInfo: {
        code: ticketData.ticket.code,
        ticket_type: ticketData.ticket.ticket_type,
        ticket_type_details: ticketData.ticket.ticket_type_details,
        company_payment_method: ticketData.ticket.company_payment_method,
        company_payment_details: ticketData.ticket.company_payment_details,
        customer_payment_method: ticketData.ticket.customer_payment_method,
        customer_payment_details: ticketData.ticket.customer_payment_details,
      },
      extras: ticketData.extras || [],
    };

    return { success: true, data: fullTicketData };
  } catch (error) {
    console.error("Error fetching flight ticket:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ดึงรายการตั๋วเครื่องบินทั้งหมด
 * @param {Object} filters - ฟิลเตอร์การค้นหา
 * @returns {Promise<Object>} - รายการตั๋ว
 */
export const getFlightTickets = async (filters = {}) => {
  try {
    // เตรียม parameters สำหรับ API Gateway
    const params = {
      action: "getFlightTicketsList",
      filters: filters,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    };

    // จัดการ date filters
    if (filters.fromDate && filters.toDate) {
      // ใช้ฟังก์ชัน toThaiTimeZone เพื่อปรับเวลาก่อนใช้ในการกรอง
      const fromDate = toThaiTimeZone(new Date(filters.fromDate), false);
      const toDate = toThaiTimeZone(new Date(filters.toDate), false);

      params.startDate = fromDate;
      params.endDate = toDate;
    }

    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.get("/gateway.php", params);

    if (!response.success) {
      console.error("Error fetching flight tickets:", response.error);
      return { success: false, error: response.error };
    }

    return { success: true, data: response.data || [] };
  } catch (error) {
    console.error("Error fetching flight tickets:", error);
    return { success: false, error: error.message };
  }
};

/**
 * อัปเดตสถานะของตั๋วเครื่องบิน
 * @param {number} ticketId - ID ของตั๋ว
 * @param {string} status - สถานะใหม่
 * @param {number} userId - ID ของผู้ใช้ที่ทำการอัปเดต
 * @param {string} cancelReason - เหตุผลการยกเลิก (ถ้าสถานะเป็น cancelled)
 * @returns {Promise<Object>} - ผลลัพธ์การอัปเดต
 */
export const updateTicketStatus = async (
  ticketId,
  status,
  userId = null,
  cancelReason = ""
) => {
  try {
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.post("/gateway.php", {
      action: "updateTicketStatus",
      ticketId: ticketId,
      status: status,
      userId: userId,
      cancelReason: cancelReason,
    });

    if (!response.success) {
      console.error("Error updating ticket status:", response.error);
      return { success: false, error: response.error };
    }

    return {
      success: true,
      message: response.message || "Ticket status updated successfully",
    };
  } catch (error) {
    console.error("Error updating ticket status:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ยกเลิกตั๋วเครื่องบิน
 * @param {number} ticketId - ID ของตั๋ว
 * @param {number} userId - ID ของผู้ใช้ที่ยกเลิก
 * @param {string} cancelReason - เหตุผลการยกเลิก
 * @returns {Promise<Object>} - ผลลัพธ์การยกเลิก
 */
export const cancelFlightTicket = async (ticketId, userId, cancelReason) => {
  return await updateTicketStatus(ticketId, "cancelled", userId, cancelReason);
};

/**
 * ค้นหาตั๋วเครื่องบินด้วย reference number
 * @param {string} referenceNumber - หมายเลขอ้างอิง
 * @returns {Promise<Object>} - ข้อมูลตั๋ว
 */
export const getFlightTicketByReference = async (referenceNumber) => {
  try {
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.get("/gateway.php", {
      action: "getFlightTicketsList",
      filters: { reference_number: referenceNumber },
      limit: 1,
    });

    if (!response.success) {
      console.error("Error searching flight ticket:", response.error);
      return { success: false, error: response.error };
    }

    const tickets = response.data || [];

    if (tickets.length === 0) {
      return { success: false, error: "Ticket not found" };
    }

    // ดึงข้อมูลครบถ้วนของตั๋วที่พบ
    return await getFlightTicket(tickets[0].id);
  } catch (error) {
    console.error("Error searching flight ticket:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ดึงสถิติการขายตั๋วเครื่องบิน
 * @param {Object} dateRange - ช่วงวันที่
 * @returns {Promise<Object>} - สถิติการขาย
 */
export const getFlightTicketStats = async (dateRange = {}) => {
  try {
    const { startDate, endDate } = dateRange;

    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    const response = await apiClient.get("/gateway.php", {
      action: "getFlightTicketsList",
      startDate: startDate,
      endDate: endDate,
      limit: 1000, // ดึงข้อมูลเยอะๆ เพื่อคำนวณสถิติ
    });

    if (!response.success) {
      console.error("Error getting flight ticket stats:", response.error);
      return { success: false, error: response.error };
    }

    const tickets = response.data || [];

    // คำนวณสถิติ
    const stats = {
      totalTickets: tickets.length,
      totalAmount: tickets.reduce(
        (sum, ticket) => sum + parseFloat(ticket.grand_total || 0),
        0
      ),
      statusBreakdown: {
        not_invoiced: tickets.filter((t) => t.status === "not_invoiced").length,
        invoiced: tickets.filter((t) => t.status === "invoiced").length,
        cancelled: tickets.filter((t) => t.status === "cancelled").length,
      },
      paymentBreakdown: {
        unpaid: tickets.filter((t) => t.payment_status === "unpaid").length,
        paid: tickets.filter((t) => t.payment_status === "paid").length,
        partial: tickets.filter((t) => t.payment_status === "partial").length,
      },
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error("Error getting flight ticket stats:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ตรวจสอบว่าตั๋วสามารถแก้ไขได้หรือไม่
 * @param {Object} ticket - ข้อมูลตั๋ว
 * @returns {boolean} - สามารถแก้ไขได้หรือไม่
 */
export const canEditTicket = (ticket) => {
  if (!ticket) return false;

  // ไม่สามารถแก้ไขตั๋วที่ถูกยกเลิกแล้ว
  if (ticket.status === "cancelled") return false;

  // อื่นๆ สามารถแก้ไขได้
  return true;
};

/**
 * ตรวจสอบว่าตั๋วสามารถยกเลิกได้หรือไม่
 * @param {Object} ticket - ข้อมูลตั๋ว
 * @returns {boolean} - สามารถยกเลิกได้หรือไม่
 */
export const canCancelTicket = (ticket) => {
  if (!ticket) return false;

  // ไม่สามารถยกเลิกตั๋วที่ถูกยกเลิกแล้ว
  if (ticket.status === "cancelled") return false;

  // อื่นๆ สามารถยกเลิกได้
  return true;
};

/**
 * ตรวจสอบว่าตั๋วสามารถออก PO ได้หรือไม่
 * @param {Object} ticket - ข้อมูลตั๋ว
 * @returns {boolean} - สามารถออก PO ได้หรือไม่
 */
export const canGeneratePO = (ticket) => {
  if (!ticket) return false;

  // ไม่สามารถออก PO ให้ตั๋วที่ถูกยกเลิกแล้ว
  if (ticket.status === "cancelled") return false;

  // ถ้ามี PO แล้วไม่ต้องออกใหม่
  if (ticket.po_number && ticket.po_number.trim() !== "") return false;

  return true;
};

/**
 * ดึงข้อมูล tickets สำหรับ Invoice List (มี PO number แล้ว)
 * @param {Object} params - ตัวกรองและการจัดเรียง
 * @returns {Promise<Object>} - ผลลัพธ์การดึงข้อมูล
 */
export const getInvoiceTickets = async (params = {}) => {
  try {
    console.log("🔍 getInvoiceTickets params:", params);
    // ✅ ทำความสะอาด searchTerm ก่อนส่ง
    const cleanSearchTerm = params.searchTerm
      ? String(params.searchTerm).trim()
      : "";

    // ✅ เตรียม payload แบบ clean (ไม่ส่ง undefined)
    const payload = {
      action: "getInvoiceTickets",
      sortField: params.sortField || "created_at",
      sortDirection: params.sortDirection || "desc",
    };

    // ส่ง startDate/endDate เสมอ (ส่ง empty string ได้ เพื่อข้ามการกรองวันที่)
    payload.startDate = params.startDate || "";
    payload.endDate = params.endDate || "";
    if (params.searchTerm && params.searchTerm.trim() !== "") {
      payload.searchTerm = params.searchTerm.trim();
    }
    if (params.filterStatus) payload.filterStatus = params.filterStatus;

    const response = await apiClient.post("/gateway.php", payload);

    if (!response.success) {
      console.error("Error fetching invoice tickets:", response.error);
      return {
        success: false,
        error: response.error,
        data: [],
      };
    }

    return {
      success: true,
      data: response.data || [],
      count: response.count || 0,
    };
  } catch (error) {
    console.error("Error fetching invoice tickets:", error);
    return {
      success: false,
      error: error.message,
      data: [],
    };
  }
};

/**
 * ดึงข้อมูล tickets สำหรับ Receipt List (มี RC number แล้ว)
 * @param {Object} params - ตัวกรองและการจัดเรียง
 * @returns {Promise<Object>} - ผลลัพธ์การดึงข้อมูล
 */
export const getReceiptTickets = async (params = {}) => {
  try {
    // ✅ ทำความสะอาด searchTerm ก่อนส่ง
    const cleanSearchTerm = params.searchTerm
      ? String(params.searchTerm).trim()
      : "";

    const response = await apiClient.post("/gateway.php", {
      action: "getReceiptTickets",
      startDate: params.startDate,
      endDate: params.endDate,
      searchTerm: cleanSearchTerm,
      filterStatus: params.filterStatus || "all",
      sortField: params.sortField || "rc_generated_at",
      sortDirection: params.sortDirection || "desc",
    });

    if (!response.success) {
      console.error("Error fetching receipt tickets:", response.error);
      return {
        success: false,
        error: response.error,
        data: [],
      };
    }

    return {
      success: true,
      data: response.data || [],
      count: response.count || 0,
    };
  } catch (error) {
    console.error("Error fetching receipt tickets:", error);
    return {
      success: false,
      error: error.message,
      data: [],
    };
  }
};

/**
 * สร้างและบันทึก RC Number สำหรับ booking ticket
 * @param {number} ticketId - ID ของ booking ticket
 * @returns {Promise<Object>} - ผลลัพธ์การสร้าง RC
 */
// export const generateRCForTicket = async (ticketId) => {
//   try {
//     const response = await apiClient.post("/gateway.php", {
//       action: "generateRCForTicket",
//       ticketId: ticketId,
//     });

//     if (!response.success) {
//       console.error("Error generating RC Number:", response.error);
//       return {
//         success: false,
//         error: response.error,
//         rcNumber: null,
//       };
//     }

//     // API Gateway จะ return: { rcNumber, isNew, message }
//     return {
//       success: true,
//       rcNumber: response.data.rcNumber,
//       isNew: response.data.isNew,
//       message: response.data.message,
//     };
//   } catch (error) {
//     console.error("Error generating RC Number:", error);
//     return {
//       success: false,
//       error: error.message,
//       rcNumber: null,
//     };
//   }
// };
