import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ShoppingCart,
  FileText,
  RefreshCcw,
  Database,
  File,
  ChevronsRight,
  ChevronsLeft,
  ChevronRight,
  Search,
  BarChart,
  LogOut,
  Eye,
  User,
  Shield,
  Activity,
  Users,
} from "lucide-react";
import { useAuth } from "../../pages/Login/AuthContext";
import logoImage from "../../assets/Logo.png";

const Sidebar = ({ collapsed, setCollapsed }) => {
  const [activeMenu, setActiveMenu] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuData = [
    {
      id: 0,
      title: "Overview",
      icon: <Activity size={18} />,
      path: "/overview",
      submenu: [],
    },
    {
      id: 1,
      title: "Sales",
      icon: <ShoppingCart size={18} />,
      path: "/sale/ticket",
      submenu: [
        { id: "1.1", title: "Sale Ticket", path: "/sale/ticket" },
        { id: "1.2", title: "Sale Deposit", path: "/sale/deposit" },
        { id: "1.3", title: "Sale Voucher", path: "/sale/voucher" },
        { id: "1.4", title: "Sale Other", path: "/sale/other" },
      ],
    },
    {
      id: 2,
      title: "View",
      icon: <Eye size={18} />,
      path: "/view/flight-tickets",
      submenu: [
        { id: "2.1", title: "Flight Tickets", path: "/view/flight-tickets" },
        { id: "2.2", title: "Bus, Boat, Tour", path: "/view/bus-boat-tour" },
        { id: "2.3", title: "Other Services", path: "/view/other-services" },
      ],
    },
    {
      id: 6,
      title: "Invoice & Receipt",
      icon: <File size={18} />,
      path: "/documents/invoice-list",
      submenu: [
        { id: "6.1", title: "Invoice List", path: "/documents/invoice-list" },
        { id: "6.2", title: "Receipt List", path: "/documents/receipt-list" },
        { id: "6.3", title: "Deposit List", path: "/documents/deposit-list" },
        { id: "6.4", title: "Voucher List", path: "/documents/voucher-list" },
      ],
    },
    {
      id: 3,
      title: "Reports",
      icon: <BarChart size={18} />,
      path: "/reports/all-invoice",
      submenu: [
        {
          id: "3.2",
          title: "ลูกหนี้คงค้าง",
          path: "/reports/outstanding-receivables",
        },
        { id: "3.1", title: "All Report", path: "/reports/all-invoice" },
      ],
    },
    {
      id: 4,
      title: "Refund",
      icon: <RefreshCcw size={18} />,
      path: "/refund",
      disabled: true,
      submenu: [
        { id: "4.1", title: "Create Refund", path: "/refund/create" },
        { id: "4.2", title: "Refund Report", path: "/refund/report" },
      ],
    },
    {
      id: 5,
      title: "Information",
      icon: <Database size={18} />,
      path: "/information",
      submenu: [],
    },

    {
      id: 7,
      title: "Admin",
      icon: <Shield size={18} />,
      path: "/admin/activity-log",
      submenu: [
        // { id: "7.1", title: "Activity Log", path: "/admin/activity-log" },
        { id: "7.2", title: "User Management", path: "/user-management" },
      ],
      showOnlyForRoles: ["admin"], // เพิ่มเงื่อนไขนี้
    },
  ];

  const toggleMenu = (menuId) => {
    setActiveMenu(activeMenu === menuId ? null : menuId);
  };

  const handleSubmenuClick = (path) => {
    navigate(path);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getInitials = (fullname) => {
    if (!fullname) return "N/A";
    return fullname.charAt(0);
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "manager":
        return "Manager";
      case "viewer":
        return "Viewer";
      default:
        return "Unknown";
    }
  };

  return (
    <div
      className={`h-screen fixed top-0 left-0 bg-white shadow-lg flex flex-col transition-all duration-300 ease-in-out z-10 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo Section */}
      <div className="flex items-center p-4 border-b border-gray-100">
        {!collapsed && (
          <div className="flex items-center">
            <img
              src={logoImage}
              alt="SamuiLookBooking"
              className="w-8 h-8 object-contain"
            />
            <div className="ml-3 font-semibold text-gray-800 transition-opacity duration-300">
              SamuiLookBooking
            </div>
          </div>
        )}
        <button
          className={`${
            collapsed ? "mx-auto" : "ml-auto"
          } bg-transparent border-0 cursor-pointer text-gray-500 hover:text-gray-700 focus:outline-none transition-transform duration-300 hover:scale-110`}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
        </button>
      </div>

      {/* Menu Section */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-gray-200">
        {menuData
          .filter(
            (menu) => menu.id !== 7 || (menu.id === 7 && user?.role === "admin")
          )
          .map((menu) => (
            <div key={menu.id} className="mb-1 px-3">
              <div
                className={`flex items-center px-3 py-2 cursor-pointer rounded-md transition-all duration-200 group ${
                  menu.disabled ? "opacity-50 cursor-not-allowed" : ""
                } ${
                  location.pathname === menu.path ||
                  menu.submenu.some(
                    (submenu) => location.pathname === submenu.path
                  )
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() =>
                  menu.disabled
                    ? null
                    : menu.submenu.length > 0
                    ? toggleMenu(menu.id)
                    : navigate(menu.path)
                }
              >
                <span
                  className={`${
                    location.pathname === menu.path ||
                    menu.submenu.some(
                      (submenu) => location.pathname === submenu.path
                    )
                      ? "text-blue-500"
                      : "text-gray-500"
                  } transition-transform duration-200 ${
                    location.pathname === menu.path ||
                    menu.submenu.some(
                      (submenu) => location.pathname === submenu.path
                    )
                      ? "scale-110"
                      : ""
                  }`}
                >
                  {menu.icon}
                </span>
                {!collapsed && (
                  <>
                    <span className="flex-1 ml-3 text-sm font-medium">
                      {menu.title}
                    </span>
                    {menu.submenu.length > 0 && (
                      <span
                        className={`text-gray-400 transition-transform duration-300 ease-in-out ${
                          activeMenu === menu.id ? "rotate-90" : ""
                        }`}
                      >
                        <ChevronRight size={14} />
                      </span>
                    )}
                  </>
                )}
                {collapsed && menu.submenu.length > 0 && !menu.disabled && (
                  <div className="absolute left-full ml-2 bg-white rounded-md shadow-lg p-2 w-48 z-10 hidden group-hover:block opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out">
                    <div className="text-sm font-medium text-gray-800 mb-2">
                      {menu.title}
                    </div>
                    {menu.submenu.map((submenu) => (
                      <div
                        key={submenu.id}
                        className={`py-1 px-2 text-sm rounded-md transition-colors duration-200 ${
                          submenu.disabled
                            ? "opacity-50 cursor-not-allowed text-gray-400"
                            : "cursor-pointer hover:bg-gray-50 text-gray-600"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!submenu.disabled) {
                            handleSubmenuClick(submenu.path);
                          }
                        }}
                      >
                        {submenu.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!collapsed &&
                activeMenu === menu.id &&
                menu.submenu.length > 0 && (
                  <div
                    className="pl-9 pr-3 mt-1 mb-2 overflow-hidden transition-all duration-300 ease-in-out"
                    style={{
                      maxHeight: "500px",
                      animation: "slideDown 0.3s ease-in-out",
                    }}
                  >
                    {menu.submenu.map((submenu, index) => (
                      <div
                        key={submenu.id}
                        className={`py-2 px-2 text-xs rounded-md transition-all duration-200 ease-in-out ${
                          submenu.disabled
                            ? "opacity-50 cursor-not-allowed text-gray-400"
                            : location.pathname === submenu.path
                            ? "bg-blue-50 text-blue-600 font-medium cursor-pointer"
                            : "text-gray-600 hover:bg-gray-50 cursor-pointer"
                        }`}
                        onClick={() => {
                          if (!submenu.disabled) {
                            handleSubmenuClick(submenu.path);
                          }
                        }}
                        style={{
                          animationDelay: `${index * 0.05}s`,
                          animation: "fadeInLeft 0.2s ease-in-out forwards",
                          opacity: 0,
                          transform: "translateX(-10px)",
                        }}
                      >
                        {submenu.title}
                      </div>
                    ))}
                  </div>
                )}
            </div>
          ))}
      </div>

      {/* User Profile Section */}
      <div className="px-3 pt-1 pb-3 border-t border-gray-100">
        {!collapsed ? (
          <div className="bg-blue-50 rounded-md p-3 mb-3 flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center mr-2 flex-shrink-0">
              <span className="text-sm font-medium">
                {getInitials(user?.fullname)}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-blue-700 truncate">
                {user?.fullname || "N/A"}
              </div>
              <div className="text-xs text-blue-600">
                {getRoleDisplayName(user?.role)}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center">
              <span className="text-sm font-medium">
                {getInitials(user?.fullname)}
              </span>
            </div>
          </div>
        )}

        <div
          className="flex items-center px-3 py-2 cursor-pointer rounded-md text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200 ease-in-out"
          onClick={handleLogout}
        >
          <span className="text-gray-500 transition-transform duration-200">
            <LogOut size={18} />
          </span>
          {!collapsed && (
            <span className="ml-3 text-sm font-medium">Logout</span>
          )}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes slideDown {
          from {
            max-height: 0;
          }
          to {
            max-height: 500px;
          }
        }

        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Sidebar;
