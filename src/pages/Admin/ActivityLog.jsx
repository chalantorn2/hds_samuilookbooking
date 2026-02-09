import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  User,
  Activity,
  AlertCircle,
  Plus,
  Edit,
  Trash,
  Eye,
  FileText,
  Mail,
  Printer,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import DateRangeSelector from "../View/common/DateRangeSelector";
import { displayThaiDateTime } from "../../utils/helpers";
import { getActivityLogs } from "../../services/activityLogService";

const ActivityLog = () => {
  // Get current month range
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

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(dateRange.start);
  const [endDate, setEndDate] = useState(dateRange.end);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filterMainMenu, setFilterMainMenu] = useState("all"); // Menu หลัก
  const [filterSubMenu, setFilterSubMenu] = useState("all"); // Sub-menu
  const [filterAction, setFilterAction] = useState("all");
  const [filterUser, setFilterUser] = useState("all");

  // Main Menu options (เมนูหลัก - ตาม Sidebar)
  const mainMenuOptions = [
    { id: "all", name: "ทั้งหมด" },
    { id: "sales", name: "Sales" },
    { id: "view", name: "View" },
    { id: "invoice_receipt", name: "Invoice & Receipt" },
  ];

  // Sub-menu options (เมนูย่อยตาม Main Menu - ตาม Sidebar)
  const getSubMenuOptions = (mainMenu) => {
    const subMenuMap = {
      all: [{ id: "all", name: "ทั้งหมด" }],
      sales: [
        { id: "all", name: "ทั้งหมด" },
        { id: "sale_ticket", name: "Sale Ticket", module: "ticket" },
        { id: "sale_deposit", name: "Sale Deposit", module: "deposit" },
        { id: "sale_voucher", name: "Sale Voucher", module: "voucher" },
        { id: "sale_other", name: "Sale Other", module: "other" },
      ],
      view: [
        { id: "all", name: "ทั้งหมด" },
        { id: "flight_tickets", name: "Flight Tickets", module: "ticket" },
        { id: "bus_boat_tour", name: "Bus, Boat, Tour", module: "voucher" },
        { id: "other_services", name: "Other Services", module: "other" },
      ],
      invoice_receipt: [
        { id: "all", name: "ทั้งหมด" },
        { id: "invoice_list", name: "Invoice List", module: "ticket" },
        { id: "receipt_list", name: "Receipt List", module: "ticket" },
        { id: "deposit_list", name: "Deposit List", module: "deposit" },
        { id: "voucher_list", name: "Voucher List", module: "voucher" },
      ],
    };
    return subMenuMap[mainMenu] || [{ id: "all", name: "ทั้งหมด" }];
  };

  // Module mapping for backend filter
  const getModuleFilter = () => {
    if (filterMainMenu === "all" && filterSubMenu === "all") {
      return "all";
    }

    const subMenuOptions = getSubMenuOptions(filterMainMenu);
    const selectedSubMenu = subMenuOptions.find((s) => s.id === filterSubMenu);

    return selectedSubMenu?.module || "all";
  };

  // Action options
  const actionOptions = [
    { id: "all", name: "ทั้งหมด" },
    { id: "create", name: "สร้าง", color: "text-green-600" },
    { id: "update", name: "แก้ไข", color: "text-blue-600" },
    { id: "cancel", name: "ยกเลิก", color: "text-red-600" },
    { id: "issue", name: "ออกเอกสาร", color: "text-purple-600" },
    { id: "print", name: "พิมพ์", color: "text-gray-600" },
    { id: "email", name: "ส่งอีเมล", color: "text-indigo-600" },
  ];

  // Fetch activity logs
  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getActivityLogs({
        startDate,
        endDate,
        searchTerm,
        filterModule: getModuleFilter(), // ใช้ getModuleFilter()
        filterAction,
        filterUser,
        sortField,
        sortDirection,
      });

      if (response.success) {
        setActivities(response.data || []);
      } else {
        setError(response.error || "ไม่สามารถโหลดข้อมูลได้");
      }
    } catch (err) {
      console.error("Error fetching activity logs:", err);
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentActivities = activities.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(activities.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Sort handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get menu display name (เมนูย่อย)
  const getMenuDisplayName = (module) => {
    const menuMap = {
      ticket: "Sale Ticket",
      deposit: "Sale Deposit",
      voucher: "Sale Voucher",
      other: "Sale Other",
      invoice: "Invoice",
      receipt: "Receipt",
    };
    return menuMap[module] || module;
  };

  // Get action icon
  const getActionIcon = (action) => {
    switch (action) {
      case "create":
        return <Plus size={16} className="text-green-500" />;
      case "update":
        return <Edit size={16} className="text-blue-500" />;
      case "cancel":
        return <Trash size={16} className="text-red-500" />;
      case "issue":
        return <FileText size={16} className="text-purple-500" />;
      case "print":
        return <Printer size={16} className="text-gray-500" />;
      case "email":
        return <Mail size={16} className="text-indigo-500" />;
      default:
        return <Activity size={16} className="text-gray-500" />;
    }
  };

  // Reset sub-menu when main menu changes
  useEffect(() => {
    setFilterSubMenu("all");
  }, [filterMainMenu]);

  // Fetch on mount and filter changes
  useEffect(() => {
    if (!searchTerm) {
      fetchActivityLogs();
    }
  }, [
    startDate,
    endDate,
    filterMainMenu,
    filterSubMenu,
    filterAction,
    filterUser,
    sortField,
    sortDirection,
  ]);

  // Debounced search
  useEffect(() => {
    if (searchTerm) {
      const timeoutId = setTimeout(() => {
        fetchActivityLogs();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm]);

  if (loading && activities.length === 0) {
    return (
      <div className="bg-gray-100 min-h-screen p-4 flex items-center justify-center">
        <div className="text-gray-600">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  if (error && activities.length === 0) {
    return (
      <div className="bg-gray-100 min-h-screen p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="text-red-500 mr-2" size={20} />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-t-lg shadow-sm p-4 mb-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-800 flex items-center">
                <Activity size={20} className="mr-2" />
                Activity Log
              </h1>
              <p className="text-sm text-gray-500">
                บันทึกการทำงานของผู้ใช้ในระบบ
              </p>
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
        />

        {/* Filters */}
        <div className="bg-white p-4 mb-2 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Main Menu Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                เมนูหลัก
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                value={filterMainMenu}
                onChange={(e) => setFilterMainMenu(e.target.value)}
              >
                {mainMenuOptions.map((menu) => (
                  <option key={menu.id} value={menu.id}>
                    {menu.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sub-menu Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                เมนูย่อย
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                value={filterSubMenu}
                onChange={(e) => setFilterSubMenu(e.target.value)}
                disabled={filterMainMenu === "all"}
              >
                {getSubMenuOptions(filterMainMenu).map((subMenu) => (
                  <option key={subMenu.id} value={subMenu.id}>
                    {subMenu.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
              >
                {actionOptions.map((action) => (
                  <option key={action.id} value={action.id}>
                    {action.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white shadow-sm rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center">
                      <span>วันที่-เวลา</span>
                      <ChevronsUpDown size={14} className="ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("username")}
                  >
                    <div className="flex items-center">
                      <span>ผู้ใช้งาน</span>
                      <ChevronsUpDown size={14} className="ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("module")}
                  >
                    <div className="flex items-center">
                      <span>เมนู</span>
                      <ChevronsUpDown size={14} className="ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("action")}
                  >
                    <div className="flex items-center">
                      <span>Action</span>
                      <ChevronsUpDown size={14} className="ml-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Reference
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-4 py-4 text-center text-gray-500"
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
                ) : currentActivities.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-4 py-4 text-center text-gray-500"
                    >
                      ไม่พบข้อมูลกิจกรรม
                    </td>
                  </tr>
                ) : (
                  currentActivities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Clock size={16} className="text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">
                            {displayThaiDateTime(activity.created_at)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="ml-2">
                            <div className="text-sm font-medium text-gray-900">
                              {activity.username || "N/A"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getMenuDisplayName(activity.module)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getActionIcon(activity.action)}
                          <span
                            className={`ml-2 text-sm ${
                              actionOptions.find(
                                (a) => a.id === activity.action
                              )?.color || ""
                            }`}
                          >
                            {actionOptions.find((a) => a.id === activity.action)
                              ?.name || activity.action}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {activity.reference_number || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
                      {Math.min(indexOfLastItem, activities.length)}
                    </span>{" "}
                    จากทั้งหมด{" "}
                    <span className="font-medium">{activities.length}</span>{" "}
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
    </div>
  );
};

export default ActivityLog;
