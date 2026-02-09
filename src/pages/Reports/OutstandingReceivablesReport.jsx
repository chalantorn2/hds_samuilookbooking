import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Download,
  FileText,
  ChevronsUpDown,
  Link as LinkIcon,
  Search,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { generateMultiSegmentRoute } from "../View/FlightTickets/useFlightTicketsData";
import PaymentDetailModal from "./components/PaymentDetailModal";
import * as XLSX from "xlsx";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://samuilookbiz.com/api";

// Helper function to parse routing_detail string to routes array
const parseRoutingDetail = (routingDetail) => {
  if (!routingDetail || routingDetail === "N/A" || routingDetail === "-") {
    return [];
  }

  // Split by " - " (from SQL GROUP_CONCAT)
  const segments = routingDetail.split(" - ");
  const routes = [];

  for (const segment of segments) {
    const parts = segment.split("-");
    if (parts.length >= 2) {
      routes.push({
        origin: parts[0].trim(),
        destination: parts[1].trim(),
      });
    }
  }

  return routes;
};

// Helper function to format routing display
const formatRoutingDisplay = (routingDetail) => {
  const routes = parseRoutingDetail(routingDetail);
  if (routes.length === 0) return "";
  return generateMultiSegmentRoute(routes);
};

// Helper function to format ticket number display (same as Invoice List)
const formatTicketNumberDisplay = (ticketNumber) => {
  if (!ticketNumber || ticketNumber === "-" || ticketNumber === "N/A") {
    return "-";
  }

  // Split by comma if multiple tickets
  const ticketCodes = ticketNumber
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t);

  // ถ้าไม่มี ticket codes
  if (ticketCodes.length === 0) {
    return "-";
  }

  // ถ้ามี ticket code เดียว
  if (ticketCodes.length === 1) {
    return ticketCodes[0];
  }

  // ถ้ามีหลาย ticket codes - สร้าง range format
  const firstCode = ticketCodes[0];
  const lastCode = ticketCodes[ticketCodes.length - 1];

  // เอา 3 หลักสุดท้ายของ code สุดท้าย
  const lastThreeDigits = lastCode.slice(-3);

  return `${firstCode}-${lastThreeDigits}`;
};

// Helper function to truncate pax name to 20 characters
const formatPaxName = (paxName) => {
  if (!paxName || paxName === "-") {
    return "";
  }

  if (paxName.length <= 20) {
    return paxName;
  }

  return paxName.substring(0, 20) + "...";
};

// Helper function to truncate routing to 22 characters
const formatRoutingText = (text) => {
  if (!text || text === "-") {
    return "";
  }

  if (text.length <= 22) {
    return text;
  }

  return text.substring(0, 22) + "...";
};

const OutstandingReceivablesReport = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [sortField, setSortField] = useState("booking_ref_no");
  const [sortDirection, setSortDirection] = useState("desc");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [statusFilter, setStatusFilter] = useState(["unpaid", "partial"]); // Default: รอชำระเงิน และ ชำระบางส่วน
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalAmountSum, setTotalAmountSum] = useState(0);
  const itemsPerPage = 30;

  // State สำหรับ Link Mode
  const [linkMode, setLinkMode] = useState(false);
  const [selectedForLink, setSelectedForLink] = useState([]);
  const [linkLoading, setLinkLoading] = useState(false);

  const fetchReport = async (filters = statusFilter, search = searchTerm, page = currentPage) => {
    setLoading(true);
    try {
      const requestBody = {
        action: "getOutstandingReceivables",
        status_filter: filters, // ส่ง status filter ไป backend
        search_term: search, // ส่ง search term ไป backend
        page: page,
        limit: itemsPerPage,
      };

      const response = await fetch(`${API_BASE_URL}/gateway.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success === true || result.status === "success") {
        // Handle new paginated response format
        const data = result.data;
        if (data.items !== undefined) {
          setReportData(data.items);
          setTotalItems(data.total || 0);
          setTotalPages(data.total_pages || 1);
          setCurrentPage(data.page || 1);
          setTotalAmountSum(data.total_amount_sum || 0);
        } else {
          // Fallback for old format
          setReportData(data);
          setTotalItems(Array.isArray(data) ? data.length : 0);
          setTotalPages(1);
          setTotalAmountSum(0);
        }
      } else {
        console.error("Failed to fetch report:", result);
        alert(
          "Failed to fetch report: " +
            (result.error || result.message || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Error fetching report:", error);
      alert("Error fetching report: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchReport();
  }, []);

  // Refetch when status filter or search term changes - reset to page 1
  useEffect(() => {
    if (reportData !== null) {
      setCurrentPage(1);
      fetchReport(statusFilter, searchTerm, 1);
    }
  }, [statusFilter, searchTerm]);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      fetchReport(statusFilter, searchTerm, newPage);
    }
  };

  // Pagination helper function (same style as FlightTicketsView)
  const paginate = (pageNumber) => handlePageChange(pageNumber);

  // Calculate index for display
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage + 1;
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handleOpenPaymentDetail = (booking) => {
    setSelectedBooking(booking);
    setPaymentModalOpen(true);
  };

  // Navigate to Master PO from linked PO
  const handleNavigateToMaster = async (masterPOInfo) => {
    // ค้นหา Master PO จาก reportData ก่อน
    const masterBooking = reportData?.find(
      (item) =>
        item.booking_id === masterPOInfo.booking_id &&
        item.booking_type === masterPOInfo.booking_type
    );

    if (masterBooking) {
      // ถ้าเจอใน reportData ใช้ข้อมูลเต็ม
      setSelectedBooking(masterBooking);
    } else {
      // ถ้าไม่เจอ fetch ข้อมูลจาก API
      try {
        const response = await fetch(`${API_BASE_URL}/gateway.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "getBookingDetails",
            booking_type: masterPOInfo.booking_type,
            booking_id: masterPOInfo.booking_id,
          }),
        });

        const result = await response.json();
        if (result.success && result.data) {
          setSelectedBooking(result.data);
        } else {
          // Fallback ใช้ข้อมูลที่มีจาก masterPOInfo
          setSelectedBooking({
            booking_id: masterPOInfo.booking_id,
            booking_type: masterPOInfo.booking_type,
            booking_ref_no: masterPOInfo.booking_ref_no,
            total_amount: masterPOInfo.total_amount || masterPOInfo.amount || 0,
            customer_code: masterPOInfo.customer_code || "",
            create_date: masterPOInfo.create_date || new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error("Failed to fetch master booking:", error);
        // Fallback ใช้ข้อมูลที่มีจาก masterPOInfo
        setSelectedBooking({
          booking_id: masterPOInfo.booking_id,
          booking_type: masterPOInfo.booking_type,
          booking_ref_no: masterPOInfo.booking_ref_no,
          total_amount: masterPOInfo.total_amount || masterPOInfo.amount || 0,
          customer_code: masterPOInfo.customer_code || "",
          create_date: masterPOInfo.create_date || new Date().toISOString(),
        });
      }
    }
  };

  // Calculate payment status based on paid amount
  const calculatePaymentStatus = (item) => {
    // Use display_total_amount for grouped POs, otherwise use total_amount
    const totalAmount =
      parseFloat(item.display_total_amount || item.total_amount) || 0;
    const paidAmount = parseFloat(item.paid_amount) || 0;

    if (paidAmount === 0) {
      return {
        status: "unpaid",
        text: "รอชำระเงิน",
        color: "bg-yellow-100 text-yellow-800",
      };
    } else if (paidAmount >= totalAmount) {
      return {
        status: "paid",
        text: "ชำระแล้ว",
        color: "bg-green-100 text-green-800",
      };
    } else {
      return {
        status: "partial",
        text: "ชำระบางส่วน",
        color: "bg-orange-100 text-orange-800",
      };
    }
  };

  // Format payment details for display
  const formatPaymentDetails = (item) => {
    // ถ้ายังไม่มีการชำระเลย แต่มีข้อมูลวิธีการชำระจาก Sale
    if (!item.payment_details || item.payment_details.length === 0) {
      // แสดงวิธีการชำระจาก Sale (ถ้ามี)
      if (item.payment_method_details && item.payment_method_details.method) {
        const method = item.payment_method_details.method.toLowerCase();
        const details = item.payment_method_details.details || "";

        if (method === "banktransfer" || method === "transfer") {
          return details ? `${details}:` : "โอนเงิน:";
        } else if (method === "creditcard" || method === "credit_card") {
          return details ? `${details}:` : "บัตรเครดิต:";
        } else if (method === "cash") {
          return "เงินสด:";
        }
      }
      return ""; // ไม่มีข้อมูลเลย
    }

    // มีการชำระแล้ว - รวมยอดเดียวกัน
    const paymentGroups = {};

    item.payment_details
      .filter((payment) => {
        return (
          payment.payment_date ||
          payment.amount ||
          payment.bank_name ||
          payment.card_type
        );
      })
      .forEach((payment) => {
        let key = "";

        // เงินสด - แสดงวันที่ด้วย
        if (payment.payment_method === "cash") {
          if (payment.payment_date) {
            const date = new Date(payment.payment_date);
            const dateStr = format(date, "ddMMMyy").toUpperCase();
            key = `เงินสด ${dateStr}`;
          } else {
            key = "เงินสด";
          }
        }
        // โอนเงิน - แสดงชื่อธนาคาร + วันที่
        else if (payment.payment_method === "transfer") {
          const label = payment.bank_name || "โอนเงิน";
          if (payment.payment_date) {
            const date = new Date(payment.payment_date);
            const dateStr = format(date, "ddMMMyy").toUpperCase();
            key = `${label} ${dateStr}`;
          } else {
            key = label;
          }
        }
        // เครดิตการ์ด - แสดงชนิดบัตร + วันที่
        else if (payment.payment_method === "credit_card") {
          const label = payment.card_type || "บัตรเครดิต";
          if (payment.payment_date) {
            const date = new Date(payment.payment_date);
            const dateStr = format(date, "ddMMMyy").toUpperCase();
            key = `${label} ${dateStr}`;
          } else {
            key = label;
          }
        }

        if (key) {
          // รวมยอดเดียวกัน
          if (!paymentGroups[key]) {
            paymentGroups[key] = 0;
          }
          const amount = parseFloat(payment.amount) || 0;
          paymentGroups[key] += amount;
        }
      });

    // แปลงเป็น array และ format
    const details = Object.entries(paymentGroups).map(([label, total]) => {
      return total > 0 ? `${label}: ${formatCurrency(total)}` : `${label}:`;
    });

    return details.join(", ");
  };

  const handleSavePaymentDetail = async (paymentData) => {
    try {
      console.log("📤 Sending payment data:", paymentData);

      const response = await fetch(`${API_BASE_URL}/gateway.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "savePaymentDetails",
          booking_type: paymentData.booking_type,
          booking_id: paymentData.booking_id,
          payments: paymentData.payments,
        }),
      });

      const result = await response.json();
      console.log("📥 Backend response:", result);

      if (result.success === true || result.status === "success") {
        // Refresh the report to get updated payment status (stay on current page)
        fetchReport(statusFilter, searchTerm, currentPage);
        setPaymentModalOpen(false);
      } else {
        throw new Error(
          result.message || result.error || "Failed to save payment details"
        );
      }
    } catch (error) {
      console.error("Error saving payment detail:", error);
      throw error;
    }
  };

  // Sorting function
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handle status filter toggle
  const handleStatusFilterToggle = (status) => {
    setStatusFilter((prev) => {
      if (prev.includes(status)) {
        return prev.filter((s) => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };

  // Toggle Link Mode
  const handleToggleLinkMode = () => {
    if (linkMode) {
      // Exit link mode
      setLinkMode(false);
      setSelectedForLink([]);
    } else {
      // Enter link mode
      setLinkMode(true);
      setSelectedForLink([]);
    }
  };

  // Toggle item selection for link
  const handleToggleSelection = (item) => {
    if (!linkMode) return;

    const itemKey = `${item.booking_type}-${item.booking_id}`;
    const isSelected = selectedForLink.some(
      (s) => `${s.booking_type}-${s.booking_id}` === itemKey
    );

    if (isSelected) {
      setSelectedForLink(
        selectedForLink.filter(
          (s) => `${s.booking_type}-${s.booking_id}` !== itemKey
        )
      );
    } else {
      setSelectedForLink([...selectedForLink, item]);
    }
  };

  // Check if item is selected
  const isItemSelected = (item) => {
    const itemKey = `${item.booking_type}-${item.booking_id}`;
    return selectedForLink.some(
      (s) => `${s.booking_type}-${s.booking_id}` === itemKey
    );
  };

  // Handle Link POs - เลือก Master อัตโนมัติ (เลขล่าสุด)
  const handleLinkSelectedPOs = async () => {
    if (selectedForLink.length < 2) {
      alert("กรุณาเลือกอย่างน้อย 2 รายการเพื่อ Link");
      return;
    }

    setLinkLoading(true);
    try {
      // เรียงตาม booking_ref_no แล้วเลือกตัวล่าสุดเป็น Master
      const sortedSelection = [...selectedForLink].sort((a, b) => {
        const refA = a.booking_ref_no || "";
        const refB = b.booking_ref_no || "";
        return refB.localeCompare(refA); // descending - ล่าสุดอยู่บน
      });

      const masterItem = sortedSelection[0]; // เลขล่าสุดเป็น Master
      const linkedItems = sortedSelection.slice(1); // ที่เหลือเป็น linked

      const response = await fetch(`${API_BASE_URL}/gateway.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "linkPOs",
          master_booking_type: masterItem.booking_type,
          master_booking_id: masterItem.booking_id,
          linked_pos: linkedItems.map((item) => ({
            booking_type: item.booking_type,
            booking_id: item.booking_id,
          })),
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert(
          `Link สำเร็จ!\nMaster: ${masterItem.booking_ref_no}\nGroup ID: ${result.data.group_id}`
        );
        setLinkMode(false);
        setSelectedForLink([]);
        fetchReport(statusFilter, searchTerm, currentPage); // Refresh data (stay on current page)
      } else {
        alert("เกิดข้อผิดพลาด: " + (result.error || "ไม่สามารถ Link ได้"));
      }
    } catch (error) {
      console.error("Failed to link POs:", error);
      alert("เกิดข้อผิดพลาดในการ Link");
    } finally {
      setLinkLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return "0";
    return Math.floor(parseFloat(amount)).toLocaleString("th-TH");
  };

  // Sort data (filtering is done by backend)
  const sortedData = reportData
    ? [...reportData].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        // Handle numeric fields
        if (sortField === "total_amount" || sortField === "pax_count") {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        }

        // Handle date fields
        if (sortField === "create_date") {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        // Handle string fields
        if (typeof aValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (sortDirection === "asc") {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      })
    : [];

  const handleExportExcel = async () => {
    if (!reportData) return;

    setLoading(true);
    try {
      // Fetch ALL data for export (with export=true flag to bypass pagination)
      const requestBody = {
        action: "getOutstandingReceivables",
        status_filter: statusFilter,
        search_term: searchTerm,
        export: true, // This tells backend to return all records
        limit: 0, // No limit
      };

      const response = await fetch(`${API_BASE_URL}/gateway.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!(result.success === true || result.status === "success")) {
        throw new Error(result.error || result.message || "Failed to fetch data for export");
      }

      // Get items from response
      const allData = result.data?.items || result.data || [];

      const exportData = [];

      // Add header
      exportData.push(["OUTSTANDING RECEIVABLES REPORT"]);
      exportData.push([`Export Date: ${format(new Date(), "dd/MM/yyyy")}`]);
      exportData.push([]); // Empty row

      // Add table header
      exportData.push([
        "Date",
        "PO Number",
        "Customer Code",
        "Supplier Code",
        "PAX",
        "Pax's Name",
        "Routing",
        "Code",
        "Amount",
        "Status",
        "Payment Detail",
      ]);

      // Add data rows
      allData.forEach((item) => {
        const statusInfo = calculatePaymentStatus(item);
        const paymentDetails = formatPaymentDetails(item);

        exportData.push([
          format(new Date(item.create_date), "dd/MM/yyyy"),
          item.booking_ref_no || "-",
          item.customer_code || "",
          item.supplier_code || "",
          item.pax_count || "",
          formatPaxName(item.pax_name),
          formatRoutingText(
            item.booking_type === "Flight"
              ? (formatRoutingDisplay(item.routing_detail) || item.routing_detail || "")
              : (item.description || "")
          ),
          item.booking_type === "Other-TRAIN"
            ? (item.ref || "")
            : (item.code || ""),
          Number(item.total_amount || 0).toFixed(2),
          statusInfo.text,
          paymentDetails || "-",
        ]);
      });

      // Calculate totals
      const totalAmount = allData.reduce(
        (sum, item) => sum + (parseFloat(item.total_amount) || 0),
        0
      );

      exportData.push([]); // Empty row
      exportData.push([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Total:",
        totalAmount.toFixed(2),
        "",
      ]);

      const ws = XLSX.utils.aoa_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Outstanding Receivables");

      // Set column widths
      ws["!cols"] = [
        { wch: 12 }, // Date
        { wch: 16 }, // PO Number
        { wch: 12 }, // Customer
        { wch: 12 }, // Supplier
        { wch: 6 }, // PAX
        { wch: 20 }, // Pax's Name
        { wch: 25 }, // Routing
        { wch: 10 }, // Code
        { wch: 12 }, // Amount
        { wch: 12 }, // Status
        { wch: 25 }, // Payment Detail
      ];

      XLSX.writeFile(
        wb,
        `Outstanding_Receivables_${format(new Date(), "yyyyMMdd")}.xlsx`
      );
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Error exporting to Excel: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-full mx-auto">
        <div className="bg-white rounded-lg shadow-md">
          {/* Header */}
          <div className="bg-white rounded-t-lg shadow-sm p-4 mb-2">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  REPORT ลูกหนี้คงค้าง
                </h1>
                <p className="text-base text-gray-500">
                  รายงานลูกหนี้คงค้างตามช่วงวันที่
                </p>
              </div>
              {reportData && (
                <div className="mt-2 md:mt-0 flex items-center gap-3">
                  {/* Sub Total - แสดงเมื่ออยู่ใน Link Mode */}
                  {linkMode && selectedForLink.length > 0 && (
                    <div className="flex items-center gap-2 border-2 border-blue-600 bg-blue-50 rounded-md px-4 py-2">
                      <span className="text-sm font-medium text-gray-700">
                        Sub Total:
                      </span>
                      <span className="text-lg font-bold text-blue-700">
                        {formatCurrency(
                          selectedForLink.reduce(
                            (sum, item) =>
                              sum + (parseFloat(item.total_amount) || 0),
                            0
                          )
                        )}{" "}
                        THB
                      </span>
                    </div>
                  )}

                  {/* Total Amount */}
                  <div className="flex items-center gap-2 border-2 border-red-600 bg-red-50 rounded-md px-4 py-2">
                    <span className="text-sm font-medium text-gray-700">
                      Total Amount:
                    </span>
                    <span className="text-lg font-bold text-red-700">
                      {formatCurrency(totalAmountSum)} THB
                    </span>
                  </div>

                  {/* Export Button */}
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    <Download size={18} />
                    Export Excel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Search Bar */}
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Search PO Number, CUST, SUP, Pax's Name, Ticket Number, Code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Link Mode Buttons + Status Filter */}
              <div className="flex items-center gap-3">
                {/* Link PO Button / Link Mode Controls */}
                {!linkMode ? (
                  <button
                    onClick={handleToggleLinkMode}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                  >
                    <LinkIcon size={16} />
                    Link PO
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-blue-600 font-medium">
                      เลือก {selectedForLink.length} รายการ
                    </span>
                    <button
                      onClick={handleLinkSelectedPOs}
                      disabled={linkLoading || selectedForLink.length < 2}
                      className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 text-white hover:bg-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check size={16} />
                      {linkLoading ? "กำลัง Link..." : "Link"}
                    </button>
                    <button
                      onClick={handleToggleLinkMode}
                      disabled={linkLoading}
                      className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-500 text-white hover:bg-gray-600 rounded-md transition-colors"
                    >
                      <X size={16} />
                      ยกเลิก
                    </button>
                  </div>
                )}

                {/* Status Filter */}
                <div className="flex items-center gap-3 border border-gray-300 rounded-md px-4 py-2 bg-white">
                  <span className="text-sm font-medium text-gray-700">
                    สถานะ:
                  </span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={statusFilter.includes("unpaid")}
                      onChange={() => handleStatusFilterToggle("unpaid")}
                      className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                    />
                    <span className="text-sm text-gray-700">รอชำระเงิน</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={statusFilter.includes("partial")}
                      onChange={() => handleStatusFilterToggle("partial")}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700">ชำระบางส่วน</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={statusFilter.includes("paid")}
                      onChange={() => handleStatusFilterToggle("paid")}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">ชำระแล้ว</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Report Content */}
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading report...</p>
            </div>
          ) : reportData && sortedData.length > 0 ? (
            <div className="p-4">
              {/* Table */}
              <div className="overflow-x-auto border border-gray-300 rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr className="text-center text-nowrap">
                      {/* Checkbox column - แสดงเมื่อ Link Mode */}
                      {linkMode && (
                        <th
                          scope="col"
                          className="px-2 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-10"
                        >
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={
                                sortedData.length > 0 &&
                                selectedForLink.length === sortedData.length
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedForLink([...sortedData]);
                                } else {
                                  setSelectedForLink([]);
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              title="เลือกทั้งหมด"
                            />
                          </div>
                        </th>
                      )}
                      <th
                        scope="col"
                        className="px-2 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("create_date")}
                      >
                        <div className="flex items-center justify-center">
                          Date
                          <ChevronsUpDown size={16} className="ml-1" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("booking_ref_no")}
                      >
                        <div className="flex items-center justify-center">
                          PO Number
                          <ChevronsUpDown size={16} className="ml-1" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("customer_code")}
                      >
                        <div className="flex items-center justify-center">
                          CUST
                          <ChevronsUpDown size={16} className="ml-1" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("supplier_code")}
                      >
                        <div className="flex items-center justify-center">
                          SUP
                          <ChevronsUpDown size={16} className="ml-1" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("pax_count")}
                      >
                        <div className="flex items-center justify-center">
                          PAX
                          <ChevronsUpDown size={16} className="ml-1" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider"
                      >
                        Pax's Name
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider"
                      >
                        Routing
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider"
                      >
                        Code
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
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
                        className="px-2 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider"
                      >
                        Payment Detail
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedData.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-gray-50 transition-colors ${
                          linkMode ? "cursor-pointer" : ""
                        } ${
                          linkMode && isItemSelected(item)
                            ? "bg-blue-50 hover:bg-blue-100"
                            : ""
                        }`}
                        onClick={() => linkMode && handleToggleSelection(item)}
                      >
                        {/* Checkbox column - แสดงเมื่อ Link Mode */}
                        {linkMode && (
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={isItemSelected(item)}
                              onChange={() => handleToggleSelection(item)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </td>
                        )}
                        <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap text-center">
                          {format(new Date(item.create_date), "dd/MM/yy")}
                        </td>
                        <td className="px-2 py-2 text-sm text-blue-600 whitespace-nowrap text-center font-medium">
                          {item.booking_ref_no || "-"}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap text-center">
                          {item.customer_code || ""}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap text-center">
                          {item.supplier_code || ""}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap text-center font-medium">
                          {item.pax_count || ""}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap text-left">
                          {formatPaxName(item.pax_name)}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap">
                          {formatRoutingText(
                            item.booking_type === "Flight"
                              ? (formatRoutingDisplay(item.routing_detail) || item.routing_detail || "")
                              : (item.description || "")
                          )}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap text-left">
                          {item.booking_type === "Other-TRAIN"
                            ? (item.ref || "")
                            : (item.code || "")}
                        </td>
                        <td
                          className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap text-right"
                          style={{ paddingRight: "2rem" }}
                        >
                          {formatCurrency(item.total_amount)}
                        </td>
                        <td className="px-2 py-2 text-sm text-center whitespace-nowrap">
                          {(() => {
                            const statusInfo = calculatePaymentStatus(item);
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPaymentDetail(item);
                                }}
                                className={`px-2 py-1 rounded text-xs font-semibold ${statusInfo.color} hover:opacity-80 transition-opacity cursor-pointer`}
                                title="คลิกเพื่อกรอกรายละเอียดการชำระ"
                              >
                                {statusInfo.text}
                              </button>
                            );
                          })()}
                        </td>
                        <td
                          className={`px-2 py-2 text-sm text-left ${
                            calculatePaymentStatus(item).status === "paid"
                              ? "text-green-700 font-medium"
                              : "text-gray-700"
                          }`}
                        >
                          {formatPaymentDetails(item)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination - same style as FlightTicketsView */}
              {totalItems > 0 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
                  {/* Mobile view */}
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
                  {/* Desktop view */}
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        แสดง{" "}
                        <span className="font-medium">
                          {indexOfFirstItem} ถึง {indexOfLastItem}
                        </span>{" "}
                        จากทั้งหมด{" "}
                        <span className="font-medium">{totalItems}</span>{" "}
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

              {/* Footer */}
              <div className="mt-6 text-right text-sm text-gray-500">
                <p>Samui Look Co., Ltd</p>
                <p>Issued Date: {format(new Date(), "dd/MM/yyyy")}</p>
              </div>
            </div>
          ) : reportData && sortedData.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FileText size={48} className="mx-auto mb-4 text-gray-400" />
              <p>No outstanding receivables found</p>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <FileText size={48} className="mx-auto mb-4 text-gray-400" />
              <p>Loading data...</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Detail Modal */}
      <PaymentDetailModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        booking={selectedBooking}
        onSave={handleSavePaymentDetail}
        onRefresh={fetchReport}
        onNavigateToMaster={handleNavigateToMaster}
      />
    </div>
  );
};

export default OutstandingReceivablesReport;
