import React, { useState, useEffect } from "react";

const TotalSummary = ({
  subtotal = 0,
  total,
  config = {
    showBorder: true,
    size: "md",
    align: "right",
  },
  extras = [],
  pricing = {},
  setFormData,
  readOnly = false,
  // VAT จาก database
  actualVatAmount,
  actualVatPercent,
  actualTotal,
  // ✅ เพิ่ม props ใหม่สำหรับ Balance Due
  showBalanceDue = false,
  depositTotal = 0,
  balanceDue = 0,
}) => {
  const [vatPercentInput, setVatPercentInput] = useState("0");

  // ✅ ใช้ VAT จาก database เมื่อมีข้อมูล
  useEffect(() => {
    if (actualVatPercent !== undefined) {
      // ✅ เอา .00 ออกถ้าเป็นจำนวนเต็ม
      const cleanPercent = parseFloat(actualVatPercent);
      const displayPercent =
        cleanPercent % 1 === 0
          ? cleanPercent.toString()
          : cleanPercent.toFixed(2);
      setVatPercentInput(displayPercent);
    }
  }, [actualVatPercent]);

  // แก้ไขฟังก์ชัน handleVatChange
  const handleVatChange = (e) => {
    if (readOnly) return;
    const value = e.target.value;
    if (value === "" || (Number(value) >= 0 && Number(value) <= 100)) {
      setVatPercentInput(value);
      setFormData((prev) => ({ ...prev, vatPercent: value }));
    }
  };

  const calculatedSubtotal = subtotal;

  // ✅ คำนวณ VAT ใหม่เสมอเมื่อ user แก้ %
  const calculatedVatAmount =
    (calculatedSubtotal * parseFloat(vatPercentInput || 0)) / 100;

  // ✅ ใช้ actualTotal เฉพาะตอนโหลดครั้งแรก (เมื่อ vatPercentInput ยังเท่ากับ actualVatPercent)
  const isVatChanged =
    actualVatPercent !== undefined &&
    parseFloat(vatPercentInput || 0) !== parseFloat(actualVatPercent || 0);

  const calculatedTotal =
    !isVatChanged && actualTotal !== undefined
      ? actualTotal // ใช้จาก DB ถ้า VAT ไม่เปลี่ยน
      : total !== undefined
      ? total
      : calculatedSubtotal + calculatedVatAmount; // คำนวณใหม่ถ้า VAT เปลี่ยน

  const widthClass =
    config.size === "sm"
      ? "w-full max-w-xs"
      : config.size === "lg"
      ? "w-full max-w-xl"
      : config.size === "full"
      ? "w-full"
      : "w-full max-w-md";

  const alignClass =
    config.align === "left"
      ? "mr-auto"
      : config.align === "center"
      ? "mx-auto"
      : "ml-auto";

  const formatCurrency = (amount) => {
    const num = parseFloat(amount || 0);

    // ✅ บังคับไม่แสดง .00 เสมอ
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  return (
    <div
      className={`${widthClass} ${alignClass} ${
        config.showBorder ? "border border-gray-200 rounded-lg" : ""
      } bg-blue-50 p-4 rounded-md`}
    >
      <div className="flex justify-between mb-2">
        <div className="font-medium">ยอดรวมเป็นเงิน</div>
        <div className="font-bold text-gray-700">
          {formatCurrency(calculatedSubtotal)}
        </div>
      </div>
      <div className="flex justify-between mb-2 items-center">
        <div className="font-medium">
          ภาษีมูลค่าเพิ่ม
          <input
            type="number"
            value={vatPercentInput}
            onChange={handleVatChange}
            className="mx-2 w-8 p-1 border text-center rounded-md"
            placeholder="0"
            min="0"
            max="100"
            disabled={readOnly}
          />
          %
        </div>
        <div className="text-gray-700">
          {formatCurrency(calculatedVatAmount)}
        </div>
      </div>
      <div className="flex justify-between border-t border-blue-200 pt-2 mt-2">
        <div className="font-semibold">ยอดรวมทั้งสิ้น</div>
        <div className="font-bold text-blue-600 text-xl">
          {formatCurrency(calculatedTotal)}
        </div>
      </div>

      {/* ✅ เพิ่มบรรทัดใหม่: Balance Due */}
      {showBalanceDue && depositTotal > 0 && (
        <div className="flex justify-between border-t border-blue-200 pt-2 mt-2">
          <div className="font-semibold">ยอดรวมทั้งสิ้น (หลังหัก Deposit)</div>
          <div className="font-bold text-blue-800 text-xl">
            {formatCurrency(balanceDue)}
          </div>
        </div>
      )}
    </div>
  );
};

export default TotalSummary;
