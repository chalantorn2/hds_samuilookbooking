// src/pages/Documents/components/DateRangeSelector.jsx
// DateRangeSelector ใหม่เฉพาะสำหรับ Documents Module

import React from "react";
import { Search, Calendar } from "lucide-react";

const DateRangeSelector = ({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  searchTerm,
  setSearchTerm,
  placeholder = "ค้นหา Reference, Customer, PO Number...",
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        {/* Date Range Section */}
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
            ช่วงวันที่:
          </span>

          <div className="flex items-center gap-2">
            {/* Start Date */}
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40 px-3 py-2 pl-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Calendar
                size={16}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>

            <span className="text-gray-500 text-sm">ถึง</span>

            {/* End Date */}
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40 px-3 py-2 pl-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Calendar
                size={16}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="flex-1 w-full max-w-md">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Quick Date Filters (Optional) */}
        <div className="flex gap-1">
          <button
            onClick={() => {
              const today = new Date();
              const lastWeek = new Date(
                today.getTime() - 7 * 24 * 60 * 60 * 1000
              );
              setStartDate(lastWeek.toISOString().split("T")[0]);
              setEndDate(today.toISOString().split("T")[0]);
            }}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
          >
            7 วัน
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const lastMonth = new Date(
                today.getTime() - 30 * 24 * 60 * 60 * 1000
              );
              setStartDate(lastMonth.toISOString().split("T")[0]);
              setEndDate(today.toISOString().split("T")[0]);
            }}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
          >
            30 วัน
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const startOfMonth = new Date(
                today.getFullYear(),
                today.getMonth(),
                1
              );
              setStartDate(startOfMonth.toISOString().split("T")[0]);
              setEndDate(today.toISOString().split("T")[0]);
            }}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
          >
            เดือนนี้
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateRangeSelector;
