// src/pages/View/OtherServices/OtherServicesView.jsx
// Main View Component for Other Services (Insurance, Hotel, Train, Visa, Other)
// Based on BusBoatTourView.jsx with other services-specific modifications
// ✅ Status: not_voucher/voucher_issued/cancelled (เหมือน voucher ไม่ใช่ invoice)
// ✅ แทนที่ไฟล์เดิมที่มีอยู่

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
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import DateRangeSelector from "../common/DateRangeSelector";
import OtherServicesStatusFilter from "./OtherServicesStatusFilter";
import { useOtherServicesData } from "./useOtherServicesData";
import OtherServicesDetail from "./OtherServicesDetail";
import CancelledDetailsModal from "../common/CancelledDetailsModal";
import {
  displayThaiDateTime,
  formatDateOnly,
  formatShortReference,
} from "../../../utils/helpers";
import OtherServicesDetail_Edit from "./OtherServicesDetail_Edit";

const OtherServicesView = () => {
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
  const [filterServiceType, setFilterServiceType] = useState("all");
  const [selectedOther, setSelectedOther] = useState(null);
  const [showCancelledDetails, setShowCancelledDetails] = useState(false);
  const [selectedCancelledOther, setSelectedCancelledOther] = useState(null);
  const [editingOther, setEditingOther] = useState(null);

  // ✅ ใช้ useOtherServicesData แทน useBusBoatTourData
  const { loading, filteredOthers, fetchOthers } = useOtherServicesData({
    startDate,
    endDate,
    searchTerm,
    filterStatus,
    filterServiceType,
    sortField,
    sortDirection,
  });

  useEffect(() => {
    fetchOthers();
  }, [
    startDate,
    endDate,
    filterStatus,
    filterServiceType,
    sortField,
    sortDirection,
  ]);

  const openOtherDetail = (otherId) => {
    setSelectedOther(otherId);
  };

  const closeOtherDetail = () => {
    setSelectedOther(null);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOthers = filteredOthers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOthers.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // ✅ Status display เหมือน Bus/Boat/Tour (VC Number logic)
  const getStatusDisplay = (other) => {
    // ตรวจสอบสถานะยกเลิก
    if (other.status === "cancelled") {
      return (
        <button
          onClick={() => {
            setSelectedCancelledOther({
              referenceNumber: other.reference_number,
              cancelledAt: other.cancelled_at,
              cancelledBy: other.cancelled_by_name,
              cancelReason: other.cancel_reason,
              vcNumber: other.vc_number,
              customer: other.customer?.name,
              supplier: other.supplier?.name,
            });
            setShowCancelledDetails(true);
          }}
          className="px-2 py-1 rounded-full text-xs font-normal bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
        >
          Cancelled
        </button>
      );
    }

    // แสดง VC Number หรือ Not Voucher สำหรับสถานะปกติ
    if (other.vc_number && other.vc_number.trim() !== "") {
      return (
        <div className="flex items-center justify-center">
          <span className="text-sm font-normal text-gray-900">
            {other.vc_number}
          </span>
        </div>
      );
    } else {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-normal bg-yellow-100 text-yellow-800">
          Not Voucher
        </span>
      );
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-t-lg shadow-sm p-4 mb-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                รายการบริการอื่นๆ (Other Services)
              </h1>
              <p className="text-sm text-gray-500">
                จัดการและติดตาม Other Services: ประกัน, โรงแรม, รถไฟ, วีซ่า
                และอื่นๆ
              </p>
            </div>
            <div className="flex-shrink-0">
              <OtherServicesStatusFilter
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                filterServiceType={filterServiceType}
                setFilterServiceType={setFilterServiceType}
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
                <tr className="text-center">
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("id")}
                  >
                    <div className="flex items-center justify-center">
                      ID
                      <ChevronsUpDown size={16} className="ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("customer")}
                  >
                    <div className="flex items-center justify-center">
                      CUST
                      <ChevronsUpDown size={16} className="ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("supplier")}
                  >
                    <div className="flex items-center justify-center">SUP</div>
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Pax's Name
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Reference
                  </th>

                  {/* Status column hidden */}
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
                      colSpan="9"
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
                ) : currentOthers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      ไม่พบข้อมูลตามเงื่อนไขที่กำหนด
                    </td>
                  </tr>
                ) : (
                  currentOthers.map((other) => (
                    <tr
                      key={other.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* ID Column - แสดง reference_number */}
                      <td className="pl-6 py-4 whitespace-nowrap text-sm font-normal text-blue-600">
                        {formatShortReference(other.reference_number)}
                      </td>

                      {/* Customer Column */}
                      <td className="px-2 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-normal text-gray-900">
                          {other.customer?.code || other.customer?.name || "-"}
                        </div>
                      </td>

                      {/* Supplier Column */}
                      <td className="px-2 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-normal text-gray-900">
                          {other.supplier?.code || other.supplier?.name || "-"}
                        </div>
                      </td>

                      {/* Passengers Column - ชิดซ้าย */}
                      <td className="px-2 py-4 whitespace-nowrap text-left">
                        <div className="text-sm font-normal text-gray-900">
                          {(() => {
                            const fullText = other.passengersDisplay || "-";
                            if (fullText === "-") return "-";
                            const match = fullText.match(/^(.*?)(\s\+\d+)$/);
                            if (match) {
                              const names = match[1].trim();
                              const count = match[2];
                              return names.length > 20
                                ? names.substring(0, 20) + "..." + count
                                : fullText;
                            }
                            return fullText.length > 20
                              ? fullText.substring(0, 20) + "..."
                              : fullText;
                          })()}
                        </div>
                      </td>

                      {/* Description Column - แสดงรายละเอียดบริการ */}
                      <td className="px-2 py-4 whitespace-nowrap text-left">
                        <div className="text-sm font-normal text-gray-900">
                          {(() => {
                            const text = other.serviceDescription || "-";
                            return text.length > 20
                              ? text.substring(0, 20) + "..."
                              : text;
                          })()}
                        </div>
                      </td>

                      {/* Date Column - แสดงวันที่บริการ */}
                      <td className="px-2 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-normal text-gray-900">
                          {other.serviceDateDisplay || "-"}
                        </div>
                      </td>

                      {/* Reference Column - แสดง reference_code */}
                      <td className="px-2 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-normal text-gray-900">
                          {other.details?.reference_code || "-"}
                        </div>
                      </td>

                      {/* Status Column - hidden */}

                      {/* Actions Column - เหลือแค่ View */}
                      <td className="px-2 py-4 whitespace-nowrap text-right text-sm font-normal">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            onClick={() => openOtherDetail(other.id)}
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            className="text-yellow-600 hover:text-yellow-900"
                            onClick={() => setEditingOther(other.id)}
                          >
                            <Edit2 size={18} />
                          </button>
                        </div>
                      </td>

                      {/* Created At Column - แสดงวันที่และเวลา */}
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                        {other.timestamp
                          ? new Date(other.timestamp).toLocaleString("th-TH", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
                      {Math.min(indexOfLastItem, filteredOthers.length)}
                    </span>{" "}
                    จากทั้งหมด{" "}
                    <span className="font-medium">{filteredOthers.length}</span>{" "}
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

      {selectedOther && (
        <OtherServicesDetail
          otherId={selectedOther}
          onClose={closeOtherDetail}
        />
      )}

      {editingOther && (
        <OtherServicesDetail_Edit
          otherId={editingOther}
          onClose={() => setEditingOther(null)}
          onSave={() => {
            setEditingOther(null);
            fetchOthers(); // refresh data
          }}
        />
      )}

      {/* Cancelled Details Modal */}
      <CancelledDetailsModal
        isOpen={showCancelledDetails}
        onClose={() => {
          setShowCancelledDetails(false);
          setSelectedCancelledOther(null);
        }}
        cancelledData={selectedCancelledOther}
      />
    </div>
  );
};

export default OtherServicesView;
