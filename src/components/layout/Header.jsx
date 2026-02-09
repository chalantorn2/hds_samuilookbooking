import React from "react";
import { User, Bell, ChevronDown, Settings, LogOut } from "lucide-react";

const Header = () => {
  // ข้อมูลผู้ใช้งานปัจจุบัน (ในระบบจริงควรดึงจาก Context หรือ Redux)
  const currentUser = {
    name: "ชลันธร มานพ",
    role: "Manager",
    avatar: null, // สามารถใส่ URL รูปภาพได้
  };

  // สร้างอักษรย่อจากชื่อสำหรับกรณีไม่มีรูปภาพ
  const getInitials = (name) => {
    const nameParts = name.split(" ");
    if (nameParts.length >= 2) {
      return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-800">
            SamuiLookBooking System
          </h2>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="p-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-600 focus:outline-none">
            <Bell size={20} />
          </button>

          {/* User Dropdown */}
          <div className="relative group">
            <button className="flex items-center space-x-3 focus:outline-none">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium text-sm border border-gray-200">
                  {getInitials(currentUser.name)}
                </div>
              )}
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-gray-700">
                  {currentUser.name}
                </div>
                <div className="text-xs text-gray-500">{currentUser.role}</div>
              </div>
              <ChevronDown size={16} className="text-gray-500" />
            </button>

            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
              <a
                href="#settings"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 items-center"
              >
                <Settings size={16} className="mr-3 text-gray-500" />
                Account Settings
              </a>
              <a
                href="/login"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 items-center"
              >
                <LogOut size={16} className="mr-3 text-gray-500" />
                Sign out
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
