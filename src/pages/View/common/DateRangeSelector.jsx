import React from "react";
import { Calendar, Search } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const DateRangeSelector = ({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  searchTerm,
  setSearchTerm,
  placeholder,
  searchField,
  setSearchField,
  searchFieldOptions,
}) => {
  // ✅ แปลงจาก string (YYYY-MM-DD) เป็น Date object แบบ Local Time
  const parseStringToDate = (dateString) => {
    if (!dateString || typeof dateString !== "string") return null;

    try {
      // ตรวจสอบ format YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateString)) return null;

      // ✅ สร้าง Date แบบ Local Time (ไม่ผ่าน UTC)
      const [year, month, day] = dateString.split("-").map(Number);
      const date = new Date(year, month - 1, day, 0, 0, 0, 0);

      // ตรวจสอบว่า Date object ที่สร้างขึ้นมาถูกต้องหรือไม่
      if (isNaN(date.getTime())) return null;

      // ตรวจสอบว่าวันที่ที่สร้างตรงกับ input หรือไม่
      if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
      ) {
        return null;
      }

      return date;
    } catch (error) {
      console.warn("Invalid date string:", dateString, error);
      return null;
    }
  };

  // ✅ แปลงจาก Date object เป็น string (YYYY-MM-DD) แบบ Local Time
  const formatDateToString = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return "";
    }

    try {
      // ✅ ใช้ getFullYear, getMonth, getDate (Local Time Methods)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.warn("Error formatting date:", date, error);
      return "";
    }
  };

  // Handle start date change
  const handleStartDateChange = (date) => {
    const dateString = formatDateToString(date);
    setStartDate(dateString);
  };

  // Handle end date change
  const handleEndDateChange = (date) => {
    const dateString = formatDateToString(date);
    setEndDate(dateString);
  };

  // ✅ Safe date conversion สำหรับ DatePicker
  const safeStartDate = parseStringToDate(startDate);
  const safeEndDate = parseStringToDate(endDate);

  // Custom input component with calendar icon
  const CustomInput = React.forwardRef(
    ({ value, onClick, placeholder }, ref) => (
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Calendar size={18} className="text-gray-400" />
        </div>
        <input
          ref={ref}
          type="text"
          className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          value={value || ""}
          onClick={onClick}
          placeholder={placeholder}
          readOnly
        />
      </div>
    )
  );

  return (
    <div className="bg-white shadow-sm p-4 mb-4">
      <div className="flex flex-wrap gap-4 items-center">
        {/* ตัวเลือกช่วงวันที่ */}
        <div className="flex space-x-2 items-center">
          <DatePicker
            selected={safeStartDate}
            onChange={handleStartDateChange}
            dateFormat="dd/MM/yyyy"
            placeholderText="วัน/เดือน/ปี (เช่น 09/05/2025)"
            customInput={<CustomInput />}
            showYearDropdown
            showMonthDropdown
            dropdownMode="select"
            yearDropdownItemNumber={6}
            scrollableYearDropdown
            minDate={new Date(new Date().getFullYear() - 2, 0, 1)}
            maxDate={
              safeEndDate || new Date(new Date().getFullYear() + 3, 11, 31)
            }
            isClearable={false}
            autoComplete="off"
          />

          <span className="text-gray-500">ถึง</span>

          <DatePicker
            selected={safeEndDate}
            onChange={handleEndDateChange}
            dateFormat="dd/MM/yyyy"
            placeholderText="วัน/เดือน/ปี (เช่น 09/05/2025)"
            customInput={<CustomInput />}
            showYearDropdown
            showMonthDropdown
            dropdownMode="select"
            yearDropdownItemNumber={6}
            scrollableYearDropdown
            minDate={
              safeStartDate || new Date(new Date().getFullYear() - 2, 0, 1)
            }
            maxDate={new Date(new Date().getFullYear() + 3, 11, 31)}
            isClearable={false}
            autoComplete="off"
          />
        </div>

        {/* ช่องค้นหา */}
        <div className="ml-auto flex items-center gap-2">
          {/* Dropdown สำหรับเลือก field ที่จะค้นหา */}
          {searchFieldOptions &&
            searchFieldOptions.length > 0 &&
            (() => {
              const selectedOption = searchFieldOptions.find(
                (opt) => opt.value === (searchField || "all")
              );
              const selectedLabel = selectedOption?.label || "All";
              // คำนวณความกว้างตามความยาวของ label (ประมาณ 8px ต่อตัวอักษร + padding)
              const dynamicWidth = Math.max(selectedLabel.length * 9 + 30, 50);
              return (
                <select
                  className="py-2 px-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white text-sm transition-all duration-150"
                  style={{ width: `${dynamicWidth}px` }}
                  value={searchField || "all"}
                  onChange={(e) => setSearchField(e.target.value)}
                >
                  {searchFieldOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              );
            })()}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder={placeholder || "ค้นหา..."}
              value={searchTerm || ""}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateRangeSelector;
