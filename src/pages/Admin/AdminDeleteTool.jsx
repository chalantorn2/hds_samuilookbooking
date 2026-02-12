import React, { useState } from "react";
import {
  FiTrash2,
  FiSearch,
  FiAlertTriangle,
  FiCheckSquare,
  FiSquare,
  FiFilter,
  FiRefreshCw,
} from "react-icons/fi";

const AdminDeleteTool = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [bookings, setBookings] = useState([]);
  const [selectedBookings, setSelectedBookings] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [confirmations, setConfirmations] = useState({
    understand: false,
    verified: false,
    authorized: false,
  });
  const [deleteProgress, setDeleteProgress] = useState("");

  // Filter states
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Service type definitions based on database schema
  const serviceTypes = {
    ticket: {
      label: "Flight Tickets",
      icon: "✈️",
      table: "bookings_ticket",
      color: "blue",
    },
    voucher: {
      label: "Bus/Boat/Tour",
      icon: "🚌",
      table: "bookings_voucher",
      color: "green",
      subtypes: ["bus", "boat", "tour"],
    },
    deposit: {
      label: "Deposits",
      icon: "💰",
      table: "bookings_deposit",
      color: "yellow",
      subtypes: ["airTicket", "package", "land", "other"],
    },
    other: {
      label: "Other Services",
      icon: "🏨",
      table: "bookings_other",
      color: "purple",
      subtypes: ["insurance", "hotel", "train", "visa", "other"],
    },
  };

  // Status definitions
  const statusTypes = {
    ticket: ["not_invoiced", "invoiced", "cancelled", "confirmed"],
    voucher: ["not_voucher", "voucher_issued", "cancelled", "confirmed"],
    deposit: ["pending", "confirmed", "cancelled"],
    other: ["not_invoiced", "invoiced", "cancelled", "confirmed"],
  };

  // Load all bookings from all service types
  const loadAllBookings = async () => {
    setLoading(true);
    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "https://hds.samuilookbiz.com/api";

      // Call enhanced API that fetches from all booking tables
      const response = await fetch(`${API_BASE_URL}/gateway.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "searchAllBookingsForDelete",
          includeServices: ["ticket", "voucher", "deposit", "other"],
          searchTerm: searchTerm.trim() || null,
          filters: {
            serviceType: serviceTypeFilter !== "all" ? serviceTypeFilter : null,
            status: statusFilter !== "all" ? statusFilter : null,
            dateRange: dateFilter !== "all" ? dateFilter : null,
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        setBookings(result.data || []);
      } else {
        alert("เกิดข้อผิดพลาด: " + result.error);
        setBookings([]);
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
      setBookings([]);
    }
    setLoading(false);
  };

  // Search bookings with filters
  const searchBookings = () => {
    loadAllBookings();
  };

  // Toggle booking selection
  const toggleBookingSelection = (bookingId, bookingType) => {
    const newSelected = new Set(selectedBookings);
    const key = `${bookingType}_${bookingId}`;

    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedBookings(newSelected);
  };

  // Toggle select all filtered bookings
  const toggleSelectAll = () => {
    if (selectedBookings.size === filteredBookings.length) {
      setSelectedBookings(new Set());
    } else {
      const allKeys = filteredBookings.map((b) => `${b.type}_${b.id}`);
      setSelectedBookings(new Set(allKeys));
    }
  };

  // Update confirmation checkboxes
  const updateConfirmation = (key, value) => {
    setConfirmations((prev) => ({ ...prev, [key]: value }));
  };

  // Check if deletion is allowed
  const canDelete = () => {
    return (
      selectedBookings.size > 0 &&
      confirmations.understand &&
      confirmations.verified &&
      confirmations.authorized
    );
  };

  // Delete selected bookings
  const deleteBookings = async () => {
    if (!canDelete()) return;

    const selectedByType = {
      ticket: [],
      voucher: [],
      deposit: [],
      other: [],
    };

    // Group selected bookings by type
    selectedBookings.forEach((key) => {
      const [type, id] = key.split("_");
      if (selectedByType[type]) {
        selectedByType[type].push(parseInt(id));
      }
    });

    const totalCount = Object.values(selectedByType).reduce(
      (sum, arr) => sum + arr.length,
      0
    );

    const confirmed = window.confirm(
      `คุณแน่ใจที่จะลบ ${totalCount} รายการ?\n\n` +
        `Flight Tickets: ${selectedByType.ticket.length}\n` +
        `Bus/Boat/Tour: ${selectedByType.voucher.length}\n` +
        `Deposits: ${selectedByType.deposit.length}\n` +
        `Other Services: ${selectedByType.other.length}\n\n` +
        `การดำเนินการนี้ไม่สามารถย้อนกลับได้!`
    );

    if (!confirmed) return;

    setLoading(true);
    setDeleteProgress("กำลังลบข้อมูล...");

    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "https://hds.samuilookbiz.com/api";

      const response = await fetch(`${API_BASE_URL}/gateway.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "permanentDeleteAllBookings",
          ticketIds: selectedByType.ticket,
          voucherIds: selectedByType.voucher,
          depositIds: selectedByType.deposit,
          otherIds: selectedByType.other,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const deletedCounts = {
          tickets: result.deletedTickets || 0,
          vouchers: result.deletedVouchers || 0,
          deposits: result.deletedDeposits || 0,
          others: result.deletedOthers || 0,
        };

        const totalDeleted = Object.values(deletedCounts).reduce(
          (sum, count) => sum + count,
          0
        );

        setDeleteProgress(
          `ลบสำเร็จ ${totalDeleted} รายการ ` +
            `(Tickets: ${deletedCounts.tickets}, Vouchers: ${deletedCounts.vouchers}, ` +
            `Deposits: ${deletedCounts.deposits}, Others: ${deletedCounts.others})`
        );

        // Refresh data
        const deletedKeys = Array.from(selectedBookings);
        setBookings(
          bookings.filter((b) => !deletedKeys.includes(`${b.type}_${b.id}`))
        );
        setSelectedBookings(new Set());
        setConfirmations({
          understand: false,
          verified: false,
          authorized: false,
        });

        setTimeout(() => setDeleteProgress(""), 5000);
      } else {
        alert("เกิดข้อผิดพลาด: " + result.error);
        setDeleteProgress("");
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
      setDeleteProgress("");
    }

    setLoading(false);
  };

  // Load data on component mount
  React.useEffect(() => {
    loadAllBookings();
  }, []);

  // Filter bookings based on search term and filters
  const filteredBookings = React.useMemo(() => {
    let filtered = bookings;

    // Search term filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (booking) =>
          booking.id.toString().includes(term) ||
          booking.reference_number.toLowerCase().includes(term) ||
          booking.customer_name.toLowerCase().includes(term) ||
          (booking.hotel && booking.hotel.toLowerCase().includes(term)) ||
          (booking.service_type &&
            booking.service_type.toLowerCase().includes(term)) ||
          (booking.description &&
            booking.description.toLowerCase().includes(term)) ||
          (booking.group_name &&
            booking.group_name.toLowerCase().includes(term))
      );
    }

    // Service type filter
    if (serviceTypeFilter !== "all") {
      filtered = filtered.filter(
        (booking) => booking.type === serviceTypeFilter
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((booking) => booking.status === statusFilter);
    }

    return filtered;
  }, [bookings, searchTerm, serviceTypeFilter, statusFilter]);

  // Helper function to get service type display
  const getTypeDisplay = (booking) => {
    const serviceType = serviceTypes[booking.type];
    if (!serviceType) return booking.type;

    let display = serviceType.icon + " " + serviceType.label;

    if (booking.service_type || booking.deposit_type) {
      const subType = booking.service_type || booking.deposit_type;
      display += ` (${subType.toUpperCase()})`;
    }

    return display;
  };

  // Helper function to get additional booking info
  const getAdditionalInfo = (booking) => {
    const parts = [];

    if (booking.type === "voucher") {
      if (booking.hotel) parts.push(`Hotel: ${booking.hotel}`);
      if (booking.trip_date) parts.push(`Trip: ${booking.trip_date}`);
      if (booking.pickup_time) parts.push(`Pickup: ${booking.pickup_time}`);
    } else if (booking.type === "deposit") {
      if (booking.group_name) parts.push(`Group: ${booking.group_name}`);
      if (booking.deposit_type) parts.push(`Type: ${booking.deposit_type}`);
    } else if (booking.type === "other") {
      if (booking.hotel_name) parts.push(`Hotel: ${booking.hotel_name}`);
      if (booking.service_date) parts.push(`Date: ${booking.service_date}`);
      if (booking.country) parts.push(`Country: ${booking.country}`);
      if (booking.route) parts.push(`Route: ${booking.route}`);
    } else if (booking.type === "ticket") {
      if (booking.routes) parts.push(`Routes: ${booking.routes}`);
      if (booking.ticket_type) parts.push(`Type: ${booking.ticket_type}`);
    }

    return parts.join(" | ");
  };

  // Helper function to get status color
  const getStatusColor = (status, type) => {
    const confirmedStatuses = ["confirmed", "voucher_issued"];
    const cancelledStatuses = ["cancelled"];

    if (confirmedStatuses.includes(status)) {
      return "bg-green-100 text-green-800";
    } else if (cancelledStatuses.includes(status)) {
      return "bg-red-100 text-red-800";
    } else {
      return "bg-yellow-100 text-yellow-800";
    }
  };

  // Get booking counts by type
  const getBookingCounts = () => {
    const counts = {};
    Object.keys(serviceTypes).forEach((type) => {
      counts[type] = bookings.filter((b) => b.type === type).length;
    });
    counts.total = bookings.length;
    return counts;
  };

  const bookingCounts = getBookingCounts();

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-red-600 text-white p-4 rounded-t-lg">
          <div className="flex items-center gap-2">
            <FiAlertTriangle size={24} />
            <h1 className="text-xl font-bold">
              🚨 DANGER ZONE - PERMANENT DELETE TOOL 🚨
            </h1>
          </div>
          <p className="text-red-100 mt-1">
            สำหรับ Developer เท่านั้น - การลบไม่สามารถย้อนกลับได้
            (รองรับทุกประเภทบริการ: Flight Tickets, Bus/Boat/Tour, Deposits,
            Other Services)
          </p>
        </div>

        <div className="bg-white p-6 rounded-b-lg shadow-lg">
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            {/* Search */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ค้นหาด้วย ID, Reference Number, ชื่อลูกค้า, Hotel, Service Type, Description, Group Name..."
                className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && searchBookings()}
              />
              <button
                onClick={searchBookings}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
              >
                <FiSearch /> ค้นหา
              </button>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setServiceTypeFilter("all");
                  setStatusFilter("all");
                  setDateFilter("all");
                  loadAllBookings();
                }}
                disabled={loading}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 flex items-center gap-2"
              >
                <FiRefreshCw /> รีเซ็ต
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <FiFilter className="text-gray-500" />
                <span className="text-sm font-medium">ตัวกรอง:</span>
              </div>

              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="all">ทุกประเภทบริการ</option>
                {Object.entries(serviceTypes).map(([key, type]) => (
                  <option key={key} value={key}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="not_invoiced">Not Invoiced</option>
                <option value="invoiced">Invoiced</option>
                <option value="voucher_issued">Voucher Issued</option>
                <option value="not_voucher">Not Voucher</option>
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="all">ทุกช่วงเวลา</option>
                <option value="today">วันนี้</option>
                <option value="week">สัปดาห์นี้</option>
                <option value="month">เดือนนี้</option>
                <option value="quarter">ไตรมาสนี้</option>
              </select>
            </div>
          </div>

          {/* Results */}
          {filteredBookings.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">
                  รายการบุ๊คกิ้ง ({filteredBookings.length} รายการ)
                  {searchTerm && ` - ผลการค้นหา "${searchTerm}"`}
                  {serviceTypeFilter !== "all" &&
                    ` - ${serviceTypes[serviceTypeFilter].label}`}
                </h2>
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                >
                  {selectedBookings.size === filteredBookings.length ? (
                    <FiCheckSquare />
                  ) : (
                    <FiSquare />
                  )}
                  {selectedBookings.size === filteredBookings.length
                    ? "ยกเลิกเลือกทั้งหมด"
                    : "เลือกทั้งหมด"}
                </button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 grid grid-cols-12 gap-4 p-3 font-medium text-sm">
                  <div className="col-span-1">เลือก</div>
                  <div className="col-span-1">ID</div>
                  <div className="col-span-2">Reference</div>
                  <div className="col-span-2">ประเภท</div>
                  <div className="col-span-2">ลูกค้า</div>
                  <div className="col-span-2">รายละเอียดเพิ่มเติม</div>
                  <div className="col-span-1">สถานะ</div>
                  <div className="col-span-1">วันที่สร้าง</div>
                </div>

                {filteredBookings.map((booking) => {
                  const key = `${booking.type}_${booking.id}`;
                  return (
                    <div
                      key={key}
                      className={`grid grid-cols-12 gap-4 p-3 border-t text-sm ${
                        selectedBookings.has(key)
                          ? "bg-red-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="col-span-1">
                        <input
                          type="checkbox"
                          checked={selectedBookings.has(key)}
                          onChange={() =>
                            toggleBookingSelection(booking.id, booking.type)
                          }
                          className="w-4 h-4"
                        />
                      </div>
                      <div className="col-span-1 font-mono">{booking.id}</div>
                      <div className="col-span-2 font-mono text-blue-600">
                        {booking.reference_number}
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm">
                          {getTypeDisplay(booking)}
                        </span>
                      </div>
                      <div className="col-span-2">{booking.customer_name}</div>
                      <div className="col-span-2 text-xs text-gray-600">
                        {getAdditionalInfo(booking)}
                      </div>
                      <div className="col-span-1">
                        <span
                          className={`px-2 py-1 rounded text-xs ${getStatusColor(
                            booking.status,
                            booking.type
                          )}`}
                        >
                          {booking.status}
                        </span>
                      </div>
                      <div className="col-span-1 text-xs">
                        {new Date(booking.created_at).toLocaleDateString(
                          "th-TH"
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary */}
          {bookings.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">สรุปข้อมูล</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                {Object.entries(serviceTypes).map(([key, type]) => (
                  <div key={key}>
                    <span className="font-medium">
                      {type.icon} {type.label}:
                    </span>{" "}
                    {bookingCounts[key]} รายการ
                  </div>
                ))}
                <div className="font-bold">
                  <span className="font-medium">รวมทั้งหมด:</span>{" "}
                  {bookingCounts.total} รายการ
                </div>
              </div>
            </div>
          )}

          {/* Confirmations */}
          {selectedBookings.size > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-3">
                ⚠️ ยืนยันการลบ {selectedBookings.size} รายการ
              </h3>

              <div className="space-y-2">
                {[
                  {
                    key: "understand",
                    text: "ฉันเข้าใจว่าการลบนี้ไม่สามารถย้อนกลับได้",
                  },
                  {
                    key: "verified",
                    text: "ฉันได้ตรวจสอบข้อมูลแล้วและแน่ใจว่าต้องการลบ",
                  },
                  {
                    key: "authorized",
                    text: "ฉันเป็น Developer และมีสิทธิ์ลบข้อมูลนี้",
                  },
                ].map(({ key, text }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={confirmations[key]}
                      onChange={(e) =>
                        updateConfirmation(key, e.target.checked)
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{text}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Delete Button */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedBookings.size > 0 && (
                <div>
                  <div>เลือกแล้ว {selectedBookings.size} รายการ</div>
                  <div className="text-xs text-gray-500">
                    {Object.entries(serviceTypes)
                      .map(([key, type]) => {
                        const count = Array.from(selectedBookings).filter((k) =>
                          k.startsWith(`${key}_`)
                        ).length;
                        return count > 0 ? `${type.label}: ${count}` : "";
                      })
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {deleteProgress && (
                <span className="px-3 py-2 text-sm text-green-600 bg-green-50 rounded">
                  {deleteProgress}
                </span>
              )}

              <button
                onClick={deleteBookings}
                disabled={!canDelete() || loading}
                className={`px-6 py-2 rounded-md flex items-center gap-2 font-medium ${
                  canDelete() && !loading
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                <FiTrash2 />
                {loading
                  ? "กำลังลบ..."
                  : `ลบถาวร ${selectedBookings.size} รายการ`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDeleteTool;
