import React from "react";
import { format } from "date-fns";
import { Download, Tag } from "lucide-react";
import * as XLSX from "xlsx";

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

// Ticket types ที่ต้อง group by details
const GROUPED_TICKET_TYPES = ["tg", "b2b", "other"];

// Format ตารางแบบ by Ticket Type
// - BSP, AIRLINE, WEB: แสดง flat list
// - TG, B2B, OTHER: group by ticket_type_details
const TicketTypeFilterTable = ({
  reportData,
  startDate,
  endDate,
  selectedTicketType,
  getRoutingOrDescription,
}) => {
  // Flatten all bookings from daily_summary
  const allBookings = reportData.daily_summary.flatMap((day) => day.bookings);

  // เช็กว่าเป็น ticket type ที่ต้อง group หรือไม่
  const shouldGroupByDetails = GROUPED_TICKET_TYPES.includes(
    selectedTicketType?.toLowerCase(),
  );

  // Group bookings by ticket_type_details (สำหรับ TG, B2B, OTHER)
  const groupedBookings = React.useMemo(() => {
    if (!shouldGroupByDetails) return null;

    const groups = {};
    allBookings.forEach((booking) => {
      const details = booking.ticket_type_details || "(ไม่ระบุรายละเอียด)";
      if (!groups[details]) {
        groups[details] = [];
      }
      groups[details].push(booking);
    });

    // Sort groups by name
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allBookings, shouldGroupByDetails]);

  // คำนวณ Sub Total สำหรับแต่ละ group
  const calculateSubTotal = (bookings) => ({
    pax_count: bookings.reduce((sum, b) => sum + (b.pax_count || 0), 0),
    total_sale: bookings.reduce((sum, b) => sum + (b.total_sale || 0), 0),
  });

  // Grand Total
  const grandTotal = {
    pax_count: allBookings.reduce((sum, b) => sum + (b.pax_count || 0), 0),
    total_sale: allBookings.reduce((sum, b) => sum + (b.total_sale || 0), 0),
  };

  // Export Excel - แบบ grouped
  const handleExportExcelGrouped = () => {
    const exportData = [];

    exportData.push(["REPORT BY TICKET TYPE"]);
    exportData.push([`For Ticket Type: ${selectedTicketType.toUpperCase()}`]);
    exportData.push([
      `Date Range: ${format(new Date(startDate), "dd/MM/yyyy")} - ${format(
        new Date(endDate),
        "dd/MM/yyyy",
      )}`,
    ]);
    exportData.push([]);

    // Header
    exportData.push([
      "No",
      "Date",
      "Inv/PO Number",
      "Supplier Code",
      "Ticket No.",
      "Routing",
      "PAX",
      "Code",
      "Total Price",
    ]);

    groupedBookings.forEach(([details, bookings]) => {
      const subTotal = calculateSubTotal(bookings);

      // Group header
      exportData.push([`--- ${details} ---`]);

      // Bookings
      bookings.forEach((booking, idx) => {
        exportData.push([
          idx + 1,
          format(new Date(booking.create_date), "dd/MM/yyyy"),
          booking.booking_ref_no,
          booking.supplier_code,
          formatTicketNumberDisplay(booking.ticket_numbers),
          getRoutingOrDescription(booking),
          booking.pax_count,
          booking.booking_code || "",
          Number(booking.total_sale).toFixed(2),
        ]);
      });

      // Sub total
      exportData.push([
        "",
        "",
        "",
        "",
        "",
        "Sub Total",
        "",
        "",
        Number(subTotal.total_sale).toFixed(2),
      ]);
      exportData.push([]);
    });

    // Grand total
    exportData.push([
      "",
      "",
      "",
      "",
      "",
      "Grand Total",
      "",
      "",
      Number(grandTotal.total_sale).toFixed(2),
    ]);

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ticket Type Report");
    XLSX.writeFile(
      wb,
      `TicketType_Report_${selectedTicketType}_${startDate}_${endDate}.xlsx`,
    );
  };

  // Export Excel - แบบ flat
  const handleExportExcelFlat = () => {
    const exportData = [];

    exportData.push(["REPORT BY TICKET TYPE"]);
    exportData.push([`For Ticket Type: ${selectedTicketType.toUpperCase()}`]);
    exportData.push([
      `Date Range: ${format(new Date(startDate), "dd/MM/yyyy")} - ${format(
        new Date(endDate),
        "dd/MM/yyyy",
      )}`,
    ]);
    exportData.push([]);

    exportData.push([
      "No",
      "Date",
      "Inv/PO Number",
      "Supplier Code",
      "Ticket No.",
      "Routing",
      "PAX",
      "Code",
      "Total Price",
    ]);

    allBookings.forEach((booking, idx) => {
      exportData.push([
        idx + 1,
        format(new Date(booking.create_date), "dd/MM/yyyy"),
        booking.booking_ref_no,
        booking.supplier_code,
        formatTicketNumberDisplay(booking.ticket_numbers),
        getRoutingOrDescription(booking),
        booking.pax_count,
        booking.booking_code || "",
        Number(booking.total_sale).toFixed(2),
      ]);
    });

    exportData.push([
      "",
      "",
      "",
      "",
      "",
      "Grand Total",
      "",
      "",
      Number(grandTotal.total_sale).toFixed(2),
    ]);

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ticket Type Report");
    XLSX.writeFile(
      wb,
      `TicketType_Report_${selectedTicketType}_${startDate}_${endDate}.xlsx`,
    );
  };

  // Render table สำหรับแต่ละ group
  const renderGroupTable = (bookings, subTotal, groupName) => (
    <div className="mb-8" key={groupName}>
      <div className="bg-blue-800 text-white px-4 py-2 rounded-t-md">
        <h3 className="font-semibold">{groupName}</h3>
      </div>
      <div className="overflow-x-auto border border-gray-300 rounded-b-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                No.
              </th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                Date
              </th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                Inv/PO Number
              </th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                Supplier Code
              </th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                Ticket No.
              </th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                Routing
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                PAX
              </th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                Code
              </th>
              <th className="px-2 py-3 text-right text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                Total Price
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
                  {formatTicketNumberDisplay(booking.ticket_numbers)}
                </td>
                <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap">
                  {getRoutingOrDescription(booking)}
                </td>
                <td className="px-2 py-2 text-sm text-gray-700 text-center whitespace-nowrap">
                  {booking.pax_count}
                </td>
                <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap">
                  {booking.booking_code || ""}
                </td>
                <td className="px-2 py-2 text-sm text-gray-700 text-right whitespace-nowrap">
                  {Number(booking.total_sale).toLocaleString("en-US", {
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
                colSpan="8"
                className="px-2 py-2 text-sm font-bold text-gray-700 text-right whitespace-nowrap"
              >
                Sub Total:
              </td>
              <td className="px-2 py-2 text-sm font-bold text-gray-700 text-right whitespace-nowrap">
                {Number(subTotal.total_sale).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  // Render flat table (สำหรับ BSP, AIRLINE, WEB)
  const renderFlatTable = () => (
    <div className="overflow-x-auto border border-gray-300 rounded-b-md">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
              No.
            </th>
            <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
              Date
            </th>
            <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
              Inv/PO Number
            </th>
            <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
              Supplier Code
            </th>
            <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
              Ticket No.
            </th>
            <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
              Routing
            </th>
            <th className="px-2 py-3 text-center text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
              PAX
            </th>
            <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
              Code
            </th>
            <th className="px-2 py-3 text-right text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
              Total Price
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {allBookings.map((booking, idx) => (
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
                {formatTicketNumberDisplay(booking.ticket_numbers)}
              </td>
              <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap">
                {getRoutingOrDescription(booking)}
              </td>
              <td className="px-2 py-2 text-sm text-gray-700 text-center whitespace-nowrap">
                {booking.pax_count}
              </td>
              <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap">
                {booking.booking_code || ""}
              </td>
              <td className="px-2 py-2 text-sm text-gray-700 text-right whitespace-nowrap">
                {Number(booking.total_sale).toLocaleString("en-US", {
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
              colSpan="8"
              className="px-2 py-2 text-sm font-bold text-gray-700 text-right whitespace-nowrap"
            >
              Grand Total:
            </td>
            <td className="px-2 py-2 text-sm font-bold text-gray-700 text-right whitespace-nowrap">
              {Number(grandTotal.total_sale).toLocaleString("en-US", {
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
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md flex justify-between items-center">
        <div className="flex items-center gap-2 text-blue-800">
          <Tag size={20} />
          <div>
            <p className="font-semibold">
              For Ticket Type: {selectedTicketType?.toUpperCase()}
            </p>
            <p className="text-sm">
              Date Range: {format(new Date(startDate), "dd/MM/yyyy")} -{" "}
              {format(new Date(endDate), "dd/MM/yyyy")}
            </p>
          </div>
        </div>
        <button
          onClick={
            shouldGroupByDetails
              ? handleExportExcelGrouped
              : handleExportExcelFlat
          }
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <Download size={16} />
          Export Excel
        </button>
      </div>

      {/* Grouped View for TG, B2B, OTHER */}
      {shouldGroupByDetails && groupedBookings ? (
        <>
          {groupedBookings.map(([details, bookings]) => {
            const subTotal = calculateSubTotal(bookings);
            return renderGroupTable(bookings, subTotal, details);
          })}

          {/* Grand Total */}
          <div className="mt-6 bg-white border-2 border-gray-300 rounded-lg p-4">
            <h3 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-300">
              Grand Total
            </h3>
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[120px] border-2 border-green-600 bg-green-50 rounded p-3">
                <div className="text-xs text-gray-600 mb-1">Total Price</div>
                <div className="text-lg font-bold text-green-700">
                  {Number(grandTotal.total_sale).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Flat View for BSP, AIRLINE, WEB */
        renderFlatTable()
      )}

      {/* Footer */}
      <div className="mt-6 text-right text-sm text-gray-500">
        <p>Samui Look Co., Ltd</p>
        <p>Issued Date: {format(new Date(), "dd/MM/yyyy")}</p>
      </div>
    </div>
  );
};

export default TicketTypeFilterTable;
