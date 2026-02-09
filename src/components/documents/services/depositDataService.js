// src/components/documents/services/depositDataService.js
import { apiClient } from "../../../services/apiClient";
import {
  formatCurrencyNoDecimal,
  formatCurrencyWithDecimal,
  numberToEnglishText,
  generateMultiSegmentRoute,
} from "./documentDataMapper";
import {
  getDisplayCustomerName,
  getDisplayCustomerAddress,
  getDisplayCustomerPhone,
  getDisplayCustomerIdNumber,
  getDisplayCustomerBranchType,
  getDisplayCustomerBranchNumber,
} from "../../../utils/customerOverrideHelpers";

/**
 * แปลงวันที่เป็นภาษาไทยเต็มรูปแบบ
 * @param {string} dateString - วันที่ในรูปแบบ YYYY-MM-DD
 * @returns {string} - เช่น "25 มีนาคม 2568"
 */
const formatThaiDate = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const thaiMonths = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];

  const day = date.getDate();
  const month = thaiMonths[date.getMonth()];
  const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.

  return `${day} ${month} ${year}`;
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
 * ดึงและแปลงข้อมูลสำหรับการพิมพ์เอกสาร Deposit
 * @param {number} depositId - ID ของ deposit
 * @param {number} userId - ID ของผู้ใช้ปัจจุบัน (สำหรับ Print = Edit)
 * @returns {Promise<Object>} - ข้อมูลที่แปลงแล้วสำหรับการพิมพ์
 */
export const getDepositData = async (depositId, userId = null) => {
  try {
    console.log("=== getDepositData START ===", { depositId });

    // ดึงข้อมูล deposit จาก API
    // ✅ Print = Edit: ส่ง userId ไปด้วยเพื่ออัปเดต updated_by
    const response = await apiClient.get("/gateway.php", {
      action: "getDepositById",
      depositId: depositId,
      userId: userId, // ส่ง userId เพื่ออัปเดต updated_by
    });

    if (!response.success) {
      throw new Error(response.error || "ไม่สามารถดึงข้อมูล deposit ได้");
    }

    const deposit = response.data;
    console.log("Raw deposit data:", deposit);

    // ดึงข้อมูลผู้ใช้ (updated_by หรือ created_by)
    const displayUserId = deposit.deposit?.updated_by || deposit.deposit?.created_by;
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

    // เตรียมข้อมูลสำหรับ customer override
    const depositWithOverride = {
      ...deposit,
      customer_override_data: deposit.customer_override_data,
    };

    // ดึงข้อมูลพื้นฐาน
    const depositMain = deposit.deposit || {};
    const details = deposit.details || {};
    const terms = deposit.terms || {};
    const pricing = deposit.pricing || {};
    const routes = deposit.routes || [];
    const extras = deposit.extras || [];

    // สร้างข้อมูล Customer
    const customerInfo = {
      name: getDisplayCustomerName(depositWithOverride),
      address: getDisplayCustomerAddress(depositWithOverride),
      phone: getDisplayCustomerPhone(depositWithOverride),
      email: deposit.customer?.email || "",
      taxId: getDisplayCustomerIdNumber(depositWithOverride),
      branchType: getDisplayCustomerBranchType(depositWithOverride),
      branchNumber: getDisplayCustomerBranchNumber(depositWithOverride),
    };

    // สร้างข้อมูล Invoice/Document
    const invoiceInfo = {
      dpNumber: depositMain.reference_number || "",
      date: formatDate(depositMain.issue_date),
      dueDate: formatDate(depositMain.due_date),
      salesPerson: "System", // ปรับตามต้องการ
    };

    // สร้างข้อมูล Flights (Supplier + Route)
    const multiSegmentRoute = generateMultiSegmentRoute(routes);
    const flights = {
      supplierName: deposit.supplier?.name || "",
      multiSegmentRoute: multiSegmentRoute,
      routeDisplay: multiSegmentRoute || "N/A",
      routes: routes || [], // ✅ ส่ง routes array เต็ม ๆ ไปด้วย
    };

    // สร้างข้อมูล Passenger Types (Adult, Child, Infant)
    const passengerTypes = [];

    if (pricing.adult_pax > 0) {
      passengerTypes.push({
        type: "ADULT",
        quantity: pricing.adult_pax,
        unitPrice: pricing.adult_sale_price || 0,
        amount: pricing.adult_total || 0,
        priceDisplay: `${formatCurrencyNoDecimal(
          pricing.adult_sale_price || 0
        )} x ${pricing.adult_pax}`,
      });
    }

    if (pricing.child_pax > 0) {
      passengerTypes.push({
        type: "CHILD",
        quantity: pricing.child_pax,
        unitPrice: pricing.child_sale_price || 0,
        amount: pricing.child_total || 0,
        priceDisplay: `${formatCurrencyNoDecimal(
          pricing.child_sale_price || 0
        )} x ${pricing.child_pax}`,
      });
    }

    if (pricing.infant_pax > 0) {
      passengerTypes.push({
        type: "INFANT",
        quantity: pricing.infant_pax,
        unitPrice: pricing.infant_sale_price || 0,
        amount: pricing.infant_total || 0,
        priceDisplay: `${formatCurrencyNoDecimal(
          pricing.infant_sale_price || 0
        )} x ${pricing.infant_pax}`,
      });
    }

    // เติมให้ครบ 3 บรรทัดเสมอ
    while (passengerTypes.length < 3) {
      passengerTypes.push({
        type: "",
        quantity: 0,
        unitPrice: 0,
        amount: 0,
        priceDisplay: "",
      });
    }

    // สร้างข้อมูล Extras (ขั้นต่ำ 3 บรรทัด)
    const MIN_EXTRAS_DISPLAY = 3;
    const extrasData = [];
    const displayCount = Math.max(extras.length, MIN_EXTRAS_DISPLAY);

    for (let i = 0; i < displayCount; i++) {
      if (i < extras.length) {
        const extra = extras[i];
        extrasData.push({
          description: extra.description || "",
          quantity: extra.quantity || 1,
          unitPrice: extra.sale_price || 0,
          amount: extra.total_amount || 0,
          priceDisplay:
            extra.sale_price && extra.quantity
              ? `${formatCurrencyNoDecimal(extra.sale_price)} x ${
                  extra.quantity
                }`
              : "",
        });
      } else {
        extrasData.push({
          description: "",
          quantity: 0,
          unitPrice: 0,
          amount: 0,
          priceDisplay: "",
        });
      }
    }

    // สร้างข้อมูล Summary
    const summary = {
      subtotal: details.subtotal_before_vat || 0,
      vatPercent: details.vat_percent || 0,
      vat: details.vat_amount || 0,
      total: details.grand_total || 0,
    };

    // สร้างข้อมูล Deposit Info (สำหรับ Remark และข้อความชำระเงิน)
    const depositInfo = {
      // วันที่แจ้งชื่อผู้โดยสาร
      passengerInfoDueDate: formatThaiDate(terms.passenger_info_due_date),

      // วันที่ชำระมัดจำครั้งที่ 1
      depositDueDate: formatThaiDate(terms.deposit_due_date),
      depositAmount: details.deposit_total || 0,

      // วันที่ชำระมัดจำครั้งที่ 2
      secondDepositDueDate: formatThaiDate(terms.second_deposit_due_date),
      secondDepositAmount: details.deposit_total_2 || 0,

      // วันที่ชำระทั้งหมด
      fullPaymentDueDate: formatThaiDate(terms.full_payment_due_date),
      fullPaymentAmount: pricing.total_amount || 0,
    };

    // ใช้ updated_at หรือ created_at ถ้าไม่มี
    const documentDate = depositMain.updated_at || depositMain.created_at;

    console.log("=== getDepositData SUCCESS ===");
    console.log("updatedByName:", updatedByName);
    console.log("userId:", userId);
    console.log("updated_at:", depositMain.updated_at);
    console.log("created_at:", depositMain.created_at);
    console.log("documentDate:", documentDate);

    return {
      success: true,
      data: {
        customer: customerInfo,
        invoice: invoiceInfo,
        flights: flights,
        passengerTypes: passengerTypes,
        extras: extrasData,
        summary: summary,
        depositInfo: depositInfo,
        updatedByName: updatedByName,
        issueDate: documentDate, // ใช้ updated_at หรือ created_at
      },
    };
  } catch (error) {
    console.error("Error in getDepositData:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};
