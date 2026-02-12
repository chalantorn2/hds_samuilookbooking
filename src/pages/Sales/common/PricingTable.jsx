import React from "react";
import { formatNumber, parseInput } from "./FormatNumber";

/**
 * PricingTable Component - ใช้สำหรับแสดงและจัดการตารางราคาในหน้าต่างๆ
 *
 * @param {Object} props - Properties ของ component
 * @param {Object} props.pricing - Object ที่เก็บข้อมูลราคา (adt1, adt2, adt3)
 * @param {Function} props.updatePricing - Function สำหรับอัพเดทราคา
 * @param {string} props.title - หัวข้อของตาราง (optional)
 * @param {Object} props.config - การตั้งค่าเพิ่มเติม (optional)
 * @param {boolean} props.config.showHeaders - แสดงหัวข้อคอลัมน์หรือไม่ (default: true)
 * @param {boolean} props.config.showBorder - แสดงเส้นขอบหรือไม่ (default: true)
 * @param {boolean} props.config.showTotal - แสดงยอดรวมหรือไม่ (default: true)
 * @param {boolean} props.config.enableEdit - สามารถแก้ไขได้หรือไม่ (default: true)
 * @returns {JSX.Element}
 */
const PricingTable = ({
  pricing = {
    adt1: { net: "", sale: "", pax: 0, total: 0 },
    adt2: { net: "", sale: "", pax: 0, total: 0 },
    adt3: { net: "", sale: "", pax: 0, total: 0 },
  },
  updatePricing,
  title = "",
  config = {
    showHeaders: true,
    showBorder: true,
    showTotal: true,
    enableEdit: true,
  },
  readOnly = false,
}) => {
  // ฟังก์ชันคำนวณราคารวมต่อรายการ (ไม่มีทศนิยม)
  const calculateItemTotal = (price, quantity) => {
    const numPrice = parseFloat(price) || 0;
    const numQuantity = parseInt(quantity) || 0;
    return (numPrice * numQuantity).toFixed(2);
  };

  // ฟังก์ชันอัพเดทข้อมูลราคา
  const handleUpdatePricing = (category, field, value) => {
    if (!updatePricing) return;

    let newTotal = pricing[category].total;
    const cleanValue = parseInput(value); // ลบ comma ออก

    // คำนวณ total ใหม่
    if (field === "pax") {
      newTotal = calculateItemTotal(pricing[category].sale, cleanValue);
    } else if (field === "sale") {
      newTotal = calculateItemTotal(cleanValue, pricing[category].pax);
    }

    // เรียกใช้ updatePricing function ที่ส่งมาจาก parent component
    updatePricing(category, field, cleanValue, newTotal);
  };

  // คำนวณยอดรวมทั้งหมด
  const calculateTotal = () => {
    const adt1Total = parseFloat(pricing.adt1?.total || 0);
    const adt2Total = parseFloat(pricing.adt2?.total || 0);
    const adt3Total = parseFloat(pricing.adt3?.total || 0);
    return (adt1Total + adt2Total + adt3Total).toFixed(2);
  };

  // Row definitions
  const rows = [
    { key: "adt1", label: "ADT 1" },
    { key: "adt2", label: "ADT 2" },
    { key: "adt3", label: "ADT 3" },
  ];

  return (
    <div className={`${config.showBorder ? "rounded-lg" : ""}`}>
      {title && (
        <div className="bg-blue-100 text-blue-600 p-3">
          <h2 className="font-semibold">{title}</h2>
        </div>
      )}
      <div className="mb-2">
        {config.showHeaders && (
          <div className="bg-blue-100 text-blue-600 p-2 rounded-t-lg grid grid-cols-12 text-center font-medium">
            <div className="col-span-1"></div>
            <div className="col-span-3">Net</div>
            <div className="col-span-3">Sale</div>
            <div className="col-span-1">Pax</div>
            <div className="col-span-4">Total</div>
          </div>
        )}

        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-12 gap-2 pt-2 p-1 pl-3 items-center bg-white">
            <div className="col-span-1">
              <span className="text-right col-span-1 font-medium">{row.label}</span>
            </div>
            <div className="col-span-3">
              <input
                type="text"
                className="w-full border text-right border-gray-400 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                value={formatNumber(pricing[row.key]?.net) || ""}
                onChange={(e) =>
                  handleUpdatePricing(row.key, "net", e.target.value)
                }
                disabled={readOnly || !config.enableEdit}
              />
            </div>
            <div className="col-span-3">
              <input
                type="text"
                className="w-full border text-right border-gray-400 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                value={formatNumber(pricing[row.key]?.sale) || ""}
                onChange={(e) =>
                  handleUpdatePricing(row.key, "sale", e.target.value)
                }
                disabled={readOnly || !config.enableEdit}
              />
            </div>
            <div className="col-span-1">
              <input
                type="number"
                min="0"
                className="w-full border text-center border-gray-400 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                value={pricing[row.key]?.pax || ""}
                onChange={(e) =>
                  handleUpdatePricing(row.key, "pax", e.target.value)
                }
                disabled={readOnly || !config.enableEdit}
              />
            </div>
            <div className="col-span-4">
              <input
                type="text"
                className="w-full border text-right border-gray-400 rounded-md p-2 bg-gray-100"
                placeholder="0"
                value={formatNumber(pricing[row.key]?.total) || ""}
                disabled
              />
            </div>
          </div>
        ))}

      </div>
    </div>
  );
};

export default PricingTable;
