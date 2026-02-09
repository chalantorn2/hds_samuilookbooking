// src/components/documents/services/voucherDataService.js
// แก้ไขการ map ข้อมูล customer ให้ถูกต้อง

import { apiClient } from "../../../services/apiClient";
import { generateVCForVoucher } from "../../../services/voucherService";
import {
  getDisplayCustomerName,
  getDisplayCustomerAddress,
  getDisplayCustomerPhone,
  getDisplayCustomerIdNumber,
  getDisplayCustomerBranchType,
  getDisplayCustomerBranchNumber,
} from "../../../utils/customerOverrideHelpers";

/**
 * ดึงและแปลงข้อมูลสำหรับการพิมพ์เอกสาร Voucher
 * @param {number} voucherId - ID ของ voucher
 * @param {number} userId - ID ของผู้ใช้ปัจจุบัน (สำหรับ Print = Edit)
 * @returns {Promise<Object>} - ข้อมูลที่แปลงแล้วสำหรับการพิมพ์
 */
export const getVoucherData = async (voucherId, userId = null) => {
  try {
    console.log("🎫 Starting voucher data processing for ID:", voucherId);

    // ขั้นตอนที่ 1: สร้าง VC Number ก่อน (ถ้ายังไม่มี)
    const vcResult = await generateVCForVoucher(voucherId);
    if (!vcResult.success) {
      console.warn("⚠️ Warning generating VC Number:", vcResult.error);
      // ไม่ throw error เพราะบางครั้งอาจมี VC แล้ว
    }

    // ขั้นตอนที่ 2: ดึงข้อมูล voucher ทั้งหมดจากฐานข้อมูล
    // ✅ Print = Edit: ส่ง userId ไปด้วยเพื่ออัปเดต updated_by
    const response = await apiClient.get("/gateway.php", {
      action: "getVoucherById",
      voucherId: voucherId,
      userId: userId, // ส่ง userId เพื่ออัปเดต updated_by
    });

    if (!response.success) {
      throw new Error(response.error || "ไม่สามารถดึงข้อมูล voucher ได้");
    }

    const voucher = response.data.voucher;
    const details = response.data.details || {};
    const passengers = response.data.passengers || [];
    const pricing = response.data.pricing || {};
    const rawCustomer = response.data.customer || {}; // ✅ เพิ่ม: ดึงข้อมูล customer จาก response

    // ดึงข้อมูลผู้ใช้ (updated_by หรือ created_by)
    const displayUserId = voucher.updated_by || voucher.created_by;
    const userIds = [displayUserId].filter(Boolean);
    let updatedByName = null;

    if (userIds.length > 0) {
      const usersResponse = await apiClient.post("/gateway.php", {
        action: "getUsersByIds",
        userIds: userIds,
      });

      if (usersResponse.success && usersResponse.data) {
        const userMap = new Map(
          usersResponse.data.map((user) => [user.id, user.fullname])
        );
        updatedByName = userMap.get(displayUserId) || null;
      }
    }

    console.log("🎫 Raw API response debug:", {
      voucherId: voucher.id,
      vcNumber: voucher.vc_number,
      rawCustomer,
      hasCustomer: !!rawCustomer.name,
      passengersCount: passengers.length,
    });

    // ✅ แก้ไข: สร้าง customer object ที่มีข้อมูลครบ
    // ใช้ข้อมูลจาก response.data.customer แทนการสร้างใหม่
    const voucherWithOverride = {
      ...voucher,
      customer: rawCustomer,
      customer_override_data:
        voucher.customer_override_data || response.data.customer_override_data,
    };

    const customerInfo = {
      name: getDisplayCustomerName(voucherWithOverride),
      address: getDisplayCustomerAddress(voucherWithOverride),
      phone: getDisplayCustomerPhone(voucherWithOverride),
      email: rawCustomer.email,
      taxId: getDisplayCustomerIdNumber(voucherWithOverride),
      branch: getBranchDisplay(
        getDisplayCustomerBranchType(voucherWithOverride),
        getDisplayCustomerBranchNumber(voucherWithOverride)
      ),
    };

    console.log("🎫 Processed customer info:", customerInfo);

    // แปลงข้อมูลเอกสาร - ใช้ key เดียวกับ Invoice เพื่อ compatibility
    const voucherInfo = {
      vcNumber: voucher.vc_number || vcResult.vcNumber,
      poNumber: voucher.po_number || "", // อาจมีหรือไม่มี
      date: formatDate(details.issue_date || voucher.issue_date),
      dueDate: formatDate(details.due_date || voucher.due_date),
      salesPerson: voucher.user?.fullname || "System",
    };

    // แปลงข้อมูลผู้โดยสาร - format สำหรับ VoucherTable
    const voucherPassengers = passengers.map((p, index) => ({
      id: p.id,
      passenger_name: p.passenger_name || "",
      passenger_type: p.passenger_type || "ADT",
      voucher_number: p.voucher_number || "",
      index: index + 1,
    }));

    // แปลงข้อมูลบริการ - เฉพาะสำหรับ Voucher
    const voucherData = {
      // ข้อมูลพื้นฐาน
      totalPax: passengers.length,
      serviceType: voucher.service_type || "bus",

      // รายละเอียดบริการ
      description: details.description || "ไม่มีรายละเอียด",

      // ข้อมูลการเดินทาง
      tripDate: details.trip_date || "",

      // ข้อมูลที่พัก
      hotel: details.hotel || "",
      roomNo: details.room_no || "",
      pickupTime: details.pickup_time || "",

      // ข้อมูล Supplier
      supplierName: voucher.supplier_name || "",
      supplierPhone: response.data.supplier?.phone || "",

      // หมายเหตุ
      remark: details.remark || "",

      // เลขอ้างอิง
      reference: details.reference || "",
    };

    // แปลงข้อมูลราคา - ใช้ format เดียวกับ Invoice เพื่อ compatibility
    const summary = {
      subtotal: details.subtotal_before_vat || pricing.subtotal_amount || 0,
      vatPercent: details.vat_percent || pricing.vat_percent || 0,
      vat: details.vat_amount || pricing.vat_amount || 0,
      total: details.grand_total || pricing.total_amount || 0,
    };

    console.log("🎫 Voucher data processing completed successfully");
    console.log("📞 Debug - Supplier data:", response.data.supplier);
    console.log("📞 Debug - Supplier phone:", response.data.supplier?.phone);
    console.log("📞 Debug - voucherData:", voucherData);

    // Return ใน format เดียวกับ getInvoiceData เพื่อ compatibility
    return {
      success: true,
      data: {
        customer: customerInfo, // ✅ ข้อมูล customer ที่ถูกต้อง
        invoice: voucherInfo, // ใช้ key เดิมเพื่อ compatibility
        voucherData: voucherData, // ข้อมูลเฉพาะ voucher สำหรับ VoucherTable
        passengers: voucherPassengers, // รายชื่อผู้โดยสาร
        pricing: pricing, // ✅ เพิ่ม: ส่ง pricing object สำหรับ VoucherTable
        flights: { supplierName: "", routeDisplay: "" }, // Empty สำหรับ compatibility
        passengerTypes: [], // Empty สำหรับ compatibility
        extras: [], // Empty สำหรับ compatibility
        summary: summary, // ยอดรวม
        vcResult: vcResult, // ผลลัพธ์การสร้าง VC

        // ✅ เพิ่มส่วนนี้เพื่อ DocumentViewer
        customer_override_data:
          voucher.customer_override_data ||
          response.data.customer_override_data ||
          null,
        updatedByName: response.data.updatedByName || updatedByName,
        issueDate: response.data.issueDate || voucher.issue_date, // ใช้ issue_date จาก Backend
      },
    };
  } catch (error) {
    console.error("🎫 ❌ Error in getVoucherData:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * แปลงวันที่เป็นรูปแบบ DD/MM/YYYY
 */
const formatDate = (dateString) => {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    console.warn("Date formatting error:", error);
    return dateString; // ใช้ค่าเดิมถ้าแปลงไม่ได้
  }
};

/**
 * แปลงข้อมูลสาขาให้แสดงผลถูกต้อง
 */
const getBranchDisplay = (branchType, branchNumber) => {
  if (branchType === "Branch" && branchNumber) {
    return `${branchType} ${branchNumber}`;
  }
  return branchType || "Head Office";
};

// ✅ เก็บ functions อื่นๆ ไว้เหมือนเดิม
export const canPrintVoucher = (voucher) => {
  if (!voucher) {
    return {
      canPrint: false,
      reason: "ไม่มีข้อมูล voucher",
    };
  }

  if (voucher.status === "cancelled") {
    return {
      canPrint: false,
      reason: "Voucher ถูกยกเลิกแล้ว ไม่สามารถพิมพ์ได้",
    };
  }

  if (!voucher.customer_id) {
    return {
      canPrint: false,
      reason: "ไม่มีข้อมูลลูกค้า",
    };
  }

  return {
    canPrint: true,
    reason: "",
  };
};

export const generateVoucherReference = async (serviceType = "bus") => {
  try {
    const response = await apiClient.get("/gateway.php", {
      action: "generateVoucherReferenceNumber",
      serviceType: serviceType,
    });

    if (response.success) {
      return response.data.reference_number;
    } else {
      // Fallback: สร้างเลขอ้างอิงแบบง่าย
      const prefixMap = { bus: "VC-BS", boat: "VC-BT", tour: "VC-TR" };
      const prefix = prefixMap[serviceType] || "VC-BS";
      const year = new Date().getFullYear().toString().slice(-2);
      const month = (new Date().getMonth() + 1).toString().padStart(2, "0");
      const randomPart = Math.floor(1000 + Math.random() * 9000);

      return `${prefix}-${year}${month}-${randomPart
        .toString()
        .padStart(4, "0")}`;
    }
  } catch (error) {
    console.error("Error generating voucher reference:", error);

    // Fallback สำหรับกรณี error
    const prefixMap = { bus: "VC-BS", boat: "VC-BT", tour: "VC-TR" };
    const prefix = prefixMap[serviceType] || "VC-BS";
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, "0");
    const randomPart = Math.floor(1000 + Math.random() * 9000);

    return `${prefix}-${year}${month}-${randomPart
      .toString()
      .padStart(4, "0")}`;
  }
};

export const prepareVoucherForPrint = async (voucherId) => {
  try {
    // ตรวจสอบสิทธิ์การพิมพ์
    const basicResponse = await apiClient.get("/gateway.php", {
      action: "getVoucherById",
      voucherId: voucherId,
    });

    if (!basicResponse.success) {
      return {
        success: false,
        error: "ไม่พบข้อมูล voucher",
      };
    }

    const printCheck = canPrintVoucher(basicResponse.data.voucher);
    if (!printCheck.canPrint) {
      return {
        success: false,
        error: printCheck.reason,
      };
    }

    // ดึงข้อมูลเต็มสำหรับการพิมพ์
    const voucherData = await getVoucherData(voucherId);

    if (!voucherData.success) {
      return {
        success: false,
        error: voucherData.error,
      };
    }

    return {
      success: true,
      data: voucherData.data,
      message: "ข้อมูล voucher พร้อมพิมพ์",
    };
  } catch (error) {
    console.error("Error preparing voucher for print:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};
