// src/pages/UserManagement/UserPermissionsTable.jsx
import React from "react";
import { CheckCircle, XCircle } from "lucide-react";

const UserPermissionsTable = ({ role = "viewer" }) => {
  // ข้อมูลโมดูลต่างๆ ในระบบ
  const modulePermissions = [
    { id: "sale", name: "Sale / ระบบขาย" },
    { id: "view", name: "View / ดูข้อมูล" },
    { id: "reports", name: "Reports / รายงาน" },
    { id: "refund", name: "Refund / การคืนเงิน" },
    { id: "information", name: "Information / ข้อมูล" },
    { id: "documents", name: "Documents / เอกสาร" },
    { id: "admin", name: "Admin / ผู้ดูแลระบบ" },
  ];

  // ฟังก์ชันตรวจสอบสิทธิ์การเข้าถึง
  const checkPermission = (moduleId, action) => {
    // Admin มีสิทธิ์ทุกอย่าง
    if (role === "admin") {
      return true;
    }

    // Manager มีข้อจำกัดบางอย่าง
    if (role === "manager") {
      // ไม่สามารถเข้าถึง Reports ทั้งหมด
      if (moduleId === "reports") {
        return false;
      }

      // ไม่สามารถเข้าถึง Admin ทั้งหมด
      if (moduleId === "admin") {
        return false;
      }

      // สำหรับ Refund ทำได้แค่ดูและสร้าง
      if (moduleId === "refund" && (action === "edit" || action === "delete")) {
        return false;
      }

      // ส่วนที่เหลือทำได้ทั้งหมด
      return true;
    }

    // Viewer มีสิทธิ์เฉพาะบางโมดูล
    if (role === "viewer") {
      // สำหรับ Sale และ Information ทำได้ทุกอย่างยกเว้นลบ
      if (moduleId === "sale" || moduleId === "information") {
        return action !== "delete";
      }

      // สำหรับโมดูลอื่นๆ ทำได้แค่ดูอย่างเดียว
      return action === "view";
    }

    return false;
  };

  return (
    <div className="mt-6">
      <h4 className="text-lg font-medium text-gray-900 mb-3">ข้อมูลสิทธิ์</h4>
      <div className="border rounded-md overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h5 className="text-sm font-medium text-gray-900">
            สิทธิ์การเข้าถึงแต่ละโมดูล
          </h5>
        </div>
        <div className="p-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  โมดูล
                </th>
                <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ดู
                </th>
                <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  สร้าง
                </th>
                <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  แก้ไข
                </th>
                <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ลบ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modulePermissions.map((module) => (
                <tr key={module.id}>
                  <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                    {module.name}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-center">
                    {checkPermission(module.id, "view") ? (
                      <CheckCircle
                        size={16}
                        className="mx-auto text-green-500"
                      />
                    ) : (
                      <XCircle size={16} className="mx-auto text-red-500" />
                    )}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-center">
                    {checkPermission(module.id, "create") ? (
                      <CheckCircle
                        size={16}
                        className="mx-auto text-green-500"
                      />
                    ) : (
                      <XCircle size={16} className="mx-auto text-red-500" />
                    )}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-center">
                    {checkPermission(module.id, "edit") ? (
                      <CheckCircle
                        size={16}
                        className="mx-auto text-green-500"
                      />
                    ) : (
                      <XCircle size={16} className="mx-auto text-red-500" />
                    )}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-center">
                    {checkPermission(module.id, "delete") ? (
                      <CheckCircle
                        size={16}
                        className="mx-auto text-green-500"
                      />
                    ) : (
                      <XCircle size={16} className="mx-auto text-red-500" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserPermissionsTable;
