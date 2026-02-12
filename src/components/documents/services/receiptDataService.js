// src/components/documents/services/receiptDataService.js
import { getInvoiceData, getReceiptData } from "./documentDataMapper";

/**
 * ดึงและแปลงข้อมูลสำหรับการพิมพ์เอกสาร Receipt
 * โดยใช้ข้อมูลที่เลือกจาก ReceiptSelectionModal
 *
 * @param {number} ticketId - ID ของ ticket
 * @param {Object} selectionData - ข้อมูลที่เลือกจาก ReceiptSelectionModal
 * @returns {Promise<Object>} - ข้อมูลที่แปลงแล้วสำหรับการพิมพ์
 */
export const getReceiptDataForPrint = async (
  ticketId,
  selectionData = null,
  userId = null
) => {
  try {
    console.log("🧾 Starting receipt data processing:", {
      ticketId,
      userId,
      hasSelectionData: !!selectionData,
      selectionKeys: selectionData ? Object.keys(selectionData) : [],
    });

    // ⭐ เปลี่ยนให้เรียก getReceiptData เสมอ (ไม่ว่าจะมี selectionData หรือไม่)
    // เพราะ getReceiptData จะดึงข้อมูล Multi INV Receipt ด้วย
    console.log("🧾 Using getReceiptData for all receipts");
    return await getReceiptData(ticketId, selectionData, userId);
  } catch (error) {
    console.error("🧾 ❌ Error in getReceiptDataForPrint:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * แปลงข้อมูล Invoice เป็น format สำหรับ Receipt
 * @param {Object} invoiceData - ข้อมูล Invoice
 * @param {number} ticketId - ID ของ ticket
 * @returns {Object} - ข้อมูล Receipt format
 */
const convertInvoiceToReceiptFormat = (invoiceData, ticketId) => {
  console.log("🧾 Converting invoice data to receipt format");

  // ใช้ข้อมูลเดียวกับ Invoice แต่เปลี่ยน document info
  const receiptData = {
    ...invoiceData,
    invoice: {
      ...invoiceData.invoice,
      // ให้ใช้เฉพาะ RC Number เท่านั้น
      rcNumber: invoiceData.invoice.rcNumber || "",
      // เก็บ INV Number ไว้สำหรับอ้างอิง
      poNumber: invoiceData.invoice.poNumber,
    },
  };

  console.log("🧾 Receipt data conversion completed");
  return receiptData;
};

/**
 * ตรวจสอบและประมวลผลข้อมูลที่เลือกจาก ReceiptSelectionModal
 * @param {Object} selectionData - ข้อมูลที่เลือก
 * @returns {Object} - ข้อมูลที่ประมวลผลแล้ว
 */
export const processReceiptSelection = (selectionData) => {
  if (!selectionData) {
    return {
      isValid: false,
      error: "ไม่มีข้อมูลที่เลือก",
    };
  }

  try {
    // ตรวจสอบโครงสร้างข้อมูล (รองรับทั้ง lowercase และ UPPERCASE)
    const passengers =
      selectionData.passengers || selectionData.PASSENGERS || [];
    const extras = selectionData.extras || selectionData.EXTRAS || [];
    const totals = selectionData.totals || selectionData.TOTALS || {};

    // ตรวจสอบความถูกต้องของข้อมูล
    if (!Array.isArray(passengers)) {
      return {
        isValid: false,
        error: "ข้อมูลผู้โดยสารไม่ถูกต้อง",
      };
    }

    if (!Array.isArray(extras)) {
      return {
        isValid: false,
        error: "ข้อมูลรายการเพิ่มเติมไม่ถูกต้อง",
      };
    }

    if (typeof totals !== "object") {
      return {
        isValid: false,
        error: "ข้อมูลยอดรวมไม่ถูกต้อง",
      };
    }

    // นับจำนวนรายการที่เลือก
    const selectedPassengerCount = passengers.length;
    const selectedExtraCount = extras.filter(
      (e) =>
        (e.description || e.DESCRIPTION) &&
        (e.selectedQuantity || e.SELECTEDQUANTITY || 0) > 0
    ).length;

    // ตรวจสอบว่ามีการเลือกรายการอย่างน้อย 1 รายการ
    if (selectedPassengerCount === 0 && selectedExtraCount === 0) {
      return {
        isValid: false,
        error: "กรุณาเลือกรายการสำหรับออก Receipt อย่างน้อย 1 รายการ",
      };
    }

    return {
      isValid: true,
      summary: {
        selectedPassengers: selectedPassengerCount,
        selectedExtras: selectedExtraCount,
        totalAmount: totals.total || totals.TOTAL || 0,
        subtotal: totals.subtotal || totals.SUBTOTAL || 0,
        vatAmount: totals.vatAmount || totals.VATAMOUNT || 0,
      },
    };
  } catch (error) {
    return {
      isValid: false,
      error: `เกิดข้อผิดพลาดในการประมวลผลข้อมูล: ${error.message}`,
    };
  }
};

/**
 * สร้างข้อมูล selection เริ่มต้นจาก Invoice data
 * สำหรับกรณีที่ต้องการแสดง ReceiptSelectionModal
 * @param {Object} invoiceData - ข้อมูล Invoice
 * @returns {Object} - ข้อมูล selection เริ่มต้น
 */
export const createDefaultReceiptSelection = (invoiceData) => {
  if (!invoiceData) {
    return null;
  }

  try {
    // สร้าง selection เริ่มต้น - เลือกทุกอย่าง
    const defaultSelection = {
      passengers: (invoiceData.passengers || [])
        .filter((p) => p.hasData) // เฉพาะที่มีข้อมูล
        .map((p) => ({
          passenger_name: p.name,
          age: p.age,
          ticket_number: p.ticketNumber,
          ticket_code: p.ticketCode,
          selected: true, // เลือกทั้งหมดเป็นค่าเริ่มต้น
        })),

      extras: (invoiceData.extras || [])
        .filter((e) => e.description) // เฉพาะที่มีรายละเอียด
        .map((e) => ({
          description: e.description,
          sale_price: e.unitPrice,
          quantity: e.quantity,
          selectedQuantity: e.quantity, // เลือกจำนวนเต็มเป็นค่าเริ่มต้น
          total_amount: e.amount,
        })),

      totals: {
        subtotal: invoiceData.summary?.subtotal || 0,
        vatAmount: invoiceData.summary?.vat || 0,
        total: invoiceData.summary?.total || 0,
        selectedPassengerTypes: {
          ADT1:
            invoiceData.passengerTypes?.find((p) => p.type === "ADT 1")
              ?.quantity || 0,
          ADT2:
            invoiceData.passengerTypes?.find((p) => p.type === "ADT 2")
              ?.quantity || 0,
          ADT3:
            invoiceData.passengerTypes?.find((p) => p.type === "ADT 3")
              ?.quantity || 0,
        },
      },
    };

    console.log("🧾 Created default receipt selection:", {
      passengersCount: defaultSelection.passengers.length,
      extrasCount: defaultSelection.extras.length,
      totalAmount: defaultSelection.totals.total,
    });

    return defaultSelection;
  } catch (error) {
    console.error("Error creating default receipt selection:", error);
    return null;
  }
};

/**
 * คำนวณยอดรวมใหม่จากข้อมูลที่เลือก
 * @param {Object} selectionData - ข้อมูลที่เลือก
 * @param {number} vatPercent - เปอร์เซ็นต์ VAT
 * @returns {Object} - ยอดรวมที่คำนวณใหม่
 */
export const calculateReceiptTotals = (selectionData, vatPercent = 7) => {
  try {
    const passengers =
      selectionData.passengers || selectionData.PASSENGERS || [];
    const extras = selectionData.extras || selectionData.EXTRAS || [];
    const originalTotals = selectionData.totals || selectionData.TOTALS || {};

    // คำนวณยอดจากผู้โดยสาร (ใช้ข้อมูลจาก originalTotals)
    const passengerTotal = originalTotals.passengerSubtotal || 0;

    // คำนวณยอดจากรายการเพิ่มเติม
    const extrasTotal = extras.reduce((sum, extra) => {
      const price = extra.sale_price || extra.SALE_PRICE || 0;
      const qty = extra.selectedQuantity || extra.SELECTEDQUANTITY || 0;
      return sum + price * qty;
    }, 0);

    // คำนวณยอดรวมก่อน VAT
    const subtotal = passengerTotal + extrasTotal;

    // คำนวณ VAT
    const vatAmount = (subtotal * vatPercent) / 100;

    // คำนวณยอดรวมสุทธิ
    const total = subtotal + vatAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      vatPercent: vatPercent,
      vatAmount: Math.round(vatAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      passengerTotal: Math.round(passengerTotal * 100) / 100,
      extrasTotal: Math.round(extrasTotal * 100) / 100,
    };
  } catch (error) {
    console.error("Error calculating receipt totals:", error);
    return {
      subtotal: 0,
      vatPercent: vatPercent,
      vatAmount: 0,
      total: 0,
      passengerTotal: 0,
      extrasTotal: 0,
    };
  }
};

/**
 * ตรวจสอบว่า ticket สามารถออก Receipt ได้หรือไม่
 * @param {number} ticketId - ID ของ ticket
 * @returns {Promise<Object>} - ผลการตรวจสอบ
 */
export const canGenerateReceipt = async (ticketId) => {
  try {
    // ดึงข้อมูล Invoice เพื่อตรวจสอบ
    const invoiceResult = await getInvoiceData(ticketId);

    if (!invoiceResult.success) {
      return {
        canGenerate: false,
        reason: "ไม่สามารถดึงข้อมูล ticket ได้",
      };
    }

    const invoiceData = invoiceResult.data;

    // ตรวจสอบว่ามี INV Number แล้วหรือไม่
    if (!invoiceData.invoice?.poNumber) {
      return {
        canGenerate: false,
        reason: "ต้องสร้าง Invoice (INV Number) ก่อนจึงจะสามารถออก Receipt ได้",
      };
    }

    // ตรวจสอบว่ามีข้อมูลผู้โดยสารหรือรายการเพิ่มเติม
    const hasPassengers = invoiceData.passengers?.some((p) => p.hasData);
    const hasExtras = invoiceData.extras?.some((e) => e.description);

    if (!hasPassengers && !hasExtras) {
      return {
        canGenerate: false,
        reason: "ไม่มีข้อมูลผู้โดยสารหรือรายการเพิ่มเติมสำหรับออก Receipt",
      };
    }

    return {
      canGenerate: true,
      reason: "",
      invoiceData: invoiceData,
    };
  } catch (error) {
    console.error("Error checking receipt generation capability:", error);
    return {
      canGenerate: false,
      reason: `เกิดข้อผิดพลาด: ${error.message}`,
    };
  }
};
