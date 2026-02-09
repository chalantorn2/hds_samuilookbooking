// ไฟล์: src/hooks/usePricing.js
import { useState } from "react";

/**
 * Custom hook สำหรับจัดการข้อมูลราคา
 * @param {Object} initialPricing - ข้อมูลราคาเริ่มต้น
 * @param {number} initialVatPercent - เปอร์เซ็นต์ภาษีเริ่มต้น
 * @returns {Object} - ข้อมูลและฟังก์ชันที่เกี่ยวข้องกับราคา
 */
// แก้ไขเฉพาะจุดในฟังก์ชัน resetPricing เพื่อแก้บั๊กที่มีอยู่
const usePricing = (
  initialPricing = {
    adult: { net: "", sale: "", pax: 0, total: "0" },
    child: { net: "", sale: "", pax: 0, total: "0" },
    infant: { net: "", sale: "", pax: 0, total: "0" },
  },
  initialVatPercent = 7
) => {
  const [pricing, setPricing] = useState(initialPricing);
  const [vatPercent, setVatPercent] = useState(initialVatPercent);

  // ฟังก์ชันอัพเดทข้อมูลราคา
  // ในไฟล์ usePricing.js
  const updatePricing = (category, field, value, total = null) => {
    setPricing((prev) => {
      const newPricing = { ...prev };

      // ถ้ายังไม่มีข้อมูลของประเภทนี้ ให้สร้างใหม่
      if (!newPricing[category]) {
        newPricing[category] = { net: "", sale: "", pax: 0, total: 0 };
      }

      // อัพเดทค่าตามฟิลด์ที่ระบุ
      newPricing[category][field] = value;

      // ถ้ามีการระบุ total โดยตรง ให้ใช้ค่านั้น
      if (total !== null) {
        newPricing[category].total = total;
      }
      // ถ้าไม่ได้ระบุ total ให้คำนวณใหม่เฉพาะเมื่อเป็นการอัพเดท sale หรือ pax
      else if (field === "sale" || field === "pax") {
        const sale = parseFloat(newPricing[category].sale) || 0;
        const pax = parseInt(newPricing[category].pax) || 0;
        newPricing[category].total = sale * pax;
      }

      return newPricing;
    });
  };

  // คำนวณราคารวมก่อนภาษี
  const calculateSubtotal = () => {
    const adultTotal = parseFloat(pricing.adult?.total || 0);
    const childTotal = parseFloat(pricing.child?.total || 0);
    const infantTotal = parseFloat(pricing.infant?.total || 0);

    return adultTotal + childTotal + infantTotal;
  };

  // คำนวณภาษี
  const calculateVat = () => {
    return calculateSubtotal() * (vatPercent / 100);
  };

  // คำนวณราคารวมทั้งหมด
  const calculateTotal = () => {
    return calculateSubtotal() + calculateVat();
  };

  // แก้ไขฟังก์ชัน resetPricing ที่มีบั๊ก
  const resetPricing = () => {
    setPricing({
      adult: { net: "", sale: "", pax: 0, total: "0" },
      child: { net: "", sale: "", pax: 0, total: "0" },
      infant: { net: "", sale: "", pax: 0, total: "0" },
    });
    setVatPercent(7); // เปลี่ยนจาก 0 เป็น 7 (ค่าเริ่มต้น)
  };

  // ส่งกลับฟังก์ชันและค่าต่างๆ
  return {
    pricing,
    vatPercent,
    setVatPercent,
    updatePricing,
    calculateSubtotal,
    calculateVat,
    calculateTotal,
    resetPricing,
  };
};

export default usePricing;
