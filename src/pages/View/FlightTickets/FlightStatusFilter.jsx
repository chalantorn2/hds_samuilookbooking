import React from "react";

/**
 * คอมโพเนนต์สำหรับกรองตามสถานะของตั๋วเครื่องบิน
 * @param {Object} props - คุณสมบัติของคอมโพเนนต์
 * @param {string} props.filterStatus - สถานะที่เลือกในตัวกรอง
 * @param {Function} props.setFilterStatus - ฟังก์ชันตั้งค่าตัวกรองสถานะ
 * @param {boolean} props.invoiceListMode - โหมด Invoice List (แสดงเฉพาะ ทั้งหมด และ Cancelled)
 */
const FlightStatusFilter = ({ filterStatus, setFilterStatus, invoiceListMode = false }) => {
  // สถานะทั้งหมดที่สามารถกรองได้
  const allStatuses = [
    { id: "all_except_cancelled", name: "ทั้งหมด", color: "gray" },
    { id: "invoiced", name: "Invoiced", color: "green" },
    { id: "not_invoiced", name: "Not Invoiced", color: "yellow" },
    { id: "cancelled", name: "Cancelled", color: "red" },
  ];

  // สำหรับ Invoice List: แสดงเฉพาะ ทั้งหมด และ Cancelled
  const invoiceStatuses = [
    { id: "all_except_cancelled", name: "ทั้งหมด", color: "gray" },
    { id: "cancelled", name: "Cancelled", color: "red" },
  ];

  const statuses = invoiceListMode ? invoiceStatuses : allStatuses;

  // กำหนดสีพื้นหลังตามสถานะ
  const getColorClass = (color, isSelected) => {
    const colorMap = {
      green: isSelected
        ? "bg-green-100 text-green-800 border-green-300"
        : "border-gray-300 hover:bg-green-50",
      yellow: isSelected
        ? "bg-yellow-100 text-yellow-800 border-yellow-300"
        : "border-gray-300 hover:bg-yellow-50",
      red: isSelected
        ? "bg-red-100 text-red-800 border-red-300"
        : "border-gray-300 hover:bg-red-50",
      gray: isSelected
        ? "bg-gray-100 text-gray-800 border-gray-300"
        : "border-gray-300 hover:bg-gray-50",
    };

    return colorMap[color] || colorMap.gray;
  };

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((status) => {
        const isSelected = filterStatus === status.id;

        return (
          <button
            key={status.id}
            onClick={() => setFilterStatus(status.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${getColorClass(
              status.color,
              isSelected
            )}`}
          >
            <span>{status.name}</span>
          </button>
        );
      })}
    </div>
  );
};

export default FlightStatusFilter;
