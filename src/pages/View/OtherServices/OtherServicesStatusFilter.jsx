// src/pages/View/OtherServices/OtherServicesStatusFilter.jsx
// Based on BusBoatTourStatusFilter.jsx - Filter component for other services
// ✅ Service Types: insurance, hotel, train, visa, other
// ✅ Status: not_voucher/voucher_issued/cancelled (ไม่ใช่ invoice)

import React from "react";

/**
 * คอมโพเนนต์สำหรับกรองตามสถานะและประเภทบริการของ Other Services
 * @param {Object} props - คุณสมบัติของคอมโพเนนต์
 * @param {string} props.filterStatus - สถานะที่เลือกในตัวกรอง
 * @param {Function} props.setFilterStatus - ฟังก์ชันตั้งค่าตัวกรองสถานะ
 * @param {string} props.filterServiceType - ประเภทบริการที่เลือก
 * @param {Function} props.setFilterServiceType - ฟังก์ชันตั้งค่าตัวกรองประเภทบริการ
 */
const OtherServicesStatusFilter = ({
  filterStatus,
  setFilterStatus,
  filterServiceType,
  setFilterServiceType,
}) => {
  // ✅ สถานะทั้งหมด (เหมือน Voucher ไม่ใช่ Invoice)
  const statuses = [
    { id: "all_except_cancelled", name: "ทั้งหมด", color: "gray" },
    {
      id: "voucher_issued",
      name: "Voucher Issued",
      color: "green",
    },
    { id: "not_voucher", name: "Not Voucher", color: "yellow" },
    { id: "cancelled", name: "Cancelled", color: "red" },
  ];

  // ✅ ประเภทบริการทั้งหมด (5 ประเภท)
  const serviceTypes = [
    { id: "all", name: "ทั้งหมด", color: "gray" },
    { id: "insurance", name: "ประกัน", color: "blue" },
    { id: "hotel", name: "โรงแรม", color: "green" },
    { id: "train", name: "รถไฟ", color: "purple" },
    { id: "visa", name: "วีซ่า", color: "cyan" },
    { id: "other", name: "อื่นๆ", color: "orange" },
  ];

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
      blue: isSelected
        ? "bg-blue-100 text-blue-800 border-blue-300"
        : "border-gray-300 hover:bg-blue-50",
      purple: isSelected
        ? "bg-purple-100 text-purple-800 border-purple-300"
        : "border-gray-300 hover:bg-purple-50",
      cyan: isSelected
        ? "bg-cyan-100 text-cyan-800 border-cyan-300"
        : "border-gray-300 hover:bg-cyan-50",
      orange: isSelected
        ? "bg-orange-100 text-orange-800 border-orange-300"
        : "border-gray-300 hover:bg-orange-50",
      gray: isSelected
        ? "bg-gray-100 text-gray-800 border-gray-300"
        : "border-gray-300 hover:bg-gray-50",
    };

    return colorMap[color] || colorMap.gray;
  };

  return (
    <div className="space-y-2">
      {/* Status Filter Section */}
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

      {/* Service Type Filter Section */}
      <div className="flex flex-wrap gap-2">
        {serviceTypes.map((serviceType) => {
          const isSelected = filterServiceType === serviceType.id;

          return (
            <button
              key={serviceType.id}
              onClick={() => setFilterServiceType(serviceType.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${getColorClass(
                serviceType.color,
                isSelected
              )}`}
            >
              <span>{serviceType.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OtherServicesStatusFilter;
