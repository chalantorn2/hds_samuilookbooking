import React from "react";
import { Calendar } from "lucide-react";

const DateRangeSelector = ({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
}) => {
  return (
    <div className="px-4 py-4 border-b border-gray-200">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-gray-500">-</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateRangeSelector;
