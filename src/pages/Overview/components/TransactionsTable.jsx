import React, { useState, useEffect } from "react";
import { Activity, Clock, User, Building, Shield } from "lucide-react";
// import { StatusBadge } from "./StatusBadges";
import Pagination from "./Pagination";
import CancelledDetailsModal from "../../View/common/CancelledDetailsModal";
import {
  displayThaiDateTime,
  formatDateOnly,
  formatShortReference,
} from "../../../utils/helpers";

const TransactionsTable = ({
  loading,
  currentItems,
  dateRange,
  sortField,
  sortDirection,
  setSortField,
  setSortDirection,
  totalPages,
  currentPage,
  setCurrentPage,
  indexOfFirstItem,
  indexOfLastItem,
  filteredData,
  showCancelledDetails,
  setShowCancelledDetails,
  selectedCancelledTicket,
  setSelectedCancelledTicket,
}) => {
  useEffect(() => {
    if (currentItems && currentItems.length > 0) {
      console.log("TransactionsTable sample:", currentItems[0]);
      console.log("TransactionsTable created_at:", currentItems[0].created_at);
      console.log("TransactionsTable timestamp:", currentItems[0].timestamp);
    }
  }, [currentItems]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getStatusDisplay = (item) => {
    // ตรวจสอบสถานะยกเลิก
    if (item.status === "cancelled") {
      return (
        <button
          onClick={() => {
            setSelectedCancelledTicket({
              referenceNumber: item.referenceNumber,
              cancelledAt: item.cancelled_at,
              cancelledBy: item.cancelled_by_name,
              cancelReason: item.cancel_reason,
              poNumber: item.po_number,
              customer: item.customer,
              supplier: item.supplier,
            });
            setShowCancelledDetails(true);
          }}
          className="px-2 py-1 rounded-full text-xs font-normal bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
        >
          Cancelled
        </button>
      );
    }

    // Flight Ticket Logic
    if (item.serviceType === "flight") {
      // แสดง PO Number ถ้ามี (ปกติ)
      if (item.po_number && item.po_number.trim() !== "") {
        return (
          <div className="flex items-center justify-center">
            <span className="text-sm font-normal text-gray-900">
              {item.po_number}
            </span>
          </div>
        );
      }

      // แสดง Invoice Number สีแดง ถ้าไม่มี PO แต่มี Invoice
      if (item.invoice_number && item.invoice_number.trim() !== "") {
        return (
          <div className="flex items-center justify-center">
            <span className="text-sm font-normal text-red-600">
              {item.invoice_number}
            </span>
          </div>
        );
      }

      // ถ้าไม่มีทั้ง PO และ Invoice
      return (
        <span className="px-2 py-1 rounded-full text-xs font-normal bg-yellow-100 text-yellow-800">
          Not Invoiced
        </span>
      );
    } else if (item.serviceType === "deposit") {
      // Deposit Logic - แสดงตาม status เหมือน DepositList
      switch (item.status) {
        case "pending":
          return (
            <span className="px-2 py-1 rounded-full text-xs font-normal bg-yellow-100 text-yellow-800">
              Pending
            </span>
          );
        case "issued":
          return (
            <span className="px-2 py-1 rounded-full text-xs font-normal bg-green-100 text-green-800">
              Issued
            </span>
          );
        default:
          return (
            <span className="px-2 py-1 rounded-full text-xs font-normal bg-gray-100 text-gray-800">
              {item.status || "Unknown"}
            </span>
          );
      }
    } else if (
      ["insurance", "hotel", "train", "visa", "other"].includes(
        item.serviceType
      )
    ) {
      // Other Services - ไม่แสดงอะไรเลย
      return "";
    } else {
      // Voucher Logic - แสดง VC Number
      if (item.vc_number && item.vc_number.trim() !== "") {
        return (
          <div className="flex items-center justify-center">
            <span className="text-sm font-normal text-gray-900">
              {item.vc_number}
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
    }
  };

  const truncatePaxName = (text) => {
    if (!text || text === "-") return text || "";
    const match = text.match(/^(.*?)(\s\+\d+)$/);
    if (match) {
      const names = match[1].trim();
      const count = match[2];
      return names.length > 20
        ? names.substring(0, 20) + "..." + count
        : text;
    }
    return text.length > 20 ? text.substring(0, 20) + "..." : text;
  };

  const getPaxDisplay = (item) => {
    let fullText = "";
    // Flight: แสดงชื่อผู้โดยสาร
    if (item.serviceType === "flight") {
      fullText = item.passengersDisplay || "";
    }
    // Voucher: แสดงชื่อผู้โดยสาร
    else if (item.serviceType === "voucher") {
      fullText = item.passengersDisplay || "";
    }
    // Deposit: แสดงชื่อกรุ๊ป
    else if (item.serviceType === "deposit") {
      fullText = item.groupName || "";
    }
    // Other Services: แสดงชื่อผู้โดยสาร
    else if (
      ["insurance", "hotel", "train", "visa", "other"].includes(
        item.serviceType
      )
    ) {
      fullText = item.passengersDisplay || "";
    }
    return truncatePaxName(fullText);
  };

  const getRoutingDisplay = (item) => {
    let text = "";

    if (item.serviceType === "flight" || item.serviceType === "deposit") {
      text = item.routingDisplay || "";
    } else if (item.serviceType === "voucher") {
      text = item.serviceDescription || "";
    } else if (item.serviceType === "hotel") {
      // Hotel: เอา hotel_name + nights + check_in_date มารวมกัน
      const hotelName = item.hotel_name || "";
      const nights = item.nights || "";
      const checkIn = item.check_in_date || "";

      const parts = [hotelName, nights, checkIn].filter(
        (part) => part && part.trim() !== ""
      );
      text = parts.length > 0 ? parts.join(" / ") : "";
    } else if (item.serviceType === "train") {
      // Train: แสดง description + issue_date จาก tickets_detail
      const desc = item.serviceDescription || "";
      const serviceDate = item.tickets_detail?.[0]?.issue_date || "";
      if (desc && serviceDate) {
        text = `${desc} ${serviceDate}`;
      } else {
        text = desc || serviceDate || "";
      }
    } else if (["insurance", "visa", "other"].includes(item.serviceType)) {
      // ที่เหลือ: แสดง description ตรงๆ
      text = item.serviceDescription || "";
    }

    return text.length > 20 ? text.substring(0, 20) + "..." : text;
  };

  const getTicketNumberDisplay = (item) => {
    // Flight: แสดงหมายเลขตั๋ว
    if (item.serviceType === "flight") {
      return item.ticketNumberDisplay || "";
    }
    // Voucher และ Deposit: ปล่อยว่าง
    return "";
  };

  const getCodeDisplay = (item) => {
    // Flight และ Deposit: แสดง code จาก ticket_additional_info
    if (item.serviceType === "flight" || item.serviceType === "deposit") {
      return item.code || "";
    }
    // Other Services: แสดง reference_code
    if (["insurance", "hotel", "train", "visa", "other"].includes(item.serviceType)) {
      return item.reference_code || "";
    }
    // Voucher: ปล่อยว่าง
    return "";
  };

  return (
    <div className="px-4 pb-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <Activity size={20} className="mr-2 text-blue-500" />
        รายการทั้งหมด
        {dateRange.startDate === dateRange.endDate
          ? ` (${formatDateOnly(dateRange.startDate)})`
          : ` (${formatDateOnly(dateRange.startDate)} - ${formatDateOnly(
              dateRange.endDate
            )})`}{" "}
      </h2>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("reference_number")}
                  >
                    <div className="flex items-center">ID</div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("customer")}
                  >
                    <div className="flex items-center">CUST</div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("supplier")}
                  >
                    <div className="flex items-center">SUP</div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    <div className="flex items-center">PAX'S NAME</div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    <div className="flex items-center">ROUTING</div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    <div className="flex items-center">TICKET NUMBER</div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    <div className="flex items-center">CODE</div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center justify-center">
                      STATUS
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                    onClick={() => handleSort("created_by")}
                  >
                    <div className="flex items-center">CREATE BY</div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("timestamp")}
                  >
                    <div className="flex items-center">CREATED AT</div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan="10"
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      ไม่พบข้อมูลในช่วงเวลาที่เลือก
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {formatShortReference(item.referenceNumber)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          {item.customerCode || item.customer}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          {item.supplierCode || item.supplier}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          {getPaxDisplay(item)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          {getRoutingDisplay(item)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          {getTicketNumberDisplay(item)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getCodeDisplay(item)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusDisplay(item)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          {item.createdByUsername || item.createdBy}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {displayThaiDateTime(item.timestamp)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
              indexOfFirstItem={indexOfFirstItem}
              indexOfLastItem={indexOfLastItem}
              filteredData={filteredData}
            />
          )}
        </div>
      )}
      <CancelledDetailsModal
        isOpen={showCancelledDetails}
        onClose={() => {
          setShowCancelledDetails(false);
          setSelectedCancelledTicket(null);
        }}
        cancelledData={selectedCancelledTicket}
      />
    </div>
  );
};

export default TransactionsTable;
