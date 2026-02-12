import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import Overview from "./pages/Overview";
import SaleModule from "./pages/Sales";
import Documents from "./pages/Documents/components/DocumentsModule";
import Information from "./pages/Information";
import UserManagement from "./pages/UserManagement";
import Login from "./pages/Login";
import ActivityLog from "./pages/Admin/ActivityLog";
import PrivateRoute from "./pages/Login/PrivateRoute";
import { AuthProvider } from "./pages/Login/AuthContext";
import { AlertDialogProvider } from "./contexts/AlertDialogContext";
import AdminDeleteTool from "./pages/Admin/AdminDeleteTool";
import AllInvoiceReport from "./pages/Reports/AllInvoiceReport";
import OutstandingReceivablesReport from "./pages/Reports/OutstandingReceivablesReport";

const App = () => {
  const [collapsed, setCollapsed] = useState(false);

  // Global Handler สำหรับแปลงข้อมูลเป็นตัวใหญ่
  useEffect(() => {
    // ฟิลด์ที่ไม่ต้องการให้เป็นตัวใหญ่
    const excludeFields = [
      "email",
      "password",
      "confirmPassword",
      "phone",
      "contactDetails",
      "address",
      "remarks",
      "username",
      "fullname",
      "search", // เพิ่ม search ที่สำคัญ!
      "searchTerm", // เพิ่ม searchTerm
      "q", // เพิ่ม query parameters ทั่วไป
      "query",
      "passenger", // ✅ เพิ่มบรรทัดนี้
      "passengerName", // ✅ เพิ่มบรรทัดนี้
    ];

    const handleInputChange = (event) => {
      const input = event.target;

      // ตรวจสอบว่าเป็น input หรือ textarea เท่านั้น (ข้าม select)
      if (!["INPUT", "TEXTAREA"].includes(input.tagName)) return;

      // ตรวจสอบ type ของ input
      if (
        [
          "email",
          "password",
          "tel",
          "number",
          "date",
          "time",
          "search",
        ].includes(
          // เพิ่ม "search"
          input.type
        )
      )
        return;

      // ตรวจสอบว่าอยู่ในหน้า Login หรือ User Management หรือไม่
      const currentPath = window.location.pathname;
      if (
        currentPath === "/login" ||
        currentPath.includes("/user-management") ||
        currentPath.includes("/admin/") ||
        currentPath.includes("/information") // เพิ่มหน้า Information
      ) {
        return; // ข้ามการแปลงตัวใหญ่สำหรับหน้าเหล่านี้
      }

      // ตรวจสอบ name หรือ class ที่ไม่ต้องการ
      const inputName = input.name || "";
      const inputClass = input.className || "";
      const inputPlaceholder = input.placeholder || "";

      // ข้ามฟิลด์ที่ไม่ต้องการแปลง
      if (
        excludeFields.some(
          (field) =>
            inputName.toLowerCase().includes(field.toLowerCase()) ||
            inputClass.toLowerCase().includes(field.toLowerCase()) ||
            inputPlaceholder.toLowerCase().includes(field.toLowerCase()) // เพิ่มการเช็ค placeholder
        )
      )
        return;

      // ข้ามถ้ามี class ที่บอกว่าไม่ต้องแปลง
      if (
        inputClass.includes("no-uppercase") ||
        inputClass.includes("inputNoUppercase") ||
        inputClass.includes("login-input") ||
        inputClass.includes("user-management-input") ||
        inputClass.includes("email") ||
        inputClass.includes("search") ||
        inputPlaceholder.toLowerCase().includes("ค้นหา") ||
        inputPlaceholder.toLowerCase().includes("search")
      )
        return;

      // ข้ามถ้า input อยู่ใน container ที่มี class login, user-management, หรือ information
      const specialContainer = input.closest(
        ".login-container, .user-management-container, .information-table, .information-form, .information-modal"
      );
      if (specialContainer) return;

      if (input.type === "radio" || input.type === "checkbox") return;
      // แปลงเป็นตัวใหญ่ (เฉพาะฟิลด์ที่ผ่านการกรองแล้ว)
      const cursorPosition = input.selectionStart;
      const uppercaseValue = input.value.toUpperCase();

      if (input.value !== uppercaseValue) {
        input.value = uppercaseValue;

        // ตรวจสอบว่า element รองรับ setSelectionRange
        if (typeof input.setSelectionRange === "function") {
          input.setSelectionRange(cursorPosition, cursorPosition);
        }

        // สร้าง event ใหม่เพื่อให้ React รับรู้การเปลี่ยนแปลง
        const event = new Event("input", { bubbles: true });
        input.dispatchEvent(event);
      }
    };

    // เพิ่ม event listener
    document.addEventListener("input", handleInputChange);

    // ทำความสะอาดเมื่อ component unmount
    return () => {
      document.removeEventListener("input", handleInputChange);
    };
  }, []);

  return (
    <AuthProvider>
      <AlertDialogProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected routes */}
            <Route element={<PrivateRoute />}>
              <Route
                path="*"
                element={
                  <div className="flex h-screen bg-gray-100">
                    <Sidebar
                      collapsed={collapsed}
                      setCollapsed={setCollapsed}
                    />
                    <div
                      className={`transition-all duration-300 flex-1 ${
                        collapsed ? "ml-16" : "ml-64"
                      } overflow-auto`}
                    >
                      <Routes>
                        <Route path="/" element={<Overview />} />
                        <Route path="/overview" element={<Overview />} />
                        <Route
                          path="/sale/ticket"
                          element={<SaleModule activeSubmenu="1.1" />}
                        />
                        <Route
                          path="/sale/deposit"
                          element={<SaleModule activeSubmenu="1.2" />}
                        />
                        <Route
                          path="/sale/voucher"
                          element={<SaleModule activeSubmenu="1.3" />}
                        />
                        <Route
                          path="/sale/other"
                          element={<SaleModule activeSubmenu="1.4" />}
                        />
                        <Route
                          path="/documents/invoice-list"
                          element={<Documents activeSubmenu="6.1" />}
                        />
                        <Route
                          path="/documents/receipt-list"
                          element={<Documents activeSubmenu="6.2" />}
                        />
                        <Route
                          path="/documents/deposit-list"
                          element={<Documents activeSubmenu="6.3" />}
                        />
                        <Route
                          path="/documents/voucher-list"
                          element={<Documents activeSubmenu="6.4" />}
                        />
                        <Route path="/information" element={<Information />} />

                        {/* Admin-only routes */}
                        <Route element={<PrivateRoute requiredRole="admin" />}>
                          <Route
                            path="/user-management"
                            element={<UserManagement />}
                          />
                          <Route
                            path="/admin/activity-log"
                            element={<ActivityLog />}
                          />
                          <Route
                            path="/admin/delete-tool"
                            element={<AdminDeleteTool />}
                          />
                        </Route>

                        <Route
                          path="/search"
                          element={
                            <div className="p-6">
                              <h1 className="text-2xl font-bold mb-4">
                                Search Module
                              </h1>
                              <p>ค้นหาข้อมูลตามเงื่อนไขต่างๆ</p>
                            </div>
                          }
                        />
                        <Route
                          path="/reports/all-invoice"
                          element={<AllInvoiceReport />}
                        />
                        <Route
                          path="/reports/outstanding-receivables"
                          element={<OutstandingReceivablesReport />}
                        />
                        <Route
                          path="/refund"
                          element={
                            <div className="p-6">
                              <h1 className="text-2xl font-bold mb-4">
                                Refund Module
                              </h1>
                              <p>จัดการการคืนเงิน</p>
                            </div>
                          }
                        />
                      </Routes>
                    </div>
                  </div>
                }
              />
            </Route>
          </Routes>
        </Router>
      </AlertDialogProvider>
    </AuthProvider>
  );
};

export default App;
