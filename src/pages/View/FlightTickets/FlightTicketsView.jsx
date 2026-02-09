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
  Plane,
  Users,
  MapPin,
  Ticket, // เพิ่ม icon สำหรับ ticket number
  Mail,
  Check,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import DateRangeSelector from "../common/DateRangeSelector";
import FlightStatusFilter from "./FlightStatusFilter";
import FlightTicketDetail from "./FlightTicketDetail";
import { useFlightTicketsData } from "./useFlightTicketsData";
import FlightTicketDetail_Edit from "./FlightTicketDetail_Edit";
import CancelledDetailsModal from "../common/CancelledDetailsModal";
import EmailDocument from "../../../components/documents/email/EmailDocument";
import {
  displayThaiDateTime,
  formatDateOnly,
  formatShortReference,
} from "../../../utils/helpers";

const FlightTicketsView = () => {
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
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filterStatus, setFilterStatus] = useState("all_except_cancelled");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedTicketForEdit, setSelectedTicketForEdit] = useState(null);
  const [showCancelledDetails, setShowCancelledDetails] = useState(false);
  const [selectedCancelledTicket, setSelectedCancelledTicket] = useState(null);

  // Email modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedTicketForEmail, setSelectedTicketForEmail] = useState(null);

  const openTicketEditDetail = (ticketId) => {
    setSelectedTicketForEdit(ticketId);
  };

  const closeTicketEditDetail = () => {
    setSelectedTicketForEdit(null);
  };

  const openEmailInvoice = (ticketId) => {
    setSelectedTicketForEmail(ticketId);
    setEmailModalOpen(true);
  };

  const closeEmailModal = () => {
    setSelectedTicketForEmail(null);
    setEmailModalOpen(false);
  };

  const handleEmailSent = (message) => {
    console.log("📧 Email sent successfully:", message);
    // Force refresh with a small delay to ensure DB is updated
    setTimeout(() => {
      console.log("🔄 Refreshing flight tickets list after email sent...");
      fetchFlightTickets();
    }, 500);
  };

  const { loading, filteredTickets, fetchFlightTickets } = useFlightTicketsData(
    {
      startDate,
      endDate,
      searchTerm,
      searchField,
      filterStatus,
      sortField,
      sortDirection,
    }
  );

  useEffect(() => {
    fetchFlightTickets();
  }, [startDate, endDate, filterStatus, sortField, sortDirection, searchField]);

  const openTicketDetail = (ticketId) => {
    setSelectedTicket(ticketId);
  };

  const closeTicketDetail = () => {
    setSelectedTicket(null);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTickets = filteredTickets.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getStatusDisplay = (ticket) => {
    // ตรวจสอบสถานะยกเลิก
    if (ticket.status === "cancelled") {
      return (
        <button
          onClick={() => {
            setSelectedCancelledTicket({
              referenceNumber: ticket.reference_number,
              cancelledAt: ticket.cancelled_at,
              cancelledBy: ticket.cancelled_by_name,
              cancelReason: ticket.cancel_reason,
              poNumber: ticket.po_number,
              customer: ticket.customer?.name,
              supplier: ticket.supplier?.name,
            });
            setShowCancelledDetails(true);
          }}
          className="px-2 py-1 rounded-full text-xs font-normal bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
        >
          Cancelled
        </button>
      );
    }

    // แสดง PO Number ถ้ามี (ปกติ)
    if (ticket.po_number && ticket.po_number.trim() !== "") {
      return (
        <div className="flex items-center">
          <span className="text-sm font-normal text-gray-900">
            {ticket.po_number}
          </span>
        </div>
      );
    }

    // แสดง Invoice Number สีแดง ถ้าไม่มี PO แต่มี Invoice
    if (ticket.invoice_number && ticket.invoice_number.trim() !== "") {
      return (
        <div className="flex items-center">
          <span className="text-sm font-normal text-red-600">
            {ticket.invoice_number}
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
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-t-lg shadow-sm p-4 mb-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                รายการตั๋วเครื่องบิน (Flight Tickets)
              </h1>
              <p className="text-sm text-gray-500">
                จัดการและติดตามรายการตั๋วเครื่องบินทั้งหมด
              </p>
            </div>
            <div className="flex-shrink-0">
              <FlightStatusFilter
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
          searchField={searchField}
          setSearchField={setSearchField}
          searchFieldOptions={[
            { value: "all", label: "All" },
            { value: "customer", label: "CUST" },
            { value: "supplier", label: "SUP" },
            { value: "pax_name", label: "Pax's Name" },
            { value: "ticket_number", label: "Ticket Number" },
            { value: "code", label: "Code" },
            { value: "status", label: "PO" },
          ]}
        />

        <div className="bg-white shadow-sm rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr className="text-center">
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("reference_number")}
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
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("ticket_number")}
                  >
                    <div className="flex items-center justify-center">
                      Ticket Number
                      <ChevronsUpDown size={16} className="ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Code
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center justify-center">
                      Status
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
                      colSpan="10" // เปลี่ยนจาก 9 เป็น 10 เนื่องจากเพิ่มคอลัม
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
                      colSpan="10" // เปลี่ยนจาก 9 เป็น 10 เนื่องจากเพิ่มคอลัม
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
                      <td className="pl-6 py-4 whitespace-nowrap text-sm font-normal text-blue-600">
                        {formatShortReference(ticket.reference_number)}
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-normal text-gray-900">
                          {ticket.customer?.code ||
                            ticket.customer?.name ||
                            "-"}
                        </div>
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-normal text-gray-900">
                          {ticket.supplier?.code ||
                            ticket.supplier?.name ||
                            "-"}
                        </div>
                      </td>
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
                      <td className="px-2 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-normal text-gray-900">
                            {ticket.routingDisplay || "-"}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-4  whitespace-nowrap ">
                        <div className="text-sm font-normal text-gray-900">
                          {ticket.ticketNumberDisplay || "-"}
                        </div>
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ticket.code || "-"}
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap">
                        {getStatusDisplay(ticket)}
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap text-right text-sm font-normal">
                        <div className="flex items-center  justify-center space-x-2">
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            onClick={() => openTicketDetail(ticket.id)}
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>

                          {/* แสดงปุ่ม Edit เฉพาะตั๋วที่ไม่ใช่สถานะ cancelled */}
                          {ticket.status !== "cancelled" && (
                            <button
                              className="text-yellow-600 hover:text-yellow-900"
                              onClick={() => openTicketEditDetail(ticket.id)}
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                          )}

                          {/* แสดงปุ่ม Email เฉพาะตั๋วที่มี PO (invoiced) */}
                          {ticket.status !== "cancelled" &&
                            ticket.status !== "not_invoiced" &&
                            ticket.po_number && (
                              <button
                                className={
                                  ticket.po_email_sent === 1 ||
                                  ticket.po_email_sent === "1" ||
                                  ticket.po_email_sent === true
                                    ? "text-green-600 hover:text-green-800"
                                    : "text-gray-400 hover:text-gray-600"
                                }
                                onClick={() => openEmailInvoice(ticket.id)}
                                title={
                                  ticket.po_email_sent === 1 ||
                                  ticket.po_email_sent === "1" ||
                                  ticket.po_email_sent === true
                                    ? "ส่งอีเมลแล้ว - คลิกเพื่อส่งใหม่"
                                    : "ส่งอีเมล PO"
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
                            )}
                        </div>
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                        {displayThaiDateTime(ticket.timestamp)}
                      </td>
                    </tr>
                  ))
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
                      {Math.min(indexOfLastItem, filteredTickets.length)}
                    </span>{" "}
                    จากทั้งหมด{" "}
                    <span className="font-medium">
                      {filteredTickets.length}
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

      {selectedTicket && (
        <FlightTicketDetail
          ticketId={selectedTicket}
          onClose={closeTicketDetail}
          onPOGenerated={fetchFlightTickets}
        />
      )}
      {selectedTicketForEdit && (
        <FlightTicketDetail_Edit
          ticketId={selectedTicketForEdit}
          onClose={closeTicketEditDetail}
          onSave={() => {
            closeTicketEditDetail();
            fetchFlightTickets();
          }}
        />
      )}
      {/* Cancelled Details Modal */}
      <CancelledDetailsModal
        isOpen={showCancelledDetails}
        onClose={() => {
          setShowCancelledDetails(false);
          setSelectedCancelledTicket(null);
        }}
        cancelledData={selectedCancelledTicket}
      />

      {/* Email Invoice Modal */}
      {emailModalOpen && selectedTicketForEmail && (
        <EmailDocument
          isOpen={emailModalOpen}
          onClose={closeEmailModal}
          documentType="invoice"
          recordId={selectedTicketForEmail}
          onEmailSent={handleEmailSent}
        />
      )}
    </div>
  );
};

export default FlightTicketsView;
