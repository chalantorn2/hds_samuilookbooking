import React from "react";
import { format } from "date-fns";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

// Format ตารางแบบเต็ม (All Invoice) - มี Cost/Sale/Profit แบ่งตามวัน
const AllInvoiceTable = ({
  reportData,
  startDate,
  endDate,
  formatRoutingDisplay,
  sortOrder,
}) => {
  const handleExportExcel = () => {
    const exportData = [];

    // Add header
    exportData.push(["ALL INVOICE REPORT"]);
    exportData.push([
      `Date Range: ${format(new Date(startDate), "dd/MM/yyyy")} - ${format(
        new Date(endDate),
        "dd/MM/yyyy",
      )}`,
    ]);
    exportData.push([]); // Empty row

    reportData.daily_summary.forEach((day) => {
      exportData.push([`Date: ${format(new Date(day.date), "dd/MM/yyyy")}`]);
      exportData.push([
        "No",
        "Date",
        "Ref No",
        "CUST",
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
        "Status",
        "Payment Detail",
      ]);

      day.bookings.forEach((booking, idx) => {
        exportData.push([
          idx + 1,
          format(new Date(booking.create_date), "dd/MM/yy"),
          booking.booking_ref_no,
          booking.customer_code,
          booking.supplier_code,
          booking.ticket_type || "",
          formatRoutingDisplay(booking.routing_detail),
          booking.pax_count,
          Number(booking.ticket_cost || 0).toFixed(2),
          Number(booking.ticket_sale || 0).toFixed(2),
          Number(booking.option_cost || 0).toFixed(2),
          Number(booking.option_sale || 0).toFixed(2),
          Number(booking.total_cost || 0).toFixed(2),
          Number(booking.total_sale || 0).toFixed(2),
          Number(booking.profit || 0).toFixed(2),
          booking.payment_status,
          booking.payment_detail,
        ]);
      });

      // Sub Total
      exportData.push([
        "",
        "",
        "Sub Total",
        "",
        "",
        "",
        "",
        day.sub_total.pax_count,
        Number(day.sub_total.ticket_cost).toFixed(2),
        Number(day.sub_total.ticket_sale).toFixed(2),
        Number(day.sub_total.option_cost).toFixed(2),
        Number(day.sub_total.option_sale).toFixed(2),
        Number(day.sub_total.total_cost).toFixed(2),
        Number(day.sub_total.total_sale).toFixed(2),
        Number(day.sub_total.profit).toFixed(2),
      ]);
      exportData.push([]); // Empty row
    });

    // Grand Total
    if (reportData.grand_total) {
      exportData.push([
        "",
        "",
        "Grand Total",
        "",
        "",
        "",
        "",
        reportData.grand_total.pax_count,
        Number(reportData.grand_total.ticket_cost).toFixed(2),
        Number(reportData.grand_total.ticket_sale).toFixed(2),
        Number(reportData.grand_total.option_cost).toFixed(2),
        Number(reportData.grand_total.option_sale).toFixed(2),
        Number(reportData.grand_total.total_cost).toFixed(2),
        Number(reportData.grand_total.total_sale).toFixed(2),
        Number(reportData.grand_total.profit).toFixed(2),
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "All Invoice Report");
    XLSX.writeFile(wb, `All_Invoice_Report_${startDate}_${endDate}.xlsx`);
  };

  // Sort daily summary
  const sortedDailySummary = [...reportData.daily_summary].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
  });

  return (
    <div className="p-4">
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md flex justify-between items-center">
        <div className="flex items-center gap-2 text-blue-800">
          <span className="font-semibold">
            Date Range: {format(new Date(startDate), "dd/MM/yyyy")} -{" "}
            {format(new Date(endDate), "dd/MM/yyyy")}
          </span>
        </div>
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <Download size={16} />
          Export Excel
        </button>
      </div>

      {sortedDailySummary.map((day, dayIndex) => (
        <div key={dayIndex} className="mb-8">
          {/* Daily Header */}
          <div className="bg-blue-800 text-white px-4 py-2 rounded-t-md">
            <h3 className="font-semibold">
              Date: {format(new Date(day.date), "dd/MM/yyyy")}
            </h3>
          </div>

          {/* Daily Table */}
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
                <col style={{ width: "100px" }} />
                <col style={{ width: "150px" }} />
              </colgroup>
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                    No.
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                    Ref No.
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                    CUST
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                    SUP
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                    TYPE
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                    Routing
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                    Pax
                  </th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                    TKT Cost
                  </th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                    TKT Sale
                  </th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                    OPT Cost
                  </th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                    OPT Sale
                  </th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                    Total Cost
                  </th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                    Total Sale
                  </th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                    Profit
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                    Payment Detail
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {day.bookings.map((booking, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-2 py-1.5 text-xs text-gray-700 whitespace-nowrap">
                      {idx + 1}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-700 whitespace-nowrap">
                      {format(new Date(booking.create_date), "dd/MM/yy")}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-700 whitespace-nowrap">
                      {booking.booking_ref_no}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-700 whitespace-nowrap">
                      {booking.customer_code}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-700 whitespace-nowrap">
                      {booking.supplier_code}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-700 whitespace-nowrap">
                      {booking.ticket_type || ""}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-700 whitespace-nowrap">
                      {formatRoutingDisplay(booking.routing_detail)}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-700 text-center whitespace-nowrap">
                      {booking.pax_count}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-700 text-right whitespace-nowrap">
                      {Number(booking.ticket_cost || 0).toLocaleString(
                        "en-US",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-700 text-right whitespace-nowrap">
                      {Number(booking.ticket_sale || 0).toLocaleString(
                        "en-US",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-700 text-right whitespace-nowrap">
                      {Number(booking.option_cost || 0).toLocaleString(
                        "en-US",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-700 text-right whitespace-nowrap">
                      {Number(booking.option_sale || 0).toLocaleString(
                        "en-US",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-700 text-right whitespace-nowrap">
                      {Number(booking.total_cost || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-700 text-right whitespace-nowrap">
                      {Number(booking.total_sale || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-700 text-right whitespace-nowrap">
                      {Number(booking.profit || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          booking.payment_status === "paid"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {booking.payment_status === "paid" ? "Paid" : "Waiting"}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-700 whitespace-nowrap">
                      {booking.payment_detail}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Sub Total */}
              <tfoot className="bg-yellow-50 border-t-2 border-yellow-400">
                <tr>
                  <td
                    colSpan="7"
                    className="px-2 py-2 text-xs font-bold text-gray-800 text-right"
                  >
                    Sub Total:
                  </td>
                  <td className="px-2 py-2 text-xs font-bold text-center">
                    {day.sub_total.pax_count}
                  </td>
                  <td className="px-2 py-2 text-xs font-bold text-right">
                    {Number(day.sub_total.ticket_cost).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-2 py-2 text-xs font-bold text-right">
                    {Number(day.sub_total.ticket_sale).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-2 py-2 text-xs font-bold text-right">
                    {Number(day.sub_total.option_cost).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-2 py-2 text-xs font-bold text-right">
                    {Number(day.sub_total.option_sale).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-2 py-2 text-xs font-bold text-right">
                    {Number(day.sub_total.total_cost).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-2 py-2 text-xs font-bold text-right">
                    {Number(day.sub_total.total_sale).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-2 py-2 text-xs font-bold text-right text-blue-600">
                    {Number(day.sub_total.profit).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ))}

      {/* Grand Total */}
      {reportData.grand_total && (
        <div className="mt-6 bg-green-50 border-2 border-green-500 rounded-md p-4">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Grand Total</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Total PAX</div>
              <div className="text-lg font-bold text-gray-900">
                {reportData.grand_total.pax_count}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Total Cost</div>
              <div className="text-lg font-bold text-red-600">
                {Number(reportData.grand_total.total_cost).toLocaleString(
                  "en-US",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  },
                )}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Total Sale</div>
              <div className="text-lg font-bold text-blue-600">
                {Number(reportData.grand_total.total_sale).toLocaleString(
                  "en-US",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  },
                )}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Total Profit</div>
              <div className="text-lg font-bold text-green-600">
                {Number(reportData.grand_total.profit).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllInvoiceTable;
