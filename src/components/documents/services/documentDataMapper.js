// src/components/documents/services/documentDataMapper.js
// ย้ายจาก src/pages/View/common/documentDataMapper.js
import { apiClient } from "../../../services/apiClient";
import { generatePOForTicket } from "../../../services/ticketService";
import {
  getDisplayCustomerName,
  getDisplayCustomerAddress,
  getDisplayCustomerPhone,
  getDisplayCustomerIdNumber,
  getDisplayCustomerBranchType,
  getDisplayCustomerBranchNumber,
} from "../../../utils/customerOverrideHelpers";

/**
 * Helper function to get data with case-insensitive key lookup
 * รองรับทั้ง lowercase และ UPPERCASE keys
 */
const getSelectionData = (selectionData, key) => {
  if (!selectionData) return null;

  // ลองหา lowercase ก่อน
  if (selectionData[key]) {
    return selectionData[key];
  }

  // ถ้าไม่มี ลองหา UPPERCASE
  if (selectionData[key.toUpperCase()]) {
    return selectionData[key.toUpperCase()];
  }

  // ถ้าไม่มีทั้งคู่ return null
  return null;
};

/**
 * ดึงและแปลงข้อมูลสำหรับการพิมพ์เอกสาร Invoice
 * @param {number} ticketId - ID ของ ticket
 * @param {number} userId - ID ของผู้ใช้ปัจจุบัน (สำหรับ Print = Edit)
 * @param {boolean} isInvoice - true ถ้าต้องการใช้ invoice_number แทน po_number
 * @returns {Promise<Object>} - ข้อมูลที่แปลงแล้วสำหรับการพิมพ์
 */
export const getInvoiceData = async (
  ticketId,
  userId = null,
  isInvoice = false
) => {
  try {
    // ขั้นตอนที่ 1: สร้าง INV Number ก่อน
    // ✅ ส่ง userId สำหรับ Activity Log "issue"
    let documentResult;
    if (isInvoice) {
      // สำหรับ INV - ไม่ต้องสร้าง INV ใหม่ เพราะ INV ถูกสร้างพร้อม FT แล้ว
      // แค่ตรวจสอบว่ามี invoice_number หรือไม่
      documentResult = { success: true };
    } else {
      // สำหรับ Invoice ปกติ - สร้าง INV Number
      const poResult = await generatePOForTicket(ticketId, userId);
      if (!poResult.success) {
        throw new Error(poResult.error);
      }
      documentResult = poResult;
    }

    // ขั้นตอนที่ 2: ดึงข้อมูลทั้งหมดจากฐานข้อมูล
    // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
    // ✅ Print = Edit: ส่ง userId ไปด้วยเพื่ออัปเดต updated_by
    const response = await apiClient.get("/gateway.php", {
      action: "getInvoiceDataForTicket",
      ticketId: ticketId,
      userId: userId, // ส่ง userId เพื่ออัปเดต updated_by
      documentType: "invoice", // ✅ ส่ง documentType สำหรับ Activity Log
    });

    if (!response.success) {
      throw new Error(response.error || "ไม่สามารถดึงข้อมูลตั๋วได้");
    }

    const ticket = response.data;

    console.log("🎟️ Invoice - Raw ticket data:", {
      updated_by: ticket.updated_by,
      created_by: ticket.created_by,
      updated_at: ticket.updated_at,
      created_at: ticket.created_at,
    });

    // 🔍 DEBUG: Check routes data for city_name
    console.log("🔍 DEBUG Routes Data:", ticket.routes?.slice(0, 1));

    // ดึงข้อมูลผู้ใช้ (updated_by หรือ created_by)
    const displayUserId = ticket.updated_by || ticket.created_by;
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

    console.log("🎟️ Invoice - User info:", {
      displayUserId: displayUserId,
      updatedByName: updatedByName,
    });

    // เก็บ logic การ process ข้อมูลเหมือนเดิมทั้งหมด
    const detail = ticket.tickets_detail?.[0] || {};
    const additional = ticket.ticket_additional_info?.[0] || {};
    const pricing = ticket.tickets_pricing?.[0] || {};

    const ticketWithOverride = {
      ...ticket,
      customer_override_data:
        ticket.customer?.customer_override_data ||
        ticket.customer_override_data,
    };

    console.log("🔍 Invoice - Debug customer data:", {
      hasCustomer: !!ticket.customer,
      customerId: ticket.customer?.id,
      customerIdNumber: ticket.customer?.id_number,
      hasOverride: !!ticketWithOverride.customer_override_data,
      overrideData: ticketWithOverride.customer_override_data,
    });

    // ✅ Parse override data ถ้ามี
    let overrideData = null;
    if (ticketWithOverride.customer_override_data) {
      try {
        overrideData = typeof ticketWithOverride.customer_override_data === 'string'
          ? JSON.parse(ticketWithOverride.customer_override_data)
          : ticketWithOverride.customer_override_data;
      } catch (e) {
        console.error("Failed to parse override data:", e);
      }
    }

    const customerInfo = {
      name: getDisplayCustomerName(ticketWithOverride),
      address: getDisplayCustomerAddress(ticketWithOverride),
      // ✅ เพิ่ม addressLine1-3 แยกกัน สำหรับการแสดงผลที่ถูกต้อง
      addressLine1: overrideData?.address_line1 || ticket.customer?.address_line1 || "",
      addressLine2: overrideData?.address_line2 || ticket.customer?.address_line2 || "",
      addressLine3: overrideData?.address_line3 || ticket.customer?.address_line3 || "",
      phone: getDisplayCustomerPhone(ticketWithOverride),
      email: ticket.customer?.email,
      taxId: getDisplayCustomerIdNumber(ticketWithOverride),
      branch: getBranchDisplay(
        getDisplayCustomerBranchType(ticketWithOverride),
        getDisplayCustomerBranchNumber(ticketWithOverride)
      ),
    };

    console.log("🔍 Invoice - Customer info result:", customerInfo);

    // แปลงข้อมูลใบแจ้งหนี้
    const invoiceInfo = {
      poNumber: isInvoice
        ? ticket.invoice_number || ""
        : ticket.po_number || documentResult.poNumber,
      invoiceNumber: ticket.invoice_number || "",
      date: formatDate(detail.issue_date),
      dueDate: formatDate(detail.due_date),
      salesPerson: ticket.user?.fullname || "System",
    };

    // เก็บ logic การ process passengers เหมือนเดิมทั้งหมด
    const MAX_PASSENGERS_DISPLAY = 6;
    const allPassengers = ticket.tickets_passengers || [];
    const passengers = [];

    // แสดงผู้โดยสารแค่ 6 คนแรก (logic เดิม)
    const displayPassengers = allPassengers.slice(0, MAX_PASSENGERS_DISPLAY);

    // สร้าง 6 บรรทัดเสมอ (logic เดิม)
    for (let i = 0; i < MAX_PASSENGERS_DISPLAY; i++) {
      if (i < displayPassengers.length) {
        const p = displayPassengers[i];
        passengers.push({
          index: i + 1,
          name: p.passenger_name || "",
          age: p.age || "",
          ticketNumber: p.ticket_number || "",
          ticketCode: p.ticket_code || "",
          hasData: true,
          displayData: {
            index: `${i + 1}.`,
            name: p.passenger_name || "",
            age: p.age || "",
            ticketNumber: p.ticket_number || "",
            ticketCode: p.ticket_code || "",
          },
        });
      } else {
        // เติมบรรทัดว่าง (ไม่แสดงเลขลำดับ) - logic เดิม
        passengers.push({
          index: i + 1,
          name: "",
          age: "",
          ticketNumber: "",
          ticketCode: "",
          hasData: false,
          displayData: null,
        });
      }
    }

    // แปลงข้อมูลเที่ยวบิน - ใช้ Multi-Segment Route Format (เหมือนเดิม)
    const routes = ticket.tickets_routes || [];
    const multiSegmentRoute = generateMultiSegmentRoute(routes);
    const supplierName = ticket.supplier?.name || "";

    // สร้างข้อมูล flights สำหรับแสดงในตาราง (เหมือนเดิม)
    const flights = {
      supplierName,
      multiSegmentRoute,
      routeDisplay: multiSegmentRoute || "N/A",
      routes: routes || [], // ✅ เพิ่ม routes array เต็ม ๆ เหมือน Deposit
    };

    // แปลงข้อมูลราคาผู้โดยสาร (เฉพาะที่มี pax > 0) - logic เดิม
    const passengerTypes = [];
    if (pricing.adt1_pax > 0) {
      passengerTypes.push({
        type: "ADT 1",
        quantity: pricing.adt1_pax,
        unitPrice: pricing.adt1_sale_price || 0,
        amount: pricing.adt1_total || 0,
        priceDisplay: `${formatCurrencyNoDecimal(
          pricing.adt1_sale_price || 0
        )} x ${pricing.adt1_pax}`,
      });
    }
    if (pricing.adt2_pax > 0) {
      passengerTypes.push({
        type: "ADT 2",
        quantity: pricing.adt2_pax,
        unitPrice: pricing.adt2_sale_price || 0,
        amount: pricing.adt2_total || 0,
        priceDisplay: `${formatCurrencyNoDecimal(
          pricing.adt2_sale_price || 0
        )} x ${pricing.adt2_pax}`,
      });
    }
    if (pricing.adt3_pax > 0) {
      passengerTypes.push({
        type: "ADT 3",
        quantity: pricing.adt3_pax,
        unitPrice: pricing.adt3_sale_price || 0,
        amount: pricing.adt3_total || 0,
        priceDisplay: `${formatCurrencyNoDecimal(
          pricing.adt3_sale_price || 0
        )} x ${pricing.adt3_pax}`,
      });
    }

    // เพิ่มบรรทัดว่างให้ครบ 3 บรรทัด (logic เดิม)
    while (passengerTypes.length < 3) {
      passengerTypes.push({
        type: "",
        quantity: 0,
        unitPrice: 0,
        amount: 0,
        priceDisplay: "",
      });
    }

    // แปลงข้อมูลรายการเพิ่มเติม - แสดงครบทุกรายการ แต่ขั้นต่ำ 3 บรรทัด (logic เดิม)
    const MIN_EXTRAS_DISPLAY = 3;
    const allExtras = ticket.tickets_extras || [];
    const extras = [];

    // คำนวณจำนวนบรรทัดที่ต้องแสดง (แสดงครบทุกรายการ หรือขั้นต่ำ 3 บรรทัด) - logic เดิม
    const displayCount = Math.max(allExtras.length, MIN_EXTRAS_DISPLAY);

    // สร้างรายการแสดงผล (logic เดิม)
    for (let i = 0; i < displayCount; i++) {
      if (i < allExtras.length) {
        const extra = allExtras[i];
        extras.push({
          description: extra.description || "",
          quantity: extra.quantity || 1,
          unitPrice: extra.sale_price || 0,
          amount: extra.total_amount || 0,
          priceDisplay: extra.sale_price
            ? `${formatCurrencyNoDecimal(extra.sale_price)} x ${
                extra.quantity || 1
              }`
            : "",
        });
      } else {
        // เติมบรรทัดว่าง (logic เดิม)
        extras.push({
          description: "",
          quantity: 0,
          unitPrice: 0,
          amount: 0,
          priceDisplay: "",
        });
      }
    }

    // สรุปยอดเงิน (logic เดิม)
    const summary = {
      subtotal: detail.subtotal_before_vat || 0,
      vatPercent: detail.vat_percent || 0,
      vat: detail.vat_amount || 0,
      total: detail.grand_total || 0,
    };

    // Return data
    return {
      success: true,
      data: {
        customer: customerInfo,
        invoice: invoiceInfo,
        passengers,
        flights,
        passengerTypes,
        extras,
        summary,
        remark: additional.remark || "",
        poResult: isInvoice ? null : documentResult,
        updatedByName: updatedByName,
        issueDate: ticket.updated_at || ticket.created_at,
      },
    };
  } catch (error) {
    console.error("Error getting invoice data:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * สร้าง Multi-Segment Route Format (แสดงเต็มทุก routes)
 * ใช้สำหรับ Print และ Email - แสดง routes ทั้งหมดโดยไม่จำกัด
 * @param {Array} routes - array ของเส้นทาง
 * @returns {string} - route ในรูปแบบ Multi-Segment (ไม่จำกัดจำนวน airports)
 */
export const generateMultiSegmentRoute = (routes) => {
  if (!routes || routes.length === 0) return "";

  const routeSegments = [];
  let currentSegment = [];

  routes.forEach((route, index) => {
    const origin = route.origin;
    const destination = route.destination;

    if (currentSegment.length === 0) {
      // เริ่มต้น segment ใหม่
      currentSegment = [origin, destination];
    } else {
      // ตรวจสอบว่าต่อเนื่องกับ segment ปัจจุบันหรือไม่
      const lastDestination = currentSegment[currentSegment.length - 1];

      if (origin === lastDestination) {
        // ต่อเนื่อง - เพิ่ม destination
        currentSegment.push(destination);
      } else {
        // ไม่ต่อเนื่อง - บันทึก segment เดิมและเริ่มใหม่
        routeSegments.push(currentSegment.join("-"));
        currentSegment = [origin, destination];
      }
    }

    // ถ้าเป็นเส้นทางสุดท้าย ให้บันทึก segment ปัจจุบัน
    if (index === routes.length - 1) {
      routeSegments.push(currentSegment.join("-"));
    }
  });

  // รวม segments ด้วย "//"
  return routeSegments.join("//");
};

/**
 * แปลงที่อยู่ลูกค้าสำหรับการพิมพ์ (หลายบรรทัด)
 * @param {Object} customer - ข้อมูลลูกค้า
 * @returns {string} - ที่อยู่ที่แปลงแล้ว (ขึ้นบรรทัดใหม่ด้วย \n)
 */
const formatCustomerAddressForPrint = (customer) => {
  if (!customer) return "";

  const addressLines = [
    customer.address_line1,
    customer.address_line2,
    customer.address_line3,
  ].filter((line) => line && line.trim() !== "");

  return addressLines.join("\n"); // ใช้ \n สำหรับขึ้นบรรทัดใหม่
};

/**
 * แปลงวันที่เป็นรูปแบบ DD/MM/YYYY
 */
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * แปลงวันที่เที่ยวบินเป็นรูปแบบ ddMMM (เช่น 05APR)
 */
const formatRouteDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const day = date.getDate().toString().padStart(2, "0");
  const monthNames = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const month = monthNames[date.getMonth()];

  return `${day}${month}`;
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

/**
 * จัดรูปแบบตัวเลขไม่มีทศนิยม (สำหรับราคาต่อหน่วย)
 */
export const formatCurrencyNoDecimal = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return "0";
  return Math.floor(parseFloat(amount)).toLocaleString("th-TH");
};

/**
 * จัดรูปแบบตัวเลขมีทศนิยม 2 ตำแหน่ง (สำหรับยอดรวม)
 */
export const formatCurrencyWithDecimal = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return "0.00";
  return parseFloat(amount).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * จัดรูปแบบตัวเลขไม่มีทศนิยม (backward compatibility)
 */
export const formatCurrency = (amount) => {
  return formatCurrencyNoDecimal(amount);
};

/**
 * แปลงตัวเลขเป็นตัวอักษรภาษาอังกฤษ
 */
export const numberToEnglishText = (amount) => {
  if (amount === 0) return "Zero";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const thousands = ["", "Thousand", "Million", "Billion"];

  function convertHundreds(num) {
    let result = "";

    if (num >= 100) {
      result += ones[Math.floor(num / 100)] + " Hundred ";
      num %= 100;
    }

    if (num >= 20) {
      result += tens[Math.floor(num / 10)] + " ";
      num %= 10;
    } else if (num >= 10) {
      result += teens[num - 10] + " ";
      return result.trim();
    }

    if (num > 0) {
      result += ones[num] + " ";
    }

    return result.trim();
  }

  let integerPart = Math.floor(amount); // เปลี่ยนจาก const เป็น let
  let result = "";
  let thousandIndex = 0;

  if (integerPart === 0) {
    return "Zero";
  }

  while (integerPart > 0) {
    const chunk = integerPart % 1000;
    if (chunk !== 0) {
      const chunkText = convertHundreds(chunk);
      result =
        chunkText +
        (thousands[thousandIndex] ? " " + thousands[thousandIndex] : "") +
        (result ? " " + result : "");
    }
    integerPart = Math.floor(integerPart / 1000); // ตอนนี้สามารถ assign ได้แล้ว
    thousandIndex++;
  }

  return result.trim();
};

/**
 * ดึงและแปลงข้อมูลสำหรับการพิมพ์เอกสาร Receipt
 * @param {number} ticketId - ID ของ ticket
 * @param {Object} selectionData - ข้อมูลที่เลือกจาก ReceiptSelectionModal
 * @returns {Promise<Object>} - ข้อมูลที่แปลงแล้วสำหรับการพิมพ์
 */
export const getReceiptData = async (
  ticketId,
  selectionData,
  userId = null
) => {
  try {
    console.log("🔧 getReceiptData เริ่มทำงาน:", {
      ticketId,
      userId,
      hasSelectionData: !!selectionData,
      selectionDataKeys: selectionData ? Object.keys(selectionData) : "ไม่มี",
      selectionDataType: typeof selectionData,
    });

    // ถ้ามี selectionData ส่งมา ให้แสดงรายละเอียด
    if (selectionData) {
      console.log("🔧 ข้อมูล selectionData ที่ได้รับ:", {
        passengers: selectionData.passengers || "ไม่มี lowercase",
        PASSENGERS: selectionData.PASSENGERS || "ไม่มี UPPERCASE",
        extras: selectionData.extras || "ไม่มี lowercase",
        EXTRAS: selectionData.EXTRAS || "ไม่มี UPPERCASE",
        totals: selectionData.totals || "ไม่มี lowercase",
        TOTALS: selectionData.TOTALS || "ไม่มี UPPERCASE",
      });
    }

    // ⭐ ถ้าไม่มี selectionData ส่งมา ให้ดึงจากฐานข้อมูล
    let actualSelectionData = selectionData;

    if (!actualSelectionData) {
      // ดึง selection data จากฐานข้อมูล (ไม่ต้องส่ง documentType เพราะแค่เช็คข้อมูล)
      const response = await apiClient.get("/gateway.php", {
        action: "getInvoiceDataForTicket",
        ticketId: ticketId,
      });

      if (response.success && response.data.rc_selection_data) {
        actualSelectionData = response.data.rc_selection_data;
      }
    }

    // ขั้นตอนที่ 1: สร้าง RC Number ก่อน
    const rcResult = await generateRCForTicket(ticketId, actualSelectionData);
    if (!rcResult.success) {
      throw new Error(rcResult.error);
    }

    // ขั้นตอนที่ 2: ดึงข้อมูลทั้งหมดจากฐานข้อมูล
    const response = await apiClient.get("/gateway.php", {
      action: "getInvoiceDataForTicket",
      ticketId: ticketId,
      userId: userId, // ✅ ส่ง userId สำหรับ Activity Log
      documentType: "receipt", // ✅ ส่ง documentType สำหรับ Activity Log
    });

    if (!response.success) {
      throw new Error(response.error || "ไม่สามารถดึงข้อมูลตั๋วได้");
    }

    const ticket = response.data;

    console.log("🧾 Receipt - Raw ticket data:", {
      updated_by: ticket.updated_by,
      created_by: ticket.created_by,
      updated_at: ticket.updated_at,
      created_at: ticket.created_at,
    });

    // ดึงข้อมูลผู้ใช้ (updated_by หรือ created_by) สำหรับ Receipt
    const receiptUserId = ticket.updated_by || ticket.created_by;
    const receiptUserIds = [receiptUserId].filter(Boolean);
    let receiptUpdatedByName = null;

    if (receiptUserIds.length > 0) {
      const usersResponse = await apiClient.post("/gateway.php", {
        action: "getUsersByIds",
        userIds: receiptUserIds,
      });

      if (usersResponse.success && usersResponse.data) {
        const userMap = new Map(
          usersResponse.data.map((user) => [user.id, user.fullname])
        );
        receiptUpdatedByName = userMap.get(receiptUserId) || null;
      }
    }

    console.log("🧾 Receipt - User info:", {
      receiptUserId: receiptUserId,
      receiptUpdatedByName: receiptUpdatedByName,
    });

    const detail = ticket.tickets_detail?.[0] || {};
    const additional = ticket.ticket_additional_info?.[0] || {};

    const ticketWithOverride = {
      ...ticket,
      customer_override_data:
        ticket.customer?.customer_override_data ||
        ticket.customer_override_data,
    };

    console.log("🔍 Receipt - Debug customer data:", {
      hasCustomer: !!ticket.customer,
      customerId: ticket.customer?.id,
      customerIdNumber: ticket.customer?.id_number,
      hasOverride: !!ticketWithOverride.customer_override_data,
      overrideData: ticketWithOverride.customer_override_data,
    });

    // ✅ Parse override data ถ้ามี
    let receiptOverrideData = null;
    if (ticketWithOverride.customer_override_data) {
      try {
        receiptOverrideData = typeof ticketWithOverride.customer_override_data === 'string'
          ? JSON.parse(ticketWithOverride.customer_override_data)
          : ticketWithOverride.customer_override_data;
      } catch (e) {
        console.error("Failed to parse override data:", e);
      }
    }

    const customerInfo = {
      name: getDisplayCustomerName(ticketWithOverride),
      address: getDisplayCustomerAddress(ticketWithOverride),
      // ✅ เพิ่ม addressLine1-3 แยกกัน สำหรับการแสดงผลที่ถูกต้อง
      addressLine1: receiptOverrideData?.address_line1 || ticket.customer?.address_line1 || "",
      addressLine2: receiptOverrideData?.address_line2 || ticket.customer?.address_line2 || "",
      addressLine3: receiptOverrideData?.address_line3 || ticket.customer?.address_line3 || "",
      phone: getDisplayCustomerPhone(ticketWithOverride),
      email: ticket.customer?.email,
      taxId: getDisplayCustomerIdNumber(ticketWithOverride),
      branch: getBranchDisplay(
        getDisplayCustomerBranchType(ticketWithOverride),
        getDisplayCustomerBranchNumber(ticketWithOverride)
      ),
    };

    console.log("🔍 Receipt - Customer info result:", customerInfo);
    // แปลงข้อมูล Receipt (ใช้ RC Number)
    // ✅ ใช้ invoice_number เป็นหลัก fallback เป็น po_number
    const receiptInfo = {
      poNumber: ticket.invoice_number || ticket.po_number || "",
      rcNumber: ticket.rc_number || rcResult.rcNumber,
      date: formatDate(detail.issue_date),
      dueDate: formatDate(detail.due_date),
      salesPerson: ticket.user?.fullname || "System",
    };

    // 🔧 ประมวลผลผู้โดยสารที่เลือก - ใช้ helper function
    const MAX_PASSENGERS_DISPLAY = 6;

    // ✅ Fallback: ถ้าไม่มี selectionData ให้ใช้ข้อมูลทั้งหมดจาก ticket
    let selectedPassengerData, selectedExtraData, calculatedTotals;

    if (actualSelectionData) {
      selectedPassengerData =
        getSelectionData(actualSelectionData, "passengers") || [];
      selectedExtraData =
        getSelectionData(actualSelectionData, "extras") || [];
      calculatedTotals =
        getSelectionData(actualSelectionData, "totals") || {};
    } else {
      // ไม่มี selectionData → ใช้ passengers/extras/totals ทั้งหมดจาก ticket
      selectedPassengerData = (ticket.tickets_passengers || []).map((p) => ({
        passenger_name: p.passenger_name,
        age: p.age,
        ticket_number: p.ticket_number,
        ticket_code: p.ticket_code,
      }));
      selectedExtraData = (ticket.tickets_extras || []).map((e) => ({
        description: e.description,
        sale_price: e.sale_price,
        selectedQuantity: e.quantity,
      }));
      calculatedTotals = {
        subtotal: detail.subtotal_before_vat || 0,
        vatAmount: detail.vat_amount || 0,
        total: detail.grand_total || 0,
        selectedPassengerTypes: (() => {
          // ใช้ข้อมูลจาก tickets_pricing เหมือน Invoice
          const pricing = ticket.tickets_pricing?.[0] || {};
          return {
            ADT1: parseInt(pricing.adt1_pax) || 0,
            ADT2: parseInt(pricing.adt2_pax) || 0,
            ADT3: parseInt(pricing.adt3_pax) || 0,
          };
        })(),
      };
      console.log("🔧 Fallback: ใช้ข้อมูลทั้งหมดจาก ticket (ไม่มี selectionData)");
    }

    console.log("🔧 หลังจากใช้ getSelectionData:", {
      selectedPassengerCount: selectedPassengerData.length,
      selectedExtraCount: selectedExtraData.length,
      hasTotals: !!calculatedTotals && Object.keys(calculatedTotals).length > 0,
      totalsKeys: calculatedTotals ? Object.keys(calculatedTotals) : "ไม่มี",
    });

    const passengers = [];

    console.log("🔧 กำลังประมวลผลผู้โดยสาร:", {
      maxDisplay: MAX_PASSENGERS_DISPLAY,
      actualPassengerCount: selectedPassengerData.length,
      firstPassenger: selectedPassengerData[0] || "ไม่มี",
    });

    // สร้าง 6 บรรทัดเสมอ (แต่แสดงเฉพาะที่เลือก)
    for (let i = 0; i < MAX_PASSENGERS_DISPLAY; i++) {
      if (i < selectedPassengerData.length) {
        const p = selectedPassengerData[i];
        // 🔧 รองรับทั้ง UPPERCASE และ lowercase field names
        const passengerName = p.passenger_name || p.PASSENGER_NAME || "";
        const passengerAge = p.age || p.AGE || "";
        const passengerTicketNumber = p.ticket_number || p.TICKET_NUMBER || "";
        const passengerTicketCode = p.ticket_code || p.TICKET_CODE || "";

        passengers.push({
          index: i + 1,
          name: passengerName,
          age: passengerAge,
          ticketNumber: passengerTicketNumber,
          ticketCode: passengerTicketCode,
          hasData: true,
          displayData: {
            index: `${i + 1}.`,
            name: passengerName,
            age: passengerAge,
            ticketNumber: passengerTicketNumber,
            ticketCode: passengerTicketCode.replace(/-/g, "\u2011"),
          },
        });
      } else {
        passengers.push({
          index: i + 1,
          name: "",
          age: "",
          ticketNumber: "",
          ticketCode: "",
          hasData: false,
          displayData: null,
        });
      }
    }

    // หลังจากสร้าง passengers array
    const passengersWithData = passengers.filter((p) => p.hasData);
    console.log("🔧 ผลลัพธ์ passengers array:", {
      totalSlots: passengers.length,
      slotsWithData: passengersWithData.length,
      exampleData: passengers[0],
    });

    // แปลงข้อมูลเที่ยวบิน (เหมือนเดิม)
    const routes = ticket.tickets_routes || [];
    const multiSegmentRoute = generateMultiSegmentRoute(routes);
    const supplierName = ticket.supplier?.name || "";

    const flights = {
      supplierName,
      multiSegmentRoute,
      routeDisplay: multiSegmentRoute || "N/A",
      routes: routes || [], // ✅ เพิ่ม routes array เต็ม ๆ เหมือน Invoice
    };

    // 🔧 แปลงข้อมูลราคาผู้โดยสารตามที่คำนวณใหม่ - ใช้ helper function
    const passengerTypes = [];
    const selectedTypes =
      calculatedTotals.selectedPassengerTypes ||
      calculatedTotals.SELECTEDPASSENGERTYPES ||
      {};

    console.log("🔧 ข้อมูลประเภทผู้โดยสาร:", {
      calculatedTotals,
      selectedTypes,
      hasADT1: selectedTypes.ADT1 > 0,
      hasADT2: selectedTypes.ADT2 > 0,
      hasADT3: selectedTypes.ADT3 > 0,
    });

    // ดึงราคาต่อหน่วยจากข้อมูลเดิม
    const originalPricing = ticket.tickets_pricing?.[0] || {};

    if (selectedTypes.ADT1 > 0) {
      passengerTypes.push({
        type: "ADT 1",
        quantity: selectedTypes.ADT1,
        unitPrice: originalPricing.adt1_sale_price || 0,
        amount: selectedTypes.ADT1 * (originalPricing.adt1_sale_price || 0),
        priceDisplay: `${formatCurrencyNoDecimal(
          originalPricing.adt1_sale_price || 0
        )} x ${selectedTypes.ADT1}`,
      });
    }

    if (selectedTypes.ADT2 > 0) {
      passengerTypes.push({
        type: "ADT 2",
        quantity: selectedTypes.ADT2,
        unitPrice: originalPricing.adt2_sale_price || 0,
        amount: selectedTypes.ADT2 * (originalPricing.adt2_sale_price || 0),
        priceDisplay: `${formatCurrencyNoDecimal(
          originalPricing.adt2_sale_price || 0
        )} x ${selectedTypes.ADT2}`,
      });
    }

    if (selectedTypes.ADT3 > 0) {
      passengerTypes.push({
        type: "ADT 3",
        quantity: selectedTypes.ADT3,
        unitPrice: originalPricing.adt3_sale_price || 0,
        amount: selectedTypes.ADT3 * (originalPricing.adt3_sale_price || 0),
        priceDisplay: `${formatCurrencyNoDecimal(
          originalPricing.adt3_sale_price || 0
        )} x ${selectedTypes.ADT3}`,
      });
    }

    // เพิ่มบรรทัดว่างให้ครบ 3 บรรทัด
    while (passengerTypes.length < 3) {
      passengerTypes.push({
        type: "",
        quantity: 0,
        unitPrice: 0,
        amount: 0,
        priceDisplay: "",
      });
    }

    // หลังจากสร้าง passengerTypes array
    const typesWithData = passengerTypes.filter((pt) => pt.quantity > 0);
    console.log("🔧 ผลลัพธ์ passengerTypes array:", {
      totalSlots: passengerTypes.length,
      slotsWithData: typesWithData.length,
      exampleType: passengerTypes[0],
    });

    // 🔧 ประมวลผล extras ที่เลือก - ใช้ helper function
    const MIN_EXTRAS_DISPLAY = 3;
    const extras = [];

    console.log("🔧 กำลังประมวลผล extras:", {
      selectedExtraCount: selectedExtraData.length,
      firstExtra: selectedExtraData[0] || "ไม่มี",
      minDisplay: MIN_EXTRAS_DISPLAY,
    });

    const displayCount = Math.max(selectedExtraData.length, MIN_EXTRAS_DISPLAY);

    for (let i = 0; i < displayCount; i++) {
      if (i < selectedExtraData.length) {
        const extra = selectedExtraData[i];
        // 🔧 รองรับทั้ง UPPERCASE และ lowercase field names
        const extraDescription = extra.description || extra.DESCRIPTION || "";
        const extraSalePrice = extra.sale_price || extra.SALE_PRICE || 0;
        const extraSelectedQuantity =
          extra.selectedQuantity || extra.SELECTEDQUANTITY || 1;

        extras.push({
          description: extraDescription,
          quantity: extraSelectedQuantity,
          unitPrice: extraSalePrice,
          amount: extraSalePrice * extraSelectedQuantity,
          priceDisplay:
            extraSalePrice && extraSelectedQuantity
              ? `${formatCurrencyNoDecimal(
                  extraSalePrice
                )} x ${extraSelectedQuantity}`
              : "",
        });
      } else {
        extras.push({
          description: "",
          quantity: 0,
          unitPrice: 0,
          amount: 0,
          priceDisplay: "",
        });
      }
    }

    // หลังจากสร้าง extras array
    const extrasWithData = extras.filter((e) => e.description);
    console.log("🔧 ผลลัพธ์ extras array:", {
      totalSlots: extras.length,
      slotsWithData: extrasWithData.length,
      exampleExtra: extras[0],
    });

    // สรุปยอดเงินตามที่คำนวณใหม่
    const summary = {
      subtotal: calculatedTotals.subtotal || calculatedTotals.SUBTOTAL || 0,
      vatPercent: detail.vat_percent || 0,
      vat: calculatedTotals.vatAmount || calculatedTotals.VATAMOUNT || 0,
      total: calculatedTotals.total || calculatedTotals.TOTAL || 0,
    };

    console.log("🔧 ข้อมูล summary สุดท้าย:", {
      subtotal: calculatedTotals.subtotal || calculatedTotals.SUBTOTAL || 0,
      vatAmount: calculatedTotals.vatAmount || calculatedTotals.VATAMOUNT || 0,
      total: calculatedTotals.total || calculatedTotals.TOTAL || 0,
      vatPercent: detail.vat_percent || 0,
    });

    console.log("🔧 ✅ getReceiptData เสร็จสิ้น - ส่งผลลัพธ์กลับ");

    // ⭐ ดึงข้อมูล Multi INV Receipt จาก API response
    const selectedPOs = ticket.selectedPOs || null;
    const multiPOSummary = ticket.multiPOSummary || null;

    console.log("🔧 Multi INV Debug:", {
      hasSelectedPOs: !!selectedPOs,
      selectedPOsCount: selectedPOs?.length || 0,
      hasMultiPOSummary: !!multiPOSummary,
      rc_linked_tickets: ticket.rc_linked_tickets
    });

    // ถ้ามี multiPOSummary ให้ใช้แทน summary ปกติ
    const finalSummary = multiPOSummary || summary;

    return {
      success: true,
      data: {
        customer: customerInfo,
        invoice: {
          ...receiptInfo,
          poNumber: receiptInfo.poNumber,
          rcNumber: receiptInfo.rcNumber,
        },
        passengers,
        flights,
        passengerTypes,
        extras,
        summary: finalSummary,
        remark: additional.remark || "",
        rcResult,
        updatedByName: receiptUpdatedByName,
        issueDate: ticket.updated_at || ticket.created_at,
        // Multi INV Receipt data
        selectedPOs: selectedPOs,
      },
    };
  } catch (error) {
    console.error("🔧 ❌ Error ใน getReceiptData:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Helper function สำหรับสร้าง RC Number (ใช้ from referencesService)
const generateRCForTicket = async (ticketId) => {
  try {
    const response = await apiClient.post("/gateway.php", {
      action: "generateRCForTicket",
      ticketId: ticketId,
    });

    if (!response.success) {
      console.error("Error generating RC Number:", response.error);
      return {
        success: false,
        error: response.error,
        rcNumber: null,
      };
    }

    return {
      success: true,
      rcNumber: response.data.rcNumber,
      isNew: response.data.isNew,
      message: response.data.message,
    };
  } catch (error) {
    console.error("Error generating RC Number:", error);
    return {
      success: false,
      error: error.message,
      rcNumber: null,
    };
  }
};
