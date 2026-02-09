import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import DateRangeSelector from "./components/DateRangeSelector";
import ServiceTypeFilter from "./components/ServiceTypeFilter";
import TransactionsTable from "./components/TransactionsTable";
import { useOverviewData } from "./hooks/useOverviewData";
import CancelledDetailsModal from "../View/common/CancelledDetailsModal";

const Overview = () => {
  const getCurrentMonthRange = () => {
    const now = new Date();
    const firstDay = startOfMonth(now);
    const lastDay = endOfMonth(now);

    return {
      start: format(firstDay, "yyyy-MM-dd"),
      end: format(lastDay, "yyyy-MM-dd"),
    };
  };

  const dateRange = getCurrentMonthRange();

  const [startDate, setStartDate] = useState(dateRange.start);
  const [endDate, setEndDate] = useState(dateRange.end);
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("timestamp"); // เปลี่ยนจาก "created_at" เป็น "timestamp"
  const [sortDirection, setSortDirection] = useState("desc"); // ให้ล่าสุดขึ้นก่อน
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showCancelledDetails, setShowCancelledDetails] = useState(false);
  const [selectedCancelledTicket, setSelectedCancelledTicket] = useState(null);

  const { loading, filteredData, fetchData } = useOverviewData({
    startDate,
    endDate,
    serviceTypeFilter,
    sortField,
    sortDirection,
    searchTerm,
    currentPage,
    itemsPerPage,
  });

  useEffect(() => {
    const range = getCurrentMonthRange();
    setStartDate(range.start);
    setEndDate(range.end);
    setTimeout(() => {
      fetchData();
    }, 100);
  }, []);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-white rounded-t-lg shadow-sm p-4 mb-2">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h1 className="text-xl font-bold text-gray-800">Overview</h1>
                <p className="text-sm text-gray-500">
                  ภาพรวมการดำเนินงานและเอกสารที่ออกในระบบ
                </p>
              </div>
            </div>
          </div>

          <DateRangeSelector
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />

          <ServiceTypeFilter
            serviceTypeFilter={serviceTypeFilter}
            setServiceTypeFilter={setServiceTypeFilter}
          />

          <TransactionsTable
            loading={loading}
            currentItems={currentItems}
            dateRange={{ startDate, endDate }}
            sortField={sortField}
            sortDirection={sortDirection}
            setSortField={setSortField}
            setSortDirection={setSortDirection}
            totalPages={totalPages}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            indexOfFirstItem={indexOfFirstItem}
            indexOfLastItem={indexOfLastItem}
            filteredData={filteredData}
            showCancelledDetails={showCancelledDetails} // เพิ่ม
            setShowCancelledDetails={setShowCancelledDetails} // เพิ่ม
            selectedCancelledTicket={selectedCancelledTicket} // เพิ่ม
            setSelectedCancelledTicket={setSelectedCancelledTicket} // เพิ่ม
          />
        </div>
      </div>
    </div>
  );
};

export default Overview;
