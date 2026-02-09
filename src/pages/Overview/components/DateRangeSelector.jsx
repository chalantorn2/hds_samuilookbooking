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
}) => {
  // แปลงจาก string (YYYY-MM-DD) เป็น Date object
  const parseStringToDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString + "T00:00:00");
  };

  // แปลงจาก Date object เป็น string (YYYY-MM-DD)
  const formatDateToString = (date) => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
          value={value}
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
        {/* ตัวเลือกช่วงวันที่ */}
        <div className="flex space-x-2 items-center">
          <DatePicker
            selected={parseStringToDate(startDate)}
            onChange={handleStartDateChange}
            dateFormat="dd/MM/yyyy"
            placeholderText="วัน/เดือน/ปี (เช่น 09/05/2025)"
            customInput={<CustomInput />}
            showYearDropdown
            showMonthDropdown
            dropdownMode="select"
            yearDropdownItemNumber={6} // 2 ปีย้อนหลัง + ปีปัจจุบัน + 3 ปีข้างหน้า = 6 ปี
            scrollableYearDropdown
            minDate={new Date(new Date().getFullYear() - 2, 0, 1)} // 2 ปีย้อนหลัง
            maxDate={
              endDate
                ? parseStringToDate(endDate)
                : new Date(new Date().getFullYear() + 3, 11, 31)
            } // 3 ปีข้างหน้า หรือวันที่สิ้นสุดที่เลือก
          />

          <span className="text-gray-500">ถึง</span>

          <DatePicker
            selected={parseStringToDate(endDate)}
            onChange={handleEndDateChange}
            dateFormat="dd/MM/yyyy"
            placeholderText="วัน/เดือน/ปี (เช่น 09/05/2025)"
            customInput={<CustomInput />}
            showYearDropdown
            showMonthDropdown
            dropdownMode="select"
            yearDropdownItemNumber={6} // 2 ปีย้อนหลัง + ปีปัจจุบัน + 3 ปีข้างหน้า = 6 ปี
            scrollableYearDropdown
            minDate={
              startDate
                ? parseStringToDate(startDate)
                : new Date(new Date().getFullYear() - 2, 0, 1)
            } // วันที่เริ่มต้นที่เลือก หรือ 2 ปีย้อนหลัง
            maxDate={new Date(new Date().getFullYear() + 3, 11, 31)} // 3 ปีข้างหน้า
          />
        </div>

        {/* ช่องค้นหา */}
        <div className="ml-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="ค้นหา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateRangeSelector;
