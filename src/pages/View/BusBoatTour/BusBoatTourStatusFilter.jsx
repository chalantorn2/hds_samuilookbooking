// src/pages/View/BusBoatTour/BusBoatTourStatusFilter.jsx
// Based on FlightStatusFilter.jsx - Filter component for voucher services
// เพิ่ม Service Type filter สำหรับ Bus/Boat/Tour

import React from "react";

/**
 * คอมโพเนนต์สำหรับกรองตามสถานะและประเภทบริการของ vouchers
 * @param {Object} props - คุณสมบัติของคอมโพเนนต์
 * @param {string} props.filterStatus - สถานะที่เลือกในตัวกรอง
 * @param {Function} props.setFilterStatus - ฟังก์ชันตั้งค่าตัวกรองสถานะ
 * @param {string} props.filterServiceType - ประเภทบริการที่เลือก
 * @param {Function} props.setFilterServiceType - ฟังก์ชันตั้งค่าตัวกรองประเภทบริการ
 * @param {boolean} props.hideServiceTypeFilter - ซ่อน Service Type filter (ไม่ใช้แล้ว)
 * @param {boolean} props.voucherListMode - โหมด Voucher List (แสดง Service Type + Cancelled เท่านั้น)
 */
const BusBoatTourStatusFilter = ({
  filterStatus,
  setFilterStatus,
  filterServiceType,
  setFilterServiceType,
  hideServiceTypeFilter = false, // deprecated - ไม่ใช้แล้ว
  voucherListMode = false, // โหมดสำหรับ Voucher List
}) => {
  // สถานะทั้งหมดที่สามารถกรองได้ (เหมือน Flight Tickets)
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
  // ประเภทบริการทั้งหมด (Bus/Boat/Tour)
  const serviceTypes = [
    { id: "all", name: "ทั้งหมด", color: "gray" },
    { id: "bus", name: "Bus", color: "blue" },
    { id: "boat", name: "Boat", color: "cyan" },
    { id: "tour", name: "Tour", color: "purple" },
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
      cyan: isSelected
        ? "bg-cyan-100 text-cyan-800 border-cyan-300"
        : "border-gray-300 hover:bg-cyan-50",
      purple: isSelected
        ? "bg-purple-100 text-purple-800 border-purple-300"
        : "border-gray-300 hover:bg-purple-50",
      gray: isSelected
        ? "bg-gray-100 text-gray-800 border-gray-300"
        : "border-gray-300 hover:bg-gray-50",
    };

    return colorMap[color] || colorMap.gray;
  };

  // สำหรับ Voucher List: รวม Service Type และ Cancelled ในแถวเดียว
  if (voucherListMode) {
    const voucherFilters = [
      { id: "all", name: "ทั้งหมด", color: "gray", type: "service" },
      { id: "bus", name: "Bus", color: "blue", type: "service" },
      { id: "boat", name: "Boat", color: "cyan", type: "service" },
      { id: "tour", name: "Tour", color: "purple", type: "service" },
      { id: "cancelled", name: "Cancelled", color: "red", type: "status" },
    ];

    return (
      <div className="flex flex-wrap gap-2">
        {voucherFilters.map((filter) => {
          const isSelected = filter.type === "service"
            ? filterServiceType === filter.id
            : filterStatus === filter.id;

          return (
            <button
              key={filter.id}
              onClick={() => {
                if (filter.type === "service") {
                  setFilterServiceType(filter.id);
                  // ถ้าเลือก Service Type ให้เปลี่ยน status เป็น all_except_cancelled
                  if (filterStatus === "cancelled") {
                    setFilterStatus("all_except_cancelled");
                  }
                } else {
                  // ถ้าเลือก Cancelled ให้ตั้ง status และรีเซ็ต service type
                  setFilterStatus(filter.id);
                  setFilterServiceType("all");
                }
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${getColorClass(
                filter.color,
                isSelected
              )}`}
            >
              <span>{filter.name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // โหมดปกติสำหรับ View หน้าอื่น (Bus/Boat/Tour View)
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
      {!hideServiceTypeFilter && (
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
      )}
    </div>
  );
};

export default BusBoatTourStatusFilter;
