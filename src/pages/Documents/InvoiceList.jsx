// InvoiceList.jsx - แสดงเฉพาะ INV (PO/Flight Tickets)
import React, { useState, useEffect } from "react";
import {
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  AlertCircle,
  Receipt,
  Edit2,
  Download,
  Mail,
  FileText,
  Printer,
  Check,
} from "lucide-react";
import * as XLSX from "xlsx";
import { format, startOfMonth, endOfMonth } from "date-fns";
import DateRangeSelector from "../View/common/DateRangeSelector";
import FlightStatusFilter from "../View/FlightTickets/FlightStatusFilter";
import FlightTicketDetail from "../View/FlightTickets/FlightTicketDetail";
import {
  displayThaiDateTime,
  formatDateOnly,
  formatShortReference,
} from "../../utils/helpers";
import { useInvoiceListData } from "./hooks/useInvoiceListData";
import ReceiptSelectionModal from "../../components/documents/modals/ReceiptSelectionModal";
import MultiPOReceiptGenerationModal from "../../components/documents/modals/MultiPOReceiptGenerationModal";
import DocumentViewer from "../../components/documents/viewers/DocumentViewer";
// ⭐ Import สำหรับ PO Actions (Edit, Email)
import FlightTicketDetail_Edit from "../View/FlightTickets/FlightTicketDetail_Edit";
import EmailDocument from "../../components/documents/email/EmailDocument";

const InvoiceList = () => {
  // ✅ ใช้ getCurrentMonthRange เหมือน FlightTicketsView
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
  const [searchField, setSearchField] = useState("all"); // ค่าเริ่มต้นเป็น All
  const [startDate, setStartDate] = useState(dateRange.start);
  const [endDate, setEndDate] = useState(dateRange.end);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState("po_generated_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filterStatus, setFilterStatus] = useState("all_except_cancelled");
  const [selectedTicket, setSelectedTicket] = useState(null);

  // ⭐ Multi-INV RC Generation Modal
  const [multiPOModalOpen, setMultiPOModalOpen] = useState(false);

  // ⭐ Document Viewer state for Multi-INV RC Preview
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [viewerTicketId, setViewerTicketId] = useState(null);

  // ⭐ State สำหรับ PO Action Buttons
  const [selectedTicketForEdit, setSelectedTicketForEdit] = useState(null);
  const [selectedTicketForInvoice, setSelectedTicketForInvoice] =
    useState(null);
  const [selectedTicketForReceipt, setSelectedTicketForReceipt] =
    useState(null);
  const [selectedTicketForEmail, setSelectedTicketForEmail] = useState(null);

  // ⭐ ใช้ custom hook แทน
  const { loading, error, filteredInvoices, fetchInvoices } =
    useInvoiceListData({
      startDate,
      endDate,
      searchTerm,
      searchField,
      filterStatus,
      sortField,
      sortDirection,
    });

  // ✅ เพิ่มฟังก์ชัน modal
  const openTicketDetail = (ticketId) => {
    setSelectedTicket(ticketId);
  };

  const closeTicketDetail = () => {
    setSelectedTicket(null);
  };

  // ✅ Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTickets = filteredInvoices.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // ✅ การจัดเรียงข้อมูล
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // ✅ ฟังก์ชันแสดง Amount
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return "0";
    return Math.floor(parseFloat(amount)).toLocaleString("th-TH");
  };

  // ✅ Export Excel
  const handleExportExcel = () => {
    if (filteredInvoices.length === 0) return;

    const exportData = filteredInvoices.map((ticket, index) => ({
      "No.": index + 1,
      "Doc No.": ticket.po_number || "-",
      CUST: ticket.customer?.code || ticket.customer?.name || "-",
      SUP: ticket.supplier?.code || ticket.supplier?.name || "-",
      "Pax's Name": ticket.passengersDisplay || "-",
      Pax: ticket.pax_count || 0,
      "Routing/Desc": ticket.routingDisplay || "-",
      "Ticket Number": ticket.ticketNumberDisplay || "-",
      Code: ticket.code || "-",
      Amount: parseFloat(ticket.total_amount) || 0,
      "Created At": displayThaiDateTime(
        ticket.po_generated_at || ticket.created_at,
      ),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);

    ws["!cols"] = [
      { wch: 6 }, // No.
      { wch: 18 }, // Doc No.
      { wch: 12 }, // CUST
      { wch: 12 }, // SUP
      { wch: 30 }, // Pax's Name
      { wch: 6 }, // Pax
      { wch: 30 }, // Routing/Desc
      { wch: 20 }, // Ticket Number
      { wch: 12 }, // Code
      { wch: 15 }, // Amount
      { wch: 20 }, // Created At
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoice List");

    const fileName = `InvoiceList_${format(new Date(startDate), "yyyyMMdd")}_${format(new Date(endDate), "yyyyMMdd")}.xlsx`;
    XLSX.writeFile(wb, fileName);
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
        {/* Header Section */}
        <div className="bg-white rounded-t-lg shadow-sm p-4 mb-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                รายการใบแจ้งหนี้ (Invoice List)
              </h1>
              <p className="text-sm text-gray-500">
                จัดการและติดตามรายการใบแจ้งหนี้ทั้งหมด
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Filter Status */}
              <FlightStatusFilter
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                invoiceListMode={true} // โหมด Invoice List - แสดงเฉพาะ ทั้งหมด และ Cancelled
              />

              {/* ⭐ Generate RC from Multiple POs Button */}
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
                onClick={() => setMultiPOModalOpen(true)}
              >
                <Receipt size={16} className="mr-2" />
                ออก Receipt รวม
              </button>

              {/* ⭐ Export Excel Button */}
              <button
                className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
                onClick={handleExportExcel}
                disabled={filteredInvoices.length === 0}
              >
                <Download size={16} className="mr-2" />
                Export Excel
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
          searchField={searchField}
          setSearchField={setSearchField}
          searchFieldOptions={[
            { value: "all", label: "All" },
            { value: "customer", label: "CUST" },
            { value: "supplier", label: "SUP" },
            { value: "pax_name", label: "Pax's Name" },
            { value: "ticket_number", label: "Ticket Number" },
            { value: "code", label: "Code" },
            { value: "doc_no", label: "Doc No." },
          ]}
        />

        {/* Table Section - เหมือน FlightTicketsView */}
        <div className="bg-white shadow-sm rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr className="text-center">
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("po_number")}
                  >
                    <div className="flex items-center justify-center">
                      Doc No.
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
                    Pax
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Routing/Desc
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
                    className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("total_amount")}
                    style={{ paddingRight: "2rem" }}
                  >
                    <div className="flex items-center justify-end">
                      Amount
                      <ChevronsUpDown size={16} className="ml-1" />
                    </div>
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
                    onClick={() => handleSort("po_generated_at")}
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
                      {/* Doc Number */}
                      <td className="pl-6 py-4 whitespace-nowrap text-sm font-normal text-blue-600">
                        {ticket.po_number || "-"}
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

                      {/* Pax Count */}
                      <td className="px-2 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-normal text-gray-900">
                          {ticket.pax_count || 0}
                        </div>
                      </td>

                      {/* Routing */}
                      <td className="px-2 py-4 whitespace-nowrap">
                        <div
                          className="text-sm font-normal text-gray-900"
                          title={ticket.routingDisplay || "-"}
                        >
                          {ticket.routingDisplay || "-"}
                        </div>
                      </td>

                      {/* Ticket Number */}
                      <td className="px-2 py-4 whitespace-nowrap">
                        <div className="text-sm font-normal text-gray-900">
                          {ticket.ticketNumberDisplay || "-"}
                        </div>
                      </td>

                      {/* Code */}
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ticket.code || "-"}
                      </td>

                      {/* Amount */}
                      <td
                        className="px-2 py-4 whitespace-nowrap text-right text-sm"
                        style={{ paddingRight: "2rem" }}
                      >
                        {formatCurrency(ticket.total_amount)}
                      </td>

                      {/* Actions */}
                      <td className="px-2 py-4 whitespace-nowrap text-center text-sm font-normal">
                        <div className="flex items-center justify-center space-x-2">
                          {/* 1. ปุ่มแก้ไข */}
                          <button
                            className="text-yellow-600 hover:text-yellow-900"
                            onClick={() => setSelectedTicketForEdit(ticket.id)}
                            title="แก้ไข"
                          >
                            <Edit2 size={18} />
                          </button>
                          {/* 2. ปุ่ม Print Invoice */}
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            onClick={() =>
                              setSelectedTicketForInvoice(ticket.id)
                            }
                            title="Print Invoice"
                          >
                            <Printer size={18} />
                          </button>
                          {/* 3. ปุ่มออก Receipt */}
                          <button
                            className={
                              ticket.rc_number && ticket.rc_number.trim() !== ""
                                ? "text-green-600 hover:text-green-900"
                                : "text-gray-500 hover:text-gray-700"
                            }
                            onClick={() =>
                              setSelectedTicketForReceipt(ticket.id)
                            }
                            title={
                              ticket.rc_number && ticket.rc_number.trim() !== ""
                                ? `Receipt: ${ticket.rc_number}`
                                : "ออก Receipt"
                            }
                          >
                            <Receipt size={18} />
                          </button>
                          {/* 4. ปุ่มส่งอีเมล์ */}
                          <button
                            className={
                              ticket.po_email_sent === 1 ||
                              ticket.po_email_sent === "1" ||
                              ticket.po_email_sent === true
                                ? "text-green-600 hover:text-green-800"
                                : "text-gray-400 hover:text-gray-600"
                            }
                            onClick={() => setSelectedTicketForEmail(ticket.id)}
                            title={
                              ticket.po_email_sent === 1 ||
                              ticket.po_email_sent === "1" ||
                              ticket.po_email_sent === true
                                ? "ส่งอีเมลแล้ว - คลิกเพื่อส่งใหม่"
                                : "ส่งอีเมล"
                            }
                          >
                            {ticket.po_email_sent === 1 ||
                            ticket.po_email_sent === "1" ||
                            ticket.po_email_sent === true ? (
                              <Check size={18} />
                            ) : (
                              <Mail size={18} />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                        {displayThaiDateTime(
                          ticket.po_generated_at || ticket.created_at,
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination - เหมือน FlightTicketsView */}
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
                      {Math.min(indexOfLastItem, filteredInvoices.length)}
                    </span>{" "}
                    จากทั้งหมด{" "}
                    <span className="font-medium">
                      {filteredInvoices.length}
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

      {/* Modal */}
      {selectedTicket && (
        <FlightTicketDetail
          ticketId={selectedTicket}
          onClose={closeTicketDetail}
          onPOGenerated={fetchInvoices}
          showOnlyPrint={true}
          isFromInvoiceList={true}
        />
      )}

      {/* ⭐ Multi-PO Receipt Generation Modal */}
      {multiPOModalOpen && (
        <MultiPOReceiptGenerationModal
          isOpen={multiPOModalOpen}
          onClose={() => setMultiPOModalOpen(false)}
          onRCGenerated={(data) => {
            // ปิด Modal และเปิด DocumentViewer
            setMultiPOModalOpen(false);

            // เปิด DocumentViewer สำหรับ RC ที่สร้างขึ้น
            if (data && data.primaryTicketId) {
              setViewerTicketId(data.primaryTicketId);
              setShowDocumentViewer(true);
            }

            // Refresh invoice list
            fetchInvoices();
          }}
          filteredInvoices={filteredInvoices}
        />
      )}

      {/* ⭐ Document Viewer for Multi-INV RC Preview */}
      {showDocumentViewer && viewerTicketId && (
        <DocumentViewer
          isOpen={showDocumentViewer}
          onClose={() => {
            setShowDocumentViewer(false);
            setViewerTicketId(null);
          }}
          documentType="receipt"
          ticketId={viewerTicketId}
          onDocumentGenerated={fetchInvoices}
        />
      )}

      {/* ⭐ PO: Edit Modal */}
      {selectedTicketForEdit && (
        <FlightTicketDetail_Edit
          ticketId={selectedTicketForEdit}
          onClose={() => setSelectedTicketForEdit(null)}
          onSave={() => {
            setSelectedTicketForEdit(null);
            fetchInvoices();
          }}
        />
      )}

      {/* ⭐ PO: Print Invoice (DocumentViewer) */}
      {selectedTicketForInvoice && (
        <DocumentViewer
          isOpen={!!selectedTicketForInvoice}
          onClose={() => setSelectedTicketForInvoice(null)}
          documentType="inv"
          ticketId={selectedTicketForInvoice}
          onDocumentGenerated={fetchInvoices}
        />
      )}

      {/* ⭐ PO: Issue Receipt (DocumentViewer) */}
      {selectedTicketForReceipt && (
        <DocumentViewer
          isOpen={!!selectedTicketForReceipt}
          onClose={() => setSelectedTicketForReceipt(null)}
          documentType="receipt"
          ticketId={selectedTicketForReceipt}
          onDocumentGenerated={fetchInvoices}
        />
      )}

      {/* ⭐ PO: Send Email */}
      {selectedTicketForEmail && (
        <EmailDocument
          isOpen={!!selectedTicketForEmail}
          onClose={() => setSelectedTicketForEmail(null)}
          documentType="invoice"
          recordId={selectedTicketForEmail}
          onEmailSent={() => {
            setSelectedTicketForEmail(null);
            fetchInvoices();
          }}
        />
      )}
    </div>
  );
};

export default InvoiceList;
