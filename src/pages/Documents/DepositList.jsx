import React, { useState, useEffect } from "react";
import {
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  ChevronsUpDown,
  User,
  Building,
  Users,
  MapPin,
  FileText,
  Check,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import DateRangeSelector from "../View/common/DateRangeSelector";
import DepositStatusFilter from "./deposit/DepositStatusFilter";
import { useDepositListData } from "./deposit/useDepositListData";
import CancelledDetailsModal from "../View/common/CancelledDetailsModal";
import { displayThaiDateTime } from "../../utils/helpers";
import DepositDetail from "./deposit/DepositDetail";
import DepositDetail_Edit from "./deposit/DepositDetail_Edit";

const DepositList = () => {
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

  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(dateRange.start);
  const [endDate, setEndDate] = useState(dateRange.end);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filterStatus, setFilterStatus] = useState("all_except_cancelled");
  const [selectedDepositForEdit, setSelectedDepositForEdit] = useState(null);
  const [showCancelledDetails, setShowCancelledDetails] = useState(false);
  const [selectedDepositForView, setSelectedDepositForView] = useState(null);
  const [showDepositEdit, setShowDepositEdit] = useState(false);

  const [selectedCancelledDeposit, setSelectedCancelledDeposit] =
    useState(null);

  const openDepositEditDetail = (depositId) => {
    setSelectedDepositForEdit(depositId);
    setShowDepositEdit(true);
  };

  // แก้ไข closeDepositEditDetail function
  const closeDepositEditDetail = () => {
    setSelectedDepositForEdit(null);
    setShowDepositEdit(false);
  };

  const { loading, filteredDeposits, fetchDeposits } = useDepositListData({
    startDate,
    endDate,
    searchTerm,
    filterStatus,
    sortField,
    sortDirection,
  });

  const openDepositDetail = (depositId) => {
    setSelectedDepositForView(depositId);
  };

  const closeDepositDetail = () => {
    setSelectedDepositForView(null);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDeposits = filteredDeposits.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredDeposits.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-t-lg shadow-sm p-4 mb-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                รายการใบสำคัญรับเงินมัดจำ (Deposit List)
              </h1>
              <p className="text-sm text-gray-500">
                จัดการและติดตามรายการมัดจำทั้งหมด
              </p>
            </div>
            <div className="flex-shrink-0">
              <DepositStatusFilter
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
              />
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

        <div className="bg-white shadow-sm rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr className="text-center text-nowrap">
                  <th
                    scope="col"
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("reference_number")}
                  >
                    <div className="flex items-center justify-center">
                      DP
                      <ChevronsUpDown size={16} className="ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("customer")}
                  >
                    <div className="flex items-center justify-center">
                      CUS
                      <ChevronsUpDown size={16} className="ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("supplier")}
                  >
                    <div className="flex items-center justify-center">
                      SUP
                      <ChevronsUpDown size={16} className="ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    PAX
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    ROUTING
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Total
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50"
                  >
                    DP Amt
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50"
                  >
                    DP Date
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50"
                  >
                    Balance
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50"
                  >
                    Full Pay
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    PAX Name
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center justify-center">
                      Created At
                      <ChevronsUpDown size={16} className="ml-1" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td
                      colSpan="12"
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      <div className="flex justify-center">
                        <svg
                          className="animate-spin h-5 w-5 text-blue-500"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      </div>
                    </td>
                  </tr>
                ) : currentDeposits.length === 0 ? (
                  <tr>
                    <td
                      colSpan="12"
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      ไม่พบข้อมูลตามเงื่อนไขที่กำหนด
                    </td>
                  </tr>
                ) : (
                  currentDeposits.map((deposit) => {
                    const totalPax =
                      (deposit.adult_pax || 0) +
                      (deposit.child_pax || 0) +
                      (deposit.infant_pax || 0);

                    // ✅ คำนวณ grand_total ที่รวม VAT
                    const subtotalBeforeVat =
                      parseFloat(deposit.subtotal_before_vat) || 0;
                    const vatPercent = parseFloat(deposit.vat_percent) || 0;

                    // ✅ ถ้า vat_amount = 0 แต่มี vat_percent ให้คำนวณใหม่
                    let vatAmount = parseFloat(deposit.vat_amount) || 0;
                    if (vatAmount === 0 && vatPercent > 0) {
                      vatAmount = (subtotalBeforeVat * vatPercent) / 100;
                    }

                    const displayGrandTotal = subtotalBeforeVat + vatAmount;

                    // ✅ คำนวณ balance จาก grand_total ที่รวม VAT แล้ว
                    const depositTotal = parseFloat(deposit.deposit_total) || 0;
                    const depositTotal2 = parseFloat(deposit.deposit_total_2) || 0;
                    const balance = displayGrandTotal - depositTotal - depositTotal2;

                    // ✅ กำหนดสีข้อความตามสถานะ
                    const statusType = deposit.calculated_status?.type;

                    // สำหรับ DP Amt และ DP Date
                    const dpTextColor = statusType === "awaiting_deposit"
                      ? "text-red-600"
                      : "text-gray-900";

                    // สำหรับ Balance และ Full Pay
                    const balanceTextColor =
                      statusType === "awaiting_deposit" || statusType === "awaiting_payment"
                        ? "text-red-600"
                        : "text-gray-900";

                    return (
                      <tr
                        key={deposit.id}
                        className="transition-colors  hover:bg-gray-50"
                      >
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-normal text-blue-600">
                          {deposit.reference_number || "-"}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-center">
                          <div className="text-sm font-normal text-gray-900">
                            {deposit.customer_code || "-"}
                          </div>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-center">
                          <div className="text-sm font-normal text-gray-900">
                            {deposit.supplier_code || "-"}
                          </div>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-700">
                            {totalPax || "-"}
                          </div>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap">
                          <div className="text-sm font-normal text-gray-900">
                            {deposit.routingDisplay || "-"}
                          </div>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-normal text-gray-900">
                            {displayGrandTotal
                              ? Math.round(displayGrandTotal).toLocaleString(
                                  "en-US"
                                )
                              : "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right bg-blue-50">
                          <div
                            className={`text-sm font-normal ${dpTextColor}`}
                          >
                            {(() => {
                              const total1 = parseFloat(deposit.deposit_total) || 0;
                              const total2 = parseFloat(deposit.deposit_total_2) || 0;
                              const totalDeposit = total1 + total2;
                              return totalDeposit > 0
                                ? Math.round(totalDeposit).toLocaleString("en-US")
                                : "-";
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center bg-blue-50">
                          <div className={`text-sm ${dpTextColor}`}>
                            {deposit.deposit_due_date
                              ? format(
                                  new Date(deposit.deposit_due_date),
                                  "dd/MM/yy"
                                )
                              : "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right bg-green-50">
                          <div
                            className={`text-sm font-normal ${balanceTextColor}`}
                          >
                            {balance >= 0
                              ? Math.round(balance).toLocaleString("en-US")
                              : "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center bg-green-50">
                          <div className={`text-sm ${balanceTextColor}`}>
                            {deposit.full_payment_due_date
                              ? format(
                                  new Date(deposit.full_payment_due_date),
                                  "dd/MM/yy"
                                )
                              : "-"}
                          </div>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-700">
                            {deposit.passenger_info_due_date
                              ? format(
                                  new Date(deposit.passenger_info_due_date),
                                  "dd/MM/yy"
                                )
                              : "-"}
                          </div>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-center">
                          {deposit.calculated_status &&
                            (deposit.calculated_status.type ===
                            "issued_ticket" ? (
                              <span className="text-sm font-normal ">
                                {deposit.calculated_status.label}
                              </span>
                            ) : (
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-normal ${
                                  deposit.calculated_status.color === "purple"
                                    ? "bg-purple-100 text-purple-800"
                                    : deposit.calculated_status.color ===
                                      "yellow"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {deposit.calculated_status.label}
                              </span>
                            ))}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              className="text-blue-600 hover:text-blue-900"
                              onClick={() => openDepositDetail(deposit.id)}
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>

                            {deposit.status !== "cancelled" && (
                              <button
                                className="text-yellow-600 hover:text-yellow-900"
                                onClick={() =>
                                  openDepositEditDetail(deposit.id)
                                }
                                title="Edit"
                              >
                                <Edit2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-700">
                            {deposit.created_at
                              ? displayThaiDateTime(deposit.created_at)
                              : "-"}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && totalPages > 1 && (
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ก่อนหน้า
                </button>
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ถัดไป
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    แสดง{" "}
                    <span className="font-medium">
                      {indexOfFirstItem + 1} ถึง{" "}
                      {Math.min(indexOfLastItem, filteredDeposits.length)}
                    </span>{" "}
                    จากทั้งหมด{" "}
                    <span className="font-medium">
                      {filteredDeposits.length}
                    </span>{" "}
                    รายการ
                  </p>
                </div>
                <div>
                  <nav
                    className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                    aria-label="Pagination"
                  >
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    {Array.from({ length: totalPages }, (_, index) => {
                      if (
                        index + 1 === 1 ||
                        index + 1 === totalPages ||
                        (index + 1 >= currentPage - 2 &&
                          index + 1 <= currentPage + 2)
                      ) {
                        return (
                          <button
                            key={index}
                            onClick={() => paginate(index + 1)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === index + 1
                                ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            {index + 1}
                          </button>
                        );
                      } else if (
                        index + 1 === currentPage - 3 ||
                        index + 1 === currentPage + 3
                      ) {
                        return (
                          <span
                            key={index}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                          >
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancelled Details Modal */}
      <CancelledDetailsModal
        isOpen={showCancelledDetails}
        onClose={() => {
          setShowCancelledDetails(false);
          setSelectedCancelledDeposit(null);
        }}
        cancelledData={selectedCancelledDeposit}
        documentType="deposit" // เพิ่ม prop นี้เพื่อปรับข้อความให้เหมาะสม
      />
      {selectedDepositForView && (
        <DepositDetail
          depositId={selectedDepositForView}
          onClose={closeDepositDetail}
          onEdit={openDepositEditDetail}
        />
      )}
      {/* Deposit Edit Modal */}
      {showDepositEdit && selectedDepositForEdit && (
        <DepositDetail_Edit
          depositId={selectedDepositForEdit}
          onClose={closeDepositEditDetail}
          onSave={() => {
            fetchDeposits(); // Refresh data after edit
            closeDepositEditDetail();
          }}
        />
      )}
    </div>
  );
};

export default DepositList;
