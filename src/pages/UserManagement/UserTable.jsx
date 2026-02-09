import React from "react";
import {
  User,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  ChevronsUpDown,
  Shield,
  Key,
} from "lucide-react";

const UserTable = ({
  users,
  searchTerm,
  setSearchTerm,
  filterRole,
  setFilterRole,
  filterStatus,
  setFilterStatus,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  sortField,
  setSortField,
  sortDirection,
  setSortDirection,
  loading,
  error,
  roleOptions,
  currentLoggedUser, // รับ currentLoggedUser ผ่าน props
  canManageUser,
  canEditPassword,
  canDeleteUser,
  openAddModal,
  openEditModal,
  openChangePasswordModal,
  handleDeleteUser,
}) => {
  const getFilteredUsers = () => {
    let filteredUsers = [...users];

    if (searchTerm) {
      filteredUsers = filteredUsers.filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterRole !== "all") {
      filteredUsers = filteredUsers.filter((user) => user.role === filterRole);
    }

    if (filterStatus !== "all") {
      filteredUsers = filteredUsers.filter(
        (user) => user.active === (filterStatus === "active")
      );
    }

    filteredUsers.sort((a, b) => {
      const fieldA = a[sortField] || "";
      const fieldB = b[sortField] || "";
      if (sortField === "last_login") {
        return sortDirection === "asc"
          ? new Date(fieldA || 0) - new Date(fieldB || 0)
          : new Date(fieldB || 0) - new Date(fieldA || 0);
      }
      if (fieldA < fieldB) return sortDirection === "asc" ? -1 : 1;
      if (fieldA > fieldB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filteredUsers;
  };

  const filteredUsers = getFilteredUsers();
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getRoleName = (roleId) => {
    const role = roleOptions.find((role) => role.id === roleId);
    return role ? role.name : roleId;
  };

  const getUserStatusBadge = (active) => (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
      }`}
    >
      {active ? (
        <>
          <CheckCircle className="w-3 h-3 mr-1" /> ใช้งาน
        </>
      ) : (
        <>
          <XCircle className="w-3 h-3 mr-1" /> ปิดใช้งาน
        </>
      )}
    </span>
  );

  const getRoleColorClass = (role) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "manager":
        return "bg-blue-100 text-blue-800";
      case "viewer":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-white rounded-t-lg shadow-sm p-4 mb-4">
        <h1 className="text-xl font-bold">User Management / จัดการผู้ใช้งาน</h1>
        <p className="text-sm opacity-80">
          จัดการรายชื่อผู้ใช้งานและกำหนดสิทธิ์การเข้าถึงระบบ
        </p>
      </div>

      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex flex-1 items-center">
            <div className="relative w-full md:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="ค้นหาตาม Username, ชื่อ, อีเมล"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative">
              <select
                className="appearance-none w-full border border-gray-300 rounded-lg py-2 pl-3 pr-10 focus:ring-blue-500 focus:border-blue-500"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="all">ทุกตำแหน่ง</option>
                {roleOptions.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <Filter size={18} className="text-gray-400" />
              </div>
            </div>
            <div className="relative">
              <select
                className="appearance-none w-full border border-gray-300 rounded-lg py-2 pl-3 pr-10 focus:ring-blue-500 focus:border-blue-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">ทุกสถานะ</option>
                <option value="active">ใช้งาน</option>
                <option value="inactive">ปิดใช้งาน</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <Filter size={18} className="text-gray-400" />
              </div>
            </div>
            <button
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={openAddModal}
              disabled={!canManageUser()}
            >
              <Plus size={16} className="mr-2" />
              เพิ่มผู้ใช้
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mx-4 mb-4 rounded flex items-start">
          <XCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("username")}
              >
                <div className="flex items-center">
                  <span>Username</span>
                  <ChevronsUpDown size={14} className="ml-1" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("fullname")}
              >
                <div className="flex items-center">
                  <span>ชื่อ-นามสกุล</span>
                  <ChevronsUpDown size={14} className="ml-1" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("email")}
              >
                <div className="flex items-center">
                  <span>อีเมล</span>
                  <ChevronsUpDown size={14} className="ml-1" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("role")}
              >
                <div className="flex items-center">
                  <span>ตำแหน่ง</span>
                  <ChevronsUpDown size={14} className="ml-1" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("active")}
              >
                <div className="flex items-center">
                  <span>สถานะ</span>
                  <ChevronsUpDown size={14} className="ml-1" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("last_login")}
              >
                <div className="flex items-center">
                  <span>เข้าสู่ระบบล่าสุด</span>
                  <ChevronsUpDown size={14} className="ml-1" />
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                การจัดการ
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-4 py-4 text-center text-gray-500">
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
            ) : currentUsers.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-4 text-center text-gray-500">
                  ไม่พบข้อมูลผู้ใช้
                </td>
              </tr>
            ) : (
              currentUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.username}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {user.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.fullname}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColorClass(
                        user.role
                      )}`}
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      {getRoleName(user.role)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {getUserStatusBadge(user.active)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleString("th-TH")
                        : "ยังไม่เคยเข้าสู่ระบบ"}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        className="text-yellow-600 hover:text-yellow-900"
                        onClick={() => openChangePasswordModal(user)}
                        disabled={!canEditPassword()}
                        title="เปลี่ยนรหัสผ่าน"
                      >
                        <Key size={16} />
                      </button>
                      <button
                        className="text-blue-600 hover:text-blue-900"
                        onClick={() => openEditModal(user)}
                        disabled={!canManageUser()}
                        title="แก้ไข"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDeleteUser(user)}
                        disabled={
                          !canDeleteUser() || user.id === currentLoggedUser?.id
                        } // ใช้ currentLoggedUser จาก props
                        title="ลบ"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && totalPages > 1 && (
        <div className="px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  แสดง{" "}
                  <span className="font-medium">{indexOfFirstItem + 1}</span>{" "}
                  ถึง{" "}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredUsers.length)}
                  </span>{" "}
                  จากทั้งหมด{" "}
                  <span className="font-medium">{filteredUsers.length}</span>{" "}
                  รายการ
                </p>
              </div>
              <div>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    ‹
                  </button>
                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPage(index + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border ${
                        currentPage === index + 1
                          ? "bg-blue-50 border-blue-500 text-blue-600 z-10"
                          : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
                      } text-sm font-medium`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    Last
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTable;
