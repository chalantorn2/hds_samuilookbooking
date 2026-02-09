// src/components/Documents/ReceiptList.jsx
// ปรับ Format ให้เหมือน InvoiceList ทุกอย่าง

import React, { useState, useEffect } from "react";
import {
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Printer,
  Check,
  ChevronsUpDown,
  AlertCircle,
  Receipt,
  User,
  Plane,
  Users,
  MapPin,
  Ticket,
  Mail,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import DateRangeSelector from "../View/common/DateRangeSelector";
import FlightStatusFilter from "../View/FlightTickets/FlightStatusFilter";
import {
  displayThaiDateTime,
  formatDateOnly,
  formatShortReference,
} from "../../utils/helpers";
import { useReceiptListData } from "./hooks/useReceiptListData";
import { DocumentViewer } from "../../components/documents";
import EmailDocument from "../../components/documents/email/EmailDocument";
import BulkEmailReceiptModal from "../../components/documents/email/BulkEmailReceiptModal";
import { useAuth } from "../Login/AuthContext";

const ReceiptList = () => {
  const { user } = useAuth();
  // ⭐ ใช้ getCurrentMonthRange เหมือน InvoiceList
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
  const [sortField, setSortField] = useState("rc_generated_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filterStatus, setFilterStatus] = useState("all");

  // ⭐ ใช้ custom hook แทน
  const { loading, error, filteredReceipts, fetchReceipts } = useReceiptListData({
    startDate,
    endDate,
    searchTerm,
    filterStatus,
    sortField,
    sortDirection,
  });

  // ⭐ เพิ่ม state สำหรับ PrintDocument
  const [selectedTicketForPrint, setSelectedTicketForPrint] = useState(null);
  const [selectedReceiptData, setSelectedReceiptData] = useState(null); // ⭐ เพิ่ม state สำหรับ selection data
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedTicketForEmail, setSelectedTicketForEmail] = useState(null);
  const [selectedEmailReceiptData, setSelectedEmailReceiptData] =
    useState(null);

  // ⭐ Bulk Email Modal
  const [bulkEmailModalOpen, setBulkEmailModalOpen] = useState(false);

  // ⭐ ส่งข้อมูล filtered receipts ไปยัง Modal
  const getFilteredReceiptsForModal = () => {
    return filteredReceipts; // ส่งข้อมูลที่ filter แล้วจากหน้าหลัก
  };

  // ⭐ แก้ฟังก์ชัน modal ให้รับ ticket object แทน ID
  const openPrintReceipt = (ticket) => {
    console.log("🔍 Ticket data:", ticket);
    console.log("🔍 RC Selection Data:", ticket.rc_selection_data);
    console.log("🔍 Type:", typeof ticket.rc_selection_data);
    setSelectedTicketForPrint(ticket.id);
    setSelectedReceiptData(ticket.rc_selection_data || null); // ⭐ เก็บ selection data
    setPrintModalOpen(true);
  };

  const closePrintModal = () => {
    setSelectedTicketForPrint(null);
    setSelectedReceiptData(null); // ⭐ clear selection data
    setPrintModalOpen(false);
  };

  // ← เพิ่ม function นี้
  const openEmailReceipt = (ticket) => {
    console.log("📧 Opening email for ticket:", ticket.id);
    setSelectedTicketForEmail(ticket.id);
    setSelectedEmailReceiptData(ticket.rc_selection_data || null);
    setEmailModalOpen(true);
  };

  const closeEmailModal = () => {
    setSelectedTicketForEmail(null);
    setSelectedEmailReceiptData(null);
    setEmailModalOpen(false);
  };

  const handleEmailSent = (message) => {
    console.log("📧 Email sent successfully:", message);
    // Force refresh with a small delay to ensure DB is updated
    setTimeout(() => {
      console.log("🔄 Refreshing receipt list after email sent...");
      fetchReceipts();
    }, 500);
  };

  // ⭐ Bulk Email Functions
  const openBulkEmailModal = () => {
    setBulkEmailModalOpen(true);
  };

  const closeBulkEmailModal = () => {
    setBulkEmailModalOpen(false);
  };

  const handleBulkEmailSent = (message) => {
    console.log("📧 Bulk email sent successfully:", message);
    // Force refresh with a small delay to ensure DB is updated
    setTimeout(() => {
      console.log("🔄 Refreshing receipt list after bulk email sent...");
      fetchReceipts();
    }, 500);
  };

  // ⭐ เพิ่ม Pagination เหมือน InvoiceList
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTickets = filteredReceipts.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // ⭐ การจัดเรียงข้อมูล
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // ⭐ ฟังก์ชันแสดง Ticket Number เหมือน InvoiceList
  const getTicketNumberDisplay = (ticket) => {
    if (ticket.ticketNumberDisplay) {
      return ticket.ticketNumberDisplay;
    }

    if (ticket.firstPassengerTicketInfo) {
      const { ticket_number, ticket_code } = ticket.firstPassengerTicketInfo;

      if (ticket_number && ticket_code) {
        return `${ticket_number}-${ticket_code}`;
      } else if (ticket_number) {
        return ticket_number;
      } else if (ticket_code) {
        return ticket_code;
      }
    }

    return "-";
  };

  // ⭐ ไม่ต้อง useEffect เพราะ custom hook จัดการให้แล้ว

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center mb-4">
            <AlertCircle className="text-red-500 mr-2" size={20} />
            <span className="text-red-700">{error}</span>
          </div>
        )}
        {/* Header Section - เหมือน InvoiceList */}
        <div className="bg-white rounded-t-lg shadow-sm p-4 mb-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                รายการใบเสร็จรับเงิน (Receipt List)
              </h1>
              <p className="text-sm text-gray-500">
                จัดการและติดตามรายการใบเสร็จรับเงินทั้งหมด
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Email Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">ทั้งหมด</option>
                <option value="sent">ส่งแล้ว</option>
                <option value="unsent">ยังไม่ส่ง</option>
              </select>

              {/* Send Multiple Receipts Button */}
              <button
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
                onClick={openBulkEmailModal}
              >
                <Mail size={16} className="mr-2" />
                Send Multiple Receipts
              </button>
            </div>
          </div>
        </div>

        {/* Date Range Selector */}
        <DateRangeSelector
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder="ค้นหา Reference, Customer, RC Number..."
        />

        {/* Table Section - เหมือน InvoiceList แต่คอลัมแรกเป็น RC Number */}
        <div className="bg-white shadow-sm rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr className="text-center">
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("rc_number")}
                  >
                    <div className="flex items-center justify-center">
                      RC
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
                    <div className="flex items-center justify-center">
                      SUP
                      <ChevronsUpDown size={16} className="ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Pax's Name
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Routing
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Ticket Number
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Code
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    PO
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Print
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("rc_generated_at")}
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
                      colSpan="11"
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
                ) : currentTickets.length === 0 ? (
                  <tr>
                    <td
                      colSpan="11"
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      ไม่พบข้อมูลตามเงื่อนไขที่กำหนด
                    </td>
                  </tr>
                ) : (
                  currentTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* RC Number */}
                      <td className="pl-6 py-4 whitespace-nowrap text-sm font-normal text-blue-600">
                        {/* แสดง * สีแดงถ้าเป็น MultiPOReceipt */}
                        {ticket.isMultiPOReceipt && (
                          <span className="text-red-600 font-bold mr-1">*</span>
                        )}
                        {ticket.rc_number || "-"}
                      </td>

                      {/* Customer */}
                      <td className="px-2 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-normal text-gray-900">
                          {ticket.customer?.code ||
                            ticket.customer?.name ||
                            "-"}
                        </div>
                      </td>

                      {/* Supplier */}
                      <td className="px-2 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-normal text-gray-900">
                          {ticket.supplier?.code ||
                            ticket.supplier?.name ||
                            "-"}
                        </div>
                      </td>

                      {/* Pax's Name */}
                      <td className="px-2 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center">
                          <div className="text-sm font-normal text-gray-900">
                            {(() => {
                              const fullText = ticket.passengersDisplay || "-";
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
                        </div>
                      </td>

                      {/* Routing */}
                      <td className="px-2 py-4 whitespace-nowrap">
                        <div className="text-sm font-normal text-gray-900">
                          {ticket.routingDisplay || "-"}
                        </div>
                      </td>

                      {/* Ticket Number */}
                      <td className="px-2 py-4 whitespace-nowrap">
                        <div className="text-sm font-normal text-gray-900">
                          {getTicketNumberDisplay(ticket)}
                        </div>
                      </td>

                      {/* Code */}
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ticket.code || "-"}
                      </td>

                      {/* PO Number */}
                      <td className="px-2 py-4 whitespace-nowrap text-sm ">
                        {ticket.po_number || "-"}
                      </td>

                      {/* Print Column */}
                      <td className="px-2 py-4 whitespace-nowrap text-center text-sm font-normal">
                        <button
                          className="text-blue-600 hover:text-blue-900"
                          onClick={() => openPrintReceipt(ticket)}
                          title="Print Receipt"
                        >
                          <Printer size={18} />
                        </button>
                      </td>

                      {/* Email Column */}
                      <td className="px-2 py-4 whitespace-nowrap text-center text-sm font-normal">
                        <button
                          className={
                            ticket.rc_email_sent === 1 ||
                            ticket.rc_email_sent === "1" ||
                            ticket.rc_email_sent === true
                              ? "text-green-600 hover:text-green-800"
                              : "text-gray-400 hover:text-gray-600"
                          }
                          onClick={() => openEmailReceipt(ticket)}
                          title={
                            ticket.rc_email_sent === 1 ||
                            ticket.rc_email_sent === "1" ||
                            ticket.rc_email_sent === true
                              ? "ส่งอีเมลแล้ว - คลิกเพื่อส่งใหม่"
                              : "ส่งอีเมล"
                          }
                        >
                          {ticket.rc_email_sent === 1 ||
                          ticket.rc_email_sent === "1" ||
                          ticket.rc_email_sent === true ? (
                            <Check size={18} />
                          ) : (
                            <Mail size={18} />
                          )}
                        </button>
                      </td>

                      {/* Created At */}
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                        {displayThaiDateTime(
                          ticket.rc_generated_at || ticket.created_at
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination - เหมือน InvoiceList */}
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
                      {Math.min(indexOfLastItem, filteredReceipts.length)}
                    </span>{" "}
                    จากทั้งหมด{" "}
                    <span className="font-medium">{filteredReceipts.length}</span>{" "}
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

      {/* Email Receipt Modal */}
      {emailModalOpen && selectedTicketForEmail && (
        <EmailDocument
          isOpen={emailModalOpen}
          onClose={closeEmailModal}
          documentType="receipt"
          recordId={selectedTicketForEmail}
          receiptData={selectedEmailReceiptData}
          onEmailSent={handleEmailSent}
          userId={user?.id} // ✅ ส่ง userId สำหรับ Activity Log
        />
      )}

      {/* ⭐ Print Receipt Modal */}
      {printModalOpen && selectedTicketForPrint && (
        <DocumentViewer
          isOpen={printModalOpen}
          onClose={closePrintModal}
          documentType="receipt"
          ticketId={selectedTicketForPrint}
          receiptData={selectedReceiptData}
        />
      )}

      {/* ⭐ Bulk Email Receipt Modal */}
      {bulkEmailModalOpen && (
        <BulkEmailReceiptModal
          isOpen={bulkEmailModalOpen}
          onClose={closeBulkEmailModal}
          onEmailSent={handleBulkEmailSent}
          filteredReceipts={getFilteredReceiptsForModal()}
        />
      )}
    </div>
  );
};

export default ReceiptList;
