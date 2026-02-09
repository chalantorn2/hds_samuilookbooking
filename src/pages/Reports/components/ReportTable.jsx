import React from "react";
import { FileText, Download } from "lucide-react";
import { formatDateOnly, formatCurrency } from "../../../utils/helpers";
import * as XLSX from "xlsx";

const ReportTable = ({
  loading,
  currentItems,
  selectedDate,
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
  summary,
  onPaymentStatusClick,
}) => {
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleExportExcel = () => {
    // Prepare data for export
    const exportData = filteredData.map((item, index) => ({
      "No.": index + 1,
      "ID": item.booking_ref_no,
      "Customer Name": item.customer_name,
      "Customer Code": item.customer_code,
      "Supplier Name": item.supplier_name,
      "Supplier Code": item.supplier_code,
      "PAX": item.pax_count,
      "Routing/Detail": item.routing_detail,
      "Booking Code/PNR": item.booking_code,
      "Ticket Type": item.ticket_type || "-",
      "Ticket Number": item.ticket_numbers || "-",
      "Total Sales": item.total_price,
      "Payment Detail": item.payment_detail,
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    ws["!cols"] = [
      { wch: 6 },  // No.
      { wch: 20 }, // ID
      { wch: 25 }, // Customer Name
      { wch: 12 }, // Customer Code
      { wch: 25 }, // Supplier Name
      { wch: 12 }, // Supplier Code
      { wch: 8 },  // PAX
      { wch: 30 }, // Routing/Detail
      { wch: 20 }, // Booking Code/PNR
      { wch: 12 }, // Ticket Type
      { wch: 30 }, // Ticket Number
      { wch: 12 }, // Total Sales
      { wch: 25 }, // Payment Detail
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Report");

    // Generate filename
    const filename = `Daily_Report_${formatDateOnly(selectedDate)}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="px-4 pb-6">
      <div className="flex justify-between items-center mt-4 mb-4">
        <h2 className="text-lg font-semibold flex items-center">
          <FileText size={20} className="mr-2 text-blue-500" />
          Daily Report ({formatDateOnly(selectedDate)})
        </h2>

        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <Download size={16} />
          Export Excel
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Loading data...</p>
        </div>
      ) : (
        <>
          <div className="bg-white shadow-sm rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      No.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("customer_name")}>
                      Customer Name<br/>(Code)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("supplier_name")}>
                      Supplier Name<br/>(Code)
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PAX
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Routing / Detail
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Booking Code / PNR
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ticket Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ticket Number
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("total_price")}>
                      Total Sales
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Detail
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="px-6 py-4 text-center text-gray-500">
                        No data found for {formatDateOnly(selectedDate)}
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-gray-500">
                          {indexOfFirstItem + index + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                          {item.booking_ref_no}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          <div className="font-medium">{item.customer_name}</div>
                          <div className="text-xs text-gray-500">({item.customer_code})</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          <div className="font-medium">{item.supplier_name}</div>
                          <div className="text-xs text-gray-500">({item.supplier_code})</div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                          {item.pax_count}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
                          <div className="truncate" title={item.routing_detail}>
                            {item.routing_detail}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.booking_code || "-"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {item.ticket_type || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
                          <div className="truncate" title={item.ticket_numbers}>
                            {item.ticket_numbers || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(item.total_price)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.payment_detail}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary Section */}
            {summary && (
              <div className="border-t-2 border-gray-300 bg-blue-50 p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Total Bookings</div>
                    <div className="text-lg font-bold text-gray-900">
                      {summary.total_bookings}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Total Amount</div>
                    <div className="text-lg font-bold text-blue-600">
                      {formatCurrency(summary.total_amount)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Paid</div>
                    <div className="text-sm font-semibold text-green-600">
                      {summary.paid_count} bookings
                    </div>
                    <div className="text-md font-bold text-green-700">
                      {formatCurrency(summary.paid_amount)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Waiting</div>
                    <div className="text-sm font-semibold text-orange-600">
                      {summary.waiting_count} bookings
                    </div>
                    <div className="text-md font-bold text-orange-700">
                      {formatCurrency(summary.waiting_amount)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {indexOfFirstItem + 1} to{" "}
                    {Math.min(indexOfLastItem, filteredData.length)} of{" "}
                    {filteredData.length} entries
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(
                          (page) =>
                            page === 1 ||
                            page === totalPages ||
                            Math.abs(page - currentPage) <= 2
                        )
                        .map((page, index, arr) => {
                          if (index > 0 && page - arr[index - 1] > 1) {
                            return (
                              <React.Fragment key={`ellipsis-${page}`}>
                                <span className="px-3 py-1">...</span>
                                <button
                                  onClick={() => setCurrentPage(page)}
                                  className={`px-3 py-1 border rounded-md text-sm ${
                                    currentPage === page
                                      ? "bg-blue-500 text-white border-blue-500"
                                      : "border-gray-300 hover:bg-gray-50"
                                  }`}
                                >
                                  {page}
                                </button>
                              </React.Fragment>
                            );
                          }
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1 border rounded-md text-sm ${
                                currentPage === page
                                  ? "bg-blue-500 text-white border-blue-500"
                                  : "border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                    </div>
                    <button
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ReportTable;
