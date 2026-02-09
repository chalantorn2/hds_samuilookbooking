import React from "react";
import { format } from "date-fns";
import { Download, User } from "lucide-react";
import * as XLSX from "xlsx";

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

// TG, B2B, OTHER → แสดง ticket_type_details แทน ticket_type
const GROUPED_TICKET_TYPES = ["tg", "b2b", "other"];
const getDisplayType = (booking) => {
  const type = (booking.ticket_type || "").toLowerCase();
  if (GROUPED_TICKET_TYPES.includes(type) && booking.ticket_type_details) {
    return booking.ticket_type_details;
  }
  return booking.ticket_type || "";
};

// Format ตารางแบบ by Customer
const CustomerFilterTable = ({
  reportData,
  startDate,
  endDate,
  selectedCustomer,
  getRoutingOrDescription,
}) => {
  // Flatten all bookings from daily_summary
  const allBookings = reportData.daily_summary.flatMap((day) => day.bookings);

  // Group bookings by customer_code
  const groupedByCustomer = allBookings.reduce((acc, booking) => {
    const key = booking.customer_code || "UNKNOWN";
    if (!acc[key]) {
      acc[key] = {
        customer_code: key,
        customer_name: booking.customer_name || "",
        bookings: [],
      };
    }
    acc[key].bookings.push(booking);
    return acc;
  }, {});

  // Sort customer groups by customer_code
  const customerGroups = Object.values(groupedByCustomer).sort((a, b) =>
    a.customer_code.localeCompare(b.customer_code),
  );

  // Calculate sub total for a group
  const calculateSubTotal = (bookings) => ({
    pax_count: bookings.reduce((sum, b) => sum + (b.pax_count || 0), 0),
    ticket_cost: bookings.reduce(
      (sum, b) => sum + (parseFloat(b.ticket_cost) || 0),
      0,
    ),
    ticket_sale: bookings.reduce(
      (sum, b) => sum + (parseFloat(b.ticket_sale) || 0),
      0,
    ),
    option_cost: bookings.reduce(
      (sum, b) => sum + (parseFloat(b.option_cost) || 0),
      0,
    ),
    option_sale: bookings.reduce(
      (sum, b) => sum + (parseFloat(b.option_sale) || 0),
      0,
    ),
    total_cost: bookings.reduce(
      (sum, b) => sum + (parseFloat(b.total_cost) || 0),
      0,
    ),
    total_sale: bookings.reduce(
      (sum, b) => sum + (parseFloat(b.total_sale) || 0),
      0,
    ),
    profit: bookings.reduce((sum, b) => sum + (parseFloat(b.profit) || 0), 0),
  });

  // Check if showing all customers or single customer
  const isAllCustomers = !selectedCustomer;

  const handleExportExcel = () => {
    const exportData = [];

    // Add header
    exportData.push(["REPORT BY CUSTOMER"]);
    if (!isAllCustomers) {
      exportData.push([`For Customer: ${selectedCustomer}`]);
    }
    exportData.push([
      `Date Range: ${format(new Date(startDate), "dd/MM/yyyy")} - ${format(
        new Date(endDate),
        "dd/MM/yyyy",
      )}`,
    ]);
    exportData.push([]); // Empty row

    // Table header (same as ALL Invoice but without CUST)
    const tableHeader = [
      "No",
      "Date",
      "Ref No.",
      "SUP",
      "TYPE",
      "Routing",
      "Pax",
      "TKT Cost",
      "TKT Sale",
      "OPT Cost",
      "OPT Sale",
      "Total Cost",
      "Total Sale",
      "Profit",
    ];

    if (isAllCustomers) {
      // Export grouped by customer
      customerGroups.forEach((group) => {
        const sortedBookings = sortBookings(group.bookings);
        const subTotal = calculateSubTotal(sortedBookings);

        exportData.push([
          `Customer: ${group.customer_code} - ${group.customer_name}`,
        ]);
        exportData.push(tableHeader);

        sortedBookings.forEach((booking, idx) => {
          exportData.push([
            idx + 1,
            format(new Date(booking.create_date), "dd/MM/yyyy"),
            booking.booking_ref_no,
            booking.supplier_code,
            getDisplayType(booking),
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

        exportData.push([
          "",
          "",
          "",
          "",
          "",
          "Sub Total",
          "",
          Number(subTotal.ticket_cost).toFixed(2),
          Number(subTotal.ticket_sale).toFixed(2),
          Number(subTotal.option_cost).toFixed(2),
          Number(subTotal.option_sale).toFixed(2),
          Number(subTotal.total_cost).toFixed(2),
          Number(subTotal.total_sale).toFixed(2),
          Number(subTotal.profit).toFixed(2),
        ]);
        exportData.push([]); // Empty row
      });
    } else {
      // Export single customer
      exportData.push(tableHeader);

      sortBookings(allBookings).forEach((booking, idx) => {
        exportData.push([
          idx + 1,
          format(new Date(booking.create_date), "dd/MM/yyyy"),
          booking.booking_ref_no,
          booking.supplier_code,
          getDisplayType(booking),
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
    }

    // Grand Total
    if (reportData.grand_total) {
      exportData.push([
        "",
        "",
        "",
        "",
        "",
        "Grand Total",
        "",
        Number(reportData.grand_total.ticket_cost || 0).toFixed(2),
        Number(reportData.grand_total.ticket_sale || 0).toFixed(2),
        Number(reportData.grand_total.option_cost || 0).toFixed(2),
        Number(reportData.grand_total.option_sale || 0).toFixed(2),
        Number(reportData.grand_total.total_cost || 0).toFixed(2),
        Number(reportData.grand_total.total_sale || 0).toFixed(2),
        Number(reportData.grand_total.profit || 0).toFixed(2),
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customer Report");

    ws["!cols"] = [
      { wch: 6 }, // No
      { wch: 12 }, // Date
      { wch: 16 }, // Ref No.
      { wch: 10 }, // SUP
      { wch: 10 }, // TYPE
      { wch: 25 }, // Routing
      { wch: 6 }, // Pax
      { wch: 12 }, // TKT Cost
      { wch: 12 }, // TKT Sale
      { wch: 12 }, // OPT Cost
      { wch: 12 }, // OPT Sale
      { wch: 12 }, // Total Cost
      { wch: 12 }, // Total Sale
      { wch: 12 }, // Profit
    ];

    const filename = isAllCustomers
      ? `Customer_Report_ALL_${startDate}_${endDate}.xlsx`
      : `Customer_Report_${selectedCustomer}_${startDate}_${endDate}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Render table for a single customer group
  const renderCustomerTable = (bookings, subTotal) => (
    <div className="overflow-x-auto border border-gray-300 rounded-b-md">
      <table className="min-w-full divide-y divide-gray-200 table-fixed">
        <colgroup>
          <col style={{ width: "50px" }} />
          <col style={{ width: "90px" }} />
          <col style={{ width: "140px" }} />
          <col style={{ width: "80px" }} />
          <col style={{ width: "80px" }} />
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
          {bookings.map((booking, idx) => (
            <tr key={idx} className="hover:bg-gray-50 transition-colors">
              <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap">
                {idx + 1}
              </td>
              <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap">
                {format(new Date(booking.create_date), "dd/MM/yy")}
              </td>
              <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap">
                {booking.booking_ref_no}
              </td>
              <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap">
                {booking.supplier_code}
              </td>
              <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap">
                {getDisplayType(booking)}
              </td>
              <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap">
                {getRoutingOrDescription(booking)}
              </td>
              <td className="px-2 py-2 text-sm text-gray-700 text-center whitespace-nowrap">
                {booking.pax_count}
              </td>
              <td className="px-2 py-2 text-sm text-gray-700 text-right whitespace-nowrap">
                {Number(booking.ticket_cost || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-2 py-2 text-sm text-gray-700 text-right whitespace-nowrap">
                {Number(booking.ticket_sale || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-2 py-2 text-sm text-gray-700 text-right whitespace-nowrap">
                {Number(booking.option_cost || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-2 py-2 text-sm text-gray-700 text-right whitespace-nowrap">
                {Number(booking.option_sale || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-2 py-2 text-sm text-gray-700 text-right whitespace-nowrap">
                {Number(booking.total_cost || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-2 py-2 text-sm text-gray-700 text-right whitespace-nowrap">
                {Number(booking.total_sale || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-2 py-2 text-sm text-gray-700 text-right whitespace-nowrap">
                {Number(booking.profit || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
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
            <td className="px-2 py-2 text-sm font-bold text-gray-700 text-right whitespace-nowrap">
              {Number(subTotal.ticket_cost).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </td>
            <td className="px-2 py-2 text-sm font-bold text-gray-700 text-right whitespace-nowrap">
              {Number(subTotal.ticket_sale).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </td>
            <td className="px-2 py-2 text-sm font-bold text-gray-700 text-right whitespace-nowrap">
              {Number(subTotal.option_cost).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </td>
            <td className="px-2 py-2 text-sm font-bold text-gray-700 text-right whitespace-nowrap">
              {Number(subTotal.option_sale).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </td>
            <td className="px-2 py-2 text-sm font-bold text-gray-700 text-right whitespace-nowrap">
              {Number(subTotal.total_cost).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </td>
            <td className="px-2 py-2 text-sm font-bold text-gray-700 text-right whitespace-nowrap">
              {Number(subTotal.total_sale).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </td>
            <td className="px-2 py-2 text-sm font-bold text-gray-700 text-right whitespace-nowrap">
              {Number(subTotal.profit).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md flex justify-between items-center">
        <div className="flex items-center gap-2 text-blue-800">
          <User size={20} />
          <div>
            <p className="font-semibold">
              {isAllCustomers
                ? "All Customers"
                : `For Customer: ${selectedCustomer}`}
            </p>
            <p className="text-sm">
              Date Range: {format(new Date(startDate), "dd/MM/yyyy")} -{" "}
              {format(new Date(endDate), "dd/MM/yyyy")}
            </p>
          </div>
        </div>
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <Download size={16} />
          Export Excel
        </button>
      </div>

      {isAllCustomers ? (
        // Grouped by Customer view
        <>
          {customerGroups.map((group, groupIndex) => {
            const sortedBookings = sortBookings(group.bookings);
            const subTotal = calculateSubTotal(sortedBookings);

            return (
              <div key={groupIndex} className="mb-8">
                {/* Customer Header */}
                <div className="bg-blue-800 text-white px-4 py-2 rounded-t-md">
                  <h3 className="font-semibold">
                    {group.customer_code} - {group.customer_name}
                  </h3>
                </div>

                {/* Customer Table */}
                {renderCustomerTable(sortedBookings, subTotal)}
              </div>
            );
          })}

          {/* Grand Total */}
          <div className="mt-6 bg-white border-2 border-gray-300 rounded-lg p-4">
            <h3 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-300">
              Grand Total
            </h3>
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[100px] border border-gray-200 rounded p-3">
                <div className="text-xs text-gray-500 mb-1">TKT Cost</div>
                <div className="text-base font-bold text-gray-800">
                  {Number(
                    reportData.grand_total?.ticket_cost || 0,
                  ).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
              <div className="flex-1 min-w-[100px] border border-gray-200 rounded p-3">
                <div className="text-xs text-gray-500 mb-1">TKT Sale</div>
                <div className="text-base font-bold text-gray-800">
                  {Number(
                    reportData.grand_total?.ticket_sale || 0,
                  ).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
              <div className="flex-1 min-w-[100px] border border-gray-200 rounded p-3">
                <div className="text-xs text-gray-500 mb-1">OPT Cost</div>
                <div className="text-base font-bold text-gray-800">
                  {Number(
                    reportData.grand_total?.option_cost || 0,
                  ).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
              <div className="flex-1 min-w-[100px] border border-gray-200 rounded p-3">
                <div className="text-xs text-gray-500 mb-1">OPT Sale</div>
                <div className="text-base font-bold text-gray-800">
                  {Number(
                    reportData.grand_total?.option_sale || 0,
                  ).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
              <div className="flex-1 min-w-[100px] border border-gray-200 rounded p-3">
                <div className="text-xs text-gray-500 mb-1">Total Cost</div>
                <div className="text-base font-bold text-gray-800">
                  {Number(
                    reportData.grand_total?.total_cost || 0,
                  ).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
              <div className="flex-1 min-w-[100px] border border-gray-200 rounded p-3">
                <div className="text-xs text-gray-500 mb-1">Total Sale</div>
                <div className="text-base font-bold text-gray-800">
                  {Number(
                    reportData.grand_total?.total_sale || 0,
                  ).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
              <div className="flex-1 min-w-[100px] border-2 border-green-600 bg-green-50 rounded p-3">
                <div className="text-xs text-gray-600 mb-1">Profit</div>
                <div className="text-lg font-bold text-green-700">
                  {Number(reportData.grand_total?.profit || 0).toLocaleString(
                    "en-US",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        // Single Customer view
        <>
          {renderCustomerTable(
            sortBookings(allBookings),
            calculateSubTotal(allBookings),
          )}
        </>
      )}

      {/* Footer */}
      <div className="mt-6 text-right text-sm text-gray-500">
        <p>Samui Look Co., Ltd</p>
        <p>Issued Date: {format(new Date(), "dd/MM/yyyy")}</p>
      </div>
    </div>
  );
};

export default CustomerFilterTable;
