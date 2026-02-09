import React, { useState } from "react";
import {
  FiMenu,
  FiX,
  FiShoppingCart,
  FiSearch,
  FiBarChart2,
  FiRefreshCw,
  FiInfo,
  FiFileText,
  FiSettings,
  FiUser,
  FiLogOut,
} from "react-icons/fi";
import SaleModule from "../modules/Sale/SaleModule";

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeModule, setActiveModule] = useState("sale");
  const [expandedMenus, setExpandedMenus] = useState({
    sale: true,
  });

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleSubmenu = (menu) => {
    setExpandedMenus({
      ...expandedMenus,
      [menu]: !expandedMenus[menu],
    });
  };

  const renderContent = () => {
    switch (activeModule) {
      case "sale":
        return <SaleModule />;
      case "search":
        return <div className="p-6">Search Module Content</div>;
      case "reports":
        return <div className="p-6">Reports Module Content</div>;
      case "refund":
        return <div className="p-6">Refund Module Content</div>;
      case "information":
        return <div className="p-6">Information Module Content</div>;
      case "documents":
        return <div className="p-6">Documents Module Content</div>;
      case "settings":
        return <div className="p-6">Settings Module Content</div>;
      case "profile":
        return <div className="p-6">User Profile Content</div>;
      default:
        return <div className="p-6">Select a module from the sidebar</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`bg-blue-800 text-white ${
          isSidebarOpen ? "w-64" : "w-20"
        } transition-all duration-300 ease-in-out flex flex-col`}
      >
        <div className="p-4 flex items-center justify-between border-b border-blue-700">
          <h1 className={`font-bold text-xl ${!isSidebarOpen && "hidden"}`}>
            SamuiLookBooking
          </h1>
          <button
            onClick={toggleSidebar}
            className="text-white focus:outline-none"
          >
            {isSidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        <div className="overflow-y-auto flex-grow">
          <nav className="mt-2">
            {/* Sale Menu */}
            <div>
              <button
                onClick={() => {
                  toggleSubmenu("sale");
                  setActiveModule("sale");
                }}
                className={`w-full flex items-center p-3 hover:bg-blue-700 ${
                  expandedMenus.sale ? "bg-blue-700" : ""
                }`}
              >
                <FiShoppingCart className="mr-4" size={20} />
                {isSidebarOpen && (
                  <div className="flex justify-between items-center w-full">
                    <span>Sale / ระบบขาย</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 transition-transform ${
                        expandedMenus.sale ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                )}
              </button>

              {expandedMenus.sale && isSidebarOpen && (
                <div className="bg-blue-900">
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    Sale Ticket (ขายตั๋วเครื่องบิน)
                  </a>
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    Sale Deposit (วางมัดจำ)
                  </a>
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    Sale Voucher (บัส/เรือ/ทัวร์)
                  </a>
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    Sale Other (ประกัน/โรงแรม/รถไฟ/วีซ่า/อื่นๆ)
                  </a>
                </div>
              )}
            </div>

            {/* Search Menu */}
            <div>
              <button
                onClick={() => {
                  toggleSubmenu("search");
                  setActiveModule("search");
                }}
                className={`w-full flex items-center p-3 hover:bg-blue-700 ${
                  expandedMenus.search ? "bg-blue-700" : ""
                }`}
              >
                <FiSearch className="mr-4" size={20} />
                {isSidebarOpen && (
                  <div className="flex justify-between items-center w-full">
                    <span>Search / ค้นหาข้อมูล</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 transition-transform ${
                        expandedMenus.search ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                )}
              </button>

              {expandedMenus.search && isSidebarOpen && (
                <div className="bg-blue-900">
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    ค้นหาตามวันที่ขาย
                  </a>
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    ค้นหาตามเลขที่เอกสาร
                  </a>
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    ค้นหาตามชื่อผู้โดยสาร
                  </a>
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    ค้นหาตามเลขที่ไอดี
                  </a>
                </div>
              )}
            </div>

            {/* Reports Menu */}
            <div>
              <button
                onClick={() => {
                  toggleSubmenu("reports");
                  setActiveModule("reports");
                }}
                className={`w-full flex items-center p-3 hover:bg-blue-700 ${
                  expandedMenus.reports ? "bg-blue-700" : ""
                }`}
              >
                <FiBarChart2 className="mr-4" size={20} />
                {isSidebarOpen && (
                  <div className="flex justify-between items-center w-full">
                    <span>Reports / รายงาน</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 transition-transform ${
                        expandedMenus.reports ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                )}
              </button>

              {expandedMenus.reports && isSidebarOpen && (
                <div className="bg-blue-900">
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    Sales Report
                  </a>
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    Deposit Report
                  </a>
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    Billing Report
                  </a>
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    Revenue Report
                  </a>
                </div>
              )}
            </div>

            {/* Refund Menu */}
            <div>
              <button
                onClick={() => {
                  toggleSubmenu("refund");
                  setActiveModule("refund");
                }}
                className={`w-full flex items-center p-3 hover:bg-blue-700 ${
                  expandedMenus.refund ? "bg-blue-700" : ""
                }`}
              >
                <FiRefreshCw className="mr-4" size={20} />
                {isSidebarOpen && (
                  <div className="flex justify-between items-center w-full">
                    <span>Refund / การคืนเงิน</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 transition-transform ${
                        expandedMenus.refund ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                )}
              </button>

              {expandedMenus.refund && isSidebarOpen && (
                <div className="bg-blue-900">
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    Create Refund
                  </a>
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    Refund Report
                  </a>
                </div>
              )}
            </div>

            {/* Information Menu */}
            <div>
              <button
                onClick={() => {
                  setActiveModule("information");
                }}
                className={`w-full flex items-center p-3 hover:bg-blue-700 ${
                  activeModule === "information" ? "bg-blue-700" : ""
                }`}
              >
                <FiInfo className="mr-4" size={20} />
                {isSidebarOpen && <span>Information</span>}
              </button>
            </div>

            {/* Documents Menu */}
            <div>
              <button
                onClick={() => {
                  toggleSubmenu("documents");
                  setActiveModule("documents");
                }}
                className={`w-full flex items-center p-3 hover:bg-blue-700 ${
                  expandedMenus.documents ? "bg-blue-700" : ""
                }`}
              >
                <FiFileText className="mr-4" size={20} />
                {isSidebarOpen && (
                  <div className="flex justify-between items-center w-full">
                    <span>Documents / เอกสาร</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 transition-transform ${
                        expandedMenus.documents ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                )}
              </button>

              {expandedMenus.documents && isSidebarOpen && (
                <div className="bg-blue-900">
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    Invoice List
                  </a>
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    Receipt List
                  </a>
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    Deposit List
                  </a>
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    Voucher List
                  </a>
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    Refund
                  </a>
                </div>
              )}
            </div>

            {/* Settings Menu */}
            <div>
              <button
                onClick={() => {
                  toggleSubmenu("settings");
                  setActiveModule("settings");
                }}
                className={`w-full flex items-center p-3 hover:bg-blue-700 ${
                  expandedMenus.settings ? "bg-blue-700" : ""
                }`}
              >
                <FiSettings className="mr-4" size={20} />
                {isSidebarOpen && (
                  <div className="flex justify-between items-center w-full">
                    <span>Settings / ตั้งค่า</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 transition-transform ${
                        expandedMenus.settings ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                )}
              </button>

              {expandedMenus.settings && isSidebarOpen && (
                <div className="bg-blue-900">
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    User Management
                  </a>
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    Company Profile
                  </a>
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    Email Templates
                  </a>
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    Document Templates
                  </a>
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    System Settings
                  </a>
                </div>
              )}
            </div>

            {/* User Profile Menu */}
            <div>
              <button
                onClick={() => {
                  toggleSubmenu("profile");
                  setActiveModule("profile");
                }}
                className={`w-full flex items-center p-3 hover:bg-blue-700 ${
                  expandedMenus.profile ? "bg-blue-700" : ""
                }`}
              >
                <FiUser className="mr-4" size={20} />
                {isSidebarOpen && (
                  <div className="flex justify-between items-center w-full">
                    <span>User Profile / โปรไฟล์ผู้ใช้</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 transition-transform ${
                        expandedMenus.profile ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                )}
              </button>

              {expandedMenus.profile && isSidebarOpen && (
                <div className="bg-blue-900">
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    My Account
                  </a>
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    Change Password
                  </a>
                  <a
                    href="#"
                    className="block py-2 px-4 pl-12 hover:bg-blue-800"
                  >
                    Logout
                  </a>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-blue-700 mt-auto">
          <button className="flex items-center text-white hover:text-blue-200 w-full">
            <FiLogOut className="mr-4" size={20} />
            {isSidebarOpen && <span>Logout / ออกจากระบบ</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="p-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">
              SamuiLookBooking System
            </h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Admin User</span>
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                <FiUser />
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-gray-100">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
