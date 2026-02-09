import React, { useState } from "react";
import { format } from "date-fns";
import { Download, FileText, Calendar, User, Truck } from "lucide-react";
import AutocompleteInput from "./components/AutocompleteInput";
import CustomerFilterTable from "./components/CustomerFilterTable";
import SupplierFilterTable from "./components/SupplierFilterTable";
import TicketTypeFilterTable from "./components/TicketTypeFilterTable";
import { generateMultiSegmentRoute } from "../View/FlightTickets/useFlightTicketsData";
import { getCustomers } from "../../services/customerService";
import { getSuppliers } from "../../services/supplierService";
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

// Helper function to get routing or description based on booking type
const getRoutingOrDescription = (booking) => {
  const bookingType = booking.booking_type || "";

  // Flight แสดง routing, fallback เป็น raw routing_detail (tickets_extras description)
  if (bookingType === "Flight") {
    return (
      formatRoutingDisplay(booking.routing_detail) ||
      booking.routing_detail ||
      ""
    );
  }

  // Voucher และ Other ทุกประเภท แสดง description
  return booking.routing_detail || "";
};

// Helper function to sort bookings: PO first, then others, sorted by ref number (oldest first)
const sortBookings = (bookings) => {
  return [...bookings].sort((a, b) => {
    // 1. PO (Flight) มาก่อน
    const aIsFlight = a.booking_type === "Flight" ? 0 : 1;
    const bIsFlight = b.booking_type === "Flight" ? 0 : 1;

    if (aIsFlight !== bIsFlight) {
      return aIsFlight - bIsFlight;
    }

    // 2. เรียงตาม booking_ref_no จากน้อยไปมาก (เก่าไปใหม่)
    const refA = a.booking_ref_no || "";
    const refB = b.booking_ref_no || "";
    return refA.localeCompare(refB);
  });
};

const TICKET_TYPES = [
  { value: "BSP", label: "BSP" },
  { value: "AIRLINE WEB", label: "AIRLINE WEB" },
  { value: "TG", label: "TG" },
  { value: "B2B", label: "B2B" },
  { value: "OTHER", label: "OTHER" },
];

const AllInvoiceReport = () => {
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterType, setFilterType] = useState("all"); // 'all', 'customer', 'supplier', 'ticket_type'
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedTicketType, setSelectedTicketType] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [sortOrder, setSortOrder] = useState("desc"); // 'desc' = ล่าสุดก่อน, 'asc' = เก่าก่อน

  const searchCustomers = async (term) => {
    try {
      const results = await getCustomers(term, 10);
      return results || [];
    } catch (error) {
      console.error("Error searching customers:", error);
      return [];
    }
  };

  const searchSuppliers = async (term) => {
    try {
      const results = await getSuppliers("all", term, 10);
      return results || [];
    } catch (error) {
      console.error("Error searching suppliers:", error);
      return [];
    }
  };

  const fetchReport = async () => {
    // Validate filter requirements (only for ticket_type)
    // supplier ไม่บังคับเลือก - ถ้าไม่เลือกจะแสดงทั้งหมดแยกกลุ่มตาม supplier
    if (filterType === "ticket_type" && !selectedTicketType) {
      alert("Please select a ticket type");
      return;
    }

    setLoading(true);
    try {
      const requestBody = {
        action: "getAllInvoiceReportNew",
        start_date: startDate,
        end_date: endDate,
        document_types: ["PO", "VC", "HTL", "TRN", "VSA", "OTH"], // แสดง PO, VC, HTL, TRN, VSA, OTH (ไม่รวม Deposit, FT, BS, BT, TR)
        filter_type: filterType,
      };

      // Add filter parameters based on filter type
      if (filterType === "customer" && selectedCustomer) {
        requestBody.customer_code = selectedCustomer;
      } else if (filterType === "supplier" && selectedSupplier) {
        requestBody.supplier_code = selectedSupplier;
      } else if (filterType === "ticket_type") {
        requestBody.ticket_type = selectedTicketType;
      }

      const response = await fetch(`${API_BASE_URL}/gateway.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success === true || result.status === "success") {
        setReportData(result.data);
      } else {
        console.error("Failed to fetch report:", result.message);
        alert("Failed to fetch report: " + result.message);
      }
    } catch (error) {
      console.error("Error fetching report:", error);
      alert("Error fetching report");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchReport();
  };

  // Render appropriate table component based on filter type
  const renderReportTable = () => {
    if (!reportData) return null;

    const commonProps = {
      reportData,
      startDate,
      endDate,
      getRoutingOrDescription,
    };

    // For filter types that use separate components
    if (filterType === "customer") {
      return (
        <CustomerFilterTable
          {...commonProps}
          selectedCustomer={selectedCustomer}
        />
      );
    } else if (filterType === "supplier") {
      return (
        <SupplierFilterTable
          {...commonProps}
          selectedSupplier={selectedSupplier}
        />
      );
    } else if (filterType === "ticket_type") {
      return (
        <TicketTypeFilterTable
          {...commonProps}
          selectedTicketType={selectedTicketType}
        />
      );
    }

    // For "all" filter type, render the original table (below)
    return null;
  };

  const handleExportExcel = () => {
    if (!reportData || !reportData.daily_summary) return;

    const exportData = [];

    // Add header
    exportData.push(["REPORT ALL INVOICE"]);
    exportData.push([
      `Date Range: ${format(new Date(startDate), "dd/MM/yyyy")} - ${format(
        new Date(endDate),
        "dd/MM/yyyy",
      )}`,
    ]);
    exportData.push([]); // Empty row

    // Sort daily summary according to sortOrder
    const sortedDailySummary = [...reportData.daily_summary].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    // Process each day
    sortedDailySummary.forEach((day) => {
      exportData.push([`Date: ${format(new Date(day.date), "dd/MM/yyyy")}`]);
      exportData.push([
        "Date",
        "Inv/PO Number",
        "Customer Code",
        "Supplier Code",
        "TYPE",
        "Routing",
        "Pax",
        "Ticket Cost",
        "Ticket Sale",
        "Option Cost",
        "Option Sale",
        "Total Cost",
        "Total Sale",
        "Profit",
      ]);

      sortBookings(day.bookings).forEach((booking) => {
        exportData.push([
          format(new Date(booking.create_date), "dd/MM/yyyy"),
          booking.booking_ref_no,
          booking.customer_code,
          booking.supplier_code,
          booking.ticket_type || "",
          getRoutingOrDescription(booking),
          booking.pax_count,
          Number(booking.ticket_cost || 0).toFixed(2),
          Number(booking.ticket_sale || 0).toFixed(2),
          Number(booking.option_cost || 0).toFixed(2),
          Number(booking.option_sale || 0).toFixed(2),
          Number(booking.total_cost || 0).toFixed(2),
          Number(booking.total_sale || 0).toFixed(2),
          Number(booking.profit || 0).toFixed(2),
        ]);
      });

      // Sub Total
      exportData.push([
        "",
        "",
        "",
        "",
        "",
        "Sub Total",
        day.sub_total.of_ticket,
        Number(day.sub_total.ticket_cost || 0).toFixed(2),
        Number(day.sub_total.ticket_sale || 0).toFixed(2),
        Number(day.sub_total.option_cost || 0).toFixed(2),
        Number(day.sub_total.option_sale || 0).toFixed(2),
        Number(day.sub_total.total_cost || 0).toFixed(2),
        Number(day.sub_total.total_sale || 0).toFixed(2),
        Number(day.sub_total.profit || 0).toFixed(2),
      ]);
      exportData.push([]); // Empty row
    });

    // Grand Total
    exportData.push([
      "",
      "",
      "",
      "",
      "",
      "Grand Total",
      reportData.grand_total.of_ticket,
      Number(reportData.grand_total.ticket_cost || 0).toFixed(2),
      Number(reportData.grand_total.ticket_sale || 0).toFixed(2),
      Number(reportData.grand_total.option_cost || 0).toFixed(2),
      Number(reportData.grand_total.option_sale || 0).toFixed(2),
      Number(reportData.grand_total.total_cost || 0).toFixed(2),
      Number(reportData.grand_total.total_sale || 0).toFixed(2),
      Number(reportData.grand_total.profit || 0).toFixed(2),
    ]);

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "All Invoice Report");

    // Set column widths
    ws["!cols"] = [
      { wch: 12 }, // Date
      { wch: 16 }, // Inv/PO
      { wch: 12 }, // Customer
      { wch: 12 }, // Supplier
      { wch: 10 }, // TYPE
      { wch: 25 }, // Routing
      { wch: 10 }, // Pax
      { wch: 12 }, // Ticket Cost
      { wch: 12 }, // Ticket Sale
      { wch: 12 }, // Option Cost
      { wch: 12 }, // Option Sale
      { wch: 12 }, // Total Cost
      { wch: 12 }, // Total Sale
      { wch: 12 }, // Profit
    ];

    XLSX.writeFile(wb, `All_Invoice_Report_${startDate}_${endDate}.xlsx`);
  };

  // Apply sort order to daily summary
  const filteredDailySummary = reportData?.daily_summary
    ? [...reportData.daily_summary].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      })
    : null;

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-full mx-auto">
        <div className="bg-white rounded-lg shadow-md">
          {/* Header */}
          <div className="bg-white rounded-t-lg shadow-sm p-4 mb-2">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h1 className="text-xl font-bold text-gray-800">ALL REPORT</h1>
                <p className="text-sm text-gray-500">
                  รายงานทั้งหมดตามช่วงวันที่
                </p>
              </div>
              {reportData && (
                <button
                  onClick={handleExportExcel}
                  className="mt-2 md:mt-0 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <Download size={18} />
                  Export Excel
                </button>
              )}
            </div>
          </div>

          {/* Filters in one row */}
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              {/* Date Range */}
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-gray-500 flex-shrink-0" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filter Type Dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Filter By:
                </label>
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    // Reset selections when changing filter type
                    setSelectedCustomer("");
                    setSelectedSupplier("");
                    setSelectedTicketType("");
                  }}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">All Invoice</option>
                  <option value="customer">by Customer</option>
                  <option value="supplier">by Supplier</option>
                  <option value="ticket_type">by Ticket Type</option>
                </select>
              </div>

              {/* Customer Search Bar */}
              {filterType === "customer" && (
                <div className="flex items-center gap-2 w-auto">
                  <div className="w-64">
                    <AutocompleteInput
                      value={selectedCustomer}
                      onChange={setSelectedCustomer}
                      onSelect={(customer) => {
                        if (customer) {
                          setSelectedCustomer(customer.code);
                        }
                      }}
                      placeholder="Search customer code or name"
                      onSearch={searchCustomers}
                      displayField="name"
                      valueField="code"
                      secondaryField="code"
                      icon={User}
                    />
                  </div>
                </div>
              )}

              {/* Supplier Search Bar */}
              {filterType === "supplier" && (
                <div className="flex items-center gap-2 w-auto">
                  <div className="w-64">
                    <AutocompleteInput
                      value={selectedSupplier}
                      onChange={setSelectedSupplier}
                      onSelect={(supplier) => {
                        if (supplier) {
                          setSelectedSupplier(supplier.code);
                        }
                      }}
                      placeholder="Search supplier code or name"
                      onSearch={searchSuppliers}
                      displayField="name"
                      valueField="code"
                      secondaryField="code"
                      icon={Truck}
                    />
                  </div>
                </div>
              )}

              {/* Ticket Type Dropdown */}
              {filterType === "ticket_type" && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTicketType}
                    onChange={(e) => setSelectedTicketType(e.target.value)}
                    className="w-48 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">-- Select Type --</option>
                    {TICKET_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sort Order Dropdown - Only show for "all" filter */}
              {filterType === "all" && (
                <div className="flex items-center gap-2">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="desc">วันที่ล่าสุดก่อน</option>
                    <option value="asc">วันที่เก่าก่อน</option>
                  </select>
                </div>
              )}

              {/* Generate Report Button */}
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {loading ? "Loading..." : "Generate Report"}
              </button>
            </div>
          </div>

          {/* Report Content */}
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading report...</p>
            </div>
          ) : reportData ? (
            filterType !== "all" ? (
              renderReportTable()
            ) : filteredDailySummary ? (
              <div className="p-4">
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center gap-2 text-blue-800">
                    <FileText size={20} />
                    <span className="font-semibold">
                      Date Range: {format(new Date(startDate), "dd/MM/yyyy")} -{" "}
                      {format(new Date(endDate), "dd/MM/yyyy")}
                    </span>
                  </div>
                </div>

                {filteredDailySummary.map((day, dayIndex) => (
                  <div key={dayIndex} className="mb-8">
                    {/* Daily Header */}
                    <div className="bg-blue-800 text-white px-4 py-2 rounded-t-md">
                      <h3 className="font-semibold">
                        Date: {format(new Date(day.date), "dd/MM/yyyy")}
                      </h3>
                    </div>

                    {/* Daily Table - Wide table with horizontal scroll */}
                    <div className="overflow-x-auto border border-gray-300 rounded-b-md">
                      <table className="min-w-full divide-y divide-gray-200 table-fixed">
                        <colgroup>
                          <col style={{ width: "50px" }} />
                          <col style={{ width: "90px" }} />
                          <col style={{ width: "140px" }} />
                          <col style={{ width: "80px" }} />
                          <col style={{ width: "80px" }} />
                          <col style={{ width: "70px" }} />
                          <col style={{ width: "200px" }} />
                          <col style={{ width: "60px" }} />
                          <col style={{ width: "110px" }} />
                          <col style={{ width: "110px" }} />
                          <col style={{ width: "110px" }} />
                          <col style={{ width: "110px" }} />
                          <col style={{ width: "110px" }} />
                          <col style={{ width: "110px" }} />
                          <col style={{ width: "110px" }} />
                        </colgroup>
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                              No.
                            </th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                              Date
                            </th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                              Ref No.
                            </th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                              CUST
                            </th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                              SUP
                            </th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                              TYPE
                            </th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                              Routing
                            </th>
                            <th className="px-2 py-3 text-center text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                              Pax
                            </th>
                            <th className="px-2 py-3 text-right text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                              TKT Cost
                            </th>
                            <th className="px-2 py-3 text-right text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                              TKT Sale
                            </th>
                            <th className="px-2 py-3 text-right text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                              OPT Cost
                            </th>
                            <th className="px-2 py-3 text-right text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                              OPT Sale
                            </th>
                            <th className="px-2 py-3 text-right text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                              Total Cost
                            </th>
                            <th className="px-2 py-3 text-right text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                              Total Sale
                            </th>
                            <th className="px-2 py-3 text-right text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                              Profit
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {sortBookings(day.bookings).map((booking, idx) => (
                            <tr
                              key={idx}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap">
                                {idx + 1}
                              </td>
                              <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap">
                                {format(
                                  new Date(booking.create_date),
                                  "dd/MM/yy",
                                )}
                              </td>
                              <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap">
                                {booking.booking_ref_no}
                              </td>
                              <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap">
                                {booking.customer_code}
                              </td>
                              <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap">
                                {booking.supplier_code}
                              </td>
                              <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap">
                                {booking.ticket_type || ""}
                              </td>
                              <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap">
                                {getRoutingOrDescription(booking)}
                              </td>
                              <td className="px-2 py-2 text-sm text-gray-700 text-center whitespace-nowrap">
                                {booking.pax_count}
                              </td>
                              <td className="px-2 py-2 text-sm text-gray-700 text-right whitespace-nowrap">
                                {Number(
                                  booking.ticket_cost || 0,
                                ).toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="px-2 py-2 text-sm text-gray-700 text-right whitespace-nowrap">
                                {Number(
                                  booking.ticket_sale || 0,
                                ).toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="px-2 py-2 text-sm text-gray-700 text-right whitespace-nowrap">
                                {Number(
                                  booking.option_cost || 0,
                                ).toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="px-2 py-2 text-sm text-gray-700 text-right whitespace-nowrap">
                                {Number(
                                  booking.option_sale || 0,
                                ).toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="px-2 py-2 text-sm text-gray-700 text-right whitespace-nowrap">
                                {Number(booking.total_cost || 0).toLocaleString(
                                  "en-US",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}
                              </td>
                              <td className="px-2 py-2 text-sm text-gray-700 text-right whitespace-nowrap">
                                {Number(booking.total_sale || 0).toLocaleString(
                                  "en-US",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}
                              </td>
                              <td className="px-2 py-2 text-sm text-gray-700 text-right whitespace-nowrap">
                                {Number(booking.profit || 0).toLocaleString(
                                  "en-US",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-yellow-50 border-t-2 border-yellow-400">
                          <tr>
                            <td
                              colSpan="7"
                              className="px-2 py-2 text-sm font-bold text-gray-700 text-right whitespace-nowrap"
                            >
                              Sub Total:
                            </td>
                            <td className="px-2 py-2 text-sm font-bold text-gray-700 text-center whitespace-nowrap">
                              {day.sub_total.of_ticket}
                            </td>
                            <td className="px-2 py-2 text-sm font-bold text-gray-700 text-right whitespace-nowrap">
                              {Number(
                                day.sub_total.ticket_cost || 0,
                              ).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-2 py-2 text-sm font-bold text-gray-700 text-right whitespace-nowrap">
                              {Number(
                                day.sub_total.ticket_sale || 0,
                              ).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-2 py-2 text-sm font-bold text-gray-700 text-right whitespace-nowrap">
                              {Number(
                                day.sub_total.option_cost || 0,
                              ).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-2 py-2 text-sm font-bold text-gray-700 text-right whitespace-nowrap">
                              {Number(
                                day.sub_total.option_sale || 0,
                              ).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-2 py-2 text-sm font-bold text-gray-700 text-right whitespace-nowrap">
                              {Number(
                                day.sub_total.total_cost || 0,
                              ).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-2 py-2 text-sm font-bold text-gray-700 text-right whitespace-nowrap">
                              {Number(
                                day.sub_total.total_sale || 0,
                              ).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-2 py-2 text-sm font-bold text-gray-700 text-right whitespace-nowrap">
                              {Number(day.sub_total.profit || 0).toLocaleString(
                                "en-US",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ))}

                {/* Grand Total */}
                <div className="mt-6 bg-white border-2 border-gray-300 rounded-lg p-4">
                  <h3 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-300">
                    Grand Total
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {/* Total PAX */}
                    <div className="flex-1 min-w-[120px] border border-gray-200 rounded p-3">
                      <div className="text-xs text-gray-500 mb-1">
                        Total PAX
                      </div>
                      <div className="text-lg font-bold text-gray-800">
                        {reportData.grand_total.of_ticket}
                      </div>
                    </div>

                    {/* Ticket Cost */}
                    <div className="flex-1 min-w-[120px] border border-gray-200 rounded p-3">
                      <div className="text-xs text-gray-500 mb-1">
                        Ticket Cost
                      </div>
                      <div className="text-base font-bold text-gray-800">
                        {Number(
                          reportData.grand_total.ticket_cost || 0,
                        ).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>

                    {/* Ticket Sale */}
                    <div className="flex-1 min-w-[120px] border border-gray-200 rounded p-3">
                      <div className="text-xs text-gray-500 mb-1">
                        Ticket Sale
                      </div>
                      <div className="text-base font-bold text-gray-800">
                        {Number(
                          reportData.grand_total.ticket_sale || 0,
                        ).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>

                    {/* Option Cost */}
                    <div className="flex-1 min-w-[120px] border border-gray-200 rounded p-3">
                      <div className="text-xs text-gray-500 mb-1">
                        Option Cost
                      </div>
                      <div className="text-base font-bold text-gray-800">
                        {Number(
                          reportData.grand_total.option_cost || 0,
                        ).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>

                    {/* Option Sale */}
                    <div className="flex-1 min-w-[120px] border border-gray-200 rounded p-3">
                      <div className="text-xs text-gray-500 mb-1">
                        Option Sale
                      </div>
                      <div className="text-base font-bold text-gray-800">
                        {Number(
                          reportData.grand_total.option_sale || 0,
                        ).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>

                    {/* Total Cost */}
                    <div className="flex-1 min-w-[120px] border border-gray-200 rounded p-3">
                      <div className="text-xs text-gray-500 mb-1">
                        Total Cost
                      </div>
                      <div className="text-base font-bold text-gray-800">
                        {Number(
                          reportData.grand_total.total_cost || 0,
                        ).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>

                    {/* Total Sale */}
                    <div className="flex-1 min-w-[120px] border border-gray-200 rounded p-3">
                      <div className="text-xs text-gray-500 mb-1">
                        Total Sale
                      </div>
                      <div className="text-base font-bold text-gray-800">
                        {Number(
                          reportData.grand_total.total_sale || 0,
                        ).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>

                    {/* Profit */}
                    <div className="flex-1 min-w-[120px] border-2 border-green-600 bg-green-50 rounded p-3">
                      <div className="text-xs text-gray-600 mb-1">Profit</div>
                      <div className="text-lg font-bold text-green-700">
                        {Number(
                          reportData.grand_total.profit || 0,
                        ).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 text-right text-sm text-gray-500">
                  <p>Samui Look Co., Ltd</p>
                  <p>Issued Date: {format(new Date(), "dd/MM/yyyy")}</p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <FileText size={48} className="mx-auto mb-4 text-gray-400" />
                <p>Select date range and click "Generate Report"</p>
              </div>
            )
          ) : (
            <div className="p-8 text-center text-gray-500">
              <FileText size={48} className="mx-auto mb-4 text-gray-400" />
              <p>Select date range and click "Generate Report"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllInvoiceReport;
