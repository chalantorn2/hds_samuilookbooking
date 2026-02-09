// src/pages/Documents/deposit/DepositStatusFilter.jsx
import React from "react";

const DepositStatusFilter = ({ filterStatus, setFilterStatus }) => {
  const statuses = [
    { id: "all_except_cancelled", name: "ทั้งหมด", color: "gray" },
    { id: "awaiting_deposit", name: "Wait Deposit", color: "red" },
    { id: "awaiting_payment", name: "Wait Payment", color: "yellow" },
    { id: "awaiting_ticket", name: "รอออก Invoice", color: "purple" },
    { id: "issued_ticket", name: "Issued Ticket", color: "blue" },
    { id: "cancelled", name: "Cancelled", color: "red" },
  ];

  const getColorClass = (color, isSelected) => {
    const colorMap = {
      blue: isSelected
        ? "bg-blue-100 text-blue-800 border-blue-300"
        : "border-gray-300 hover:bg-blue-50",
      purple: isSelected
        ? "bg-purple-100 text-purple-800 border-purple-300"
        : "border-gray-300 hover:bg-purple-50",
      orange: isSelected
        ? "bg-orange-100 text-orange-800 border-orange-300"
        : "border-gray-300 hover:bg-orange-50",
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

export default DepositStatusFilter;
