import React, { useState, useEffect } from "react";
import { useAuth } from "../../pages/Login/AuthContext";
import {
  fetchAllUsers,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
} from "../../pages/Login/authService";
import { validatePassword } from "../../pages/Login/passwordUtils";
import { useNotification } from "../../hooks/useNotification.jsx";
import { useAlertDialogContext } from "../../contexts/AlertDialogContext";
import UserTable from "./UserTable";
import AddUserModal from "./AddUserModal";
import EditUserModal from "./EditUserModal";
import ChangePasswordModal from "./ChangePasswordModal";

const UserManagement = () => {
  const { user: currentLoggedUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const showAlert = useAlertDialogContext();

  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState("username");
  const [sortDirection, setSortDirection] = useState("asc");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] =
    useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const roleOptions = [
    { id: "admin", name: "Admin", description: "สามารถทำงานได้ทุกอย่างในระบบ" },
    {
      id: "manager",
      name: "Manager",
      description: "ดู แก้ไข ลบข้อมูลได้ (ยกเว้นจัดการ User)",
    },
    { id: "viewer", name: "Viewer", description: "ดูข้อมูลได้อย่างเดียว" },
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await fetchAllUsers();
      if (error) throw new Error(error);
      setUsers(data || []);
    } catch (err) {
      console.error("Error loading users:", err);
      setError("ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (userData) => {
    setError(null);
    setLoading(true);

    if (
      !userData.username ||
      !userData.fullname ||
      !userData.email ||
      !userData.password
    ) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      setLoading(false);
      return false;
    }

    const { isValid, errors } = validatePassword(
      userData.password,
      userData.confirmPassword
    );
    if (!isValid) {
      setError(errors.password || errors.confirmPassword);
      setLoading(false);
      return false;
    }

    try {
      const result = await createUser({
        username: userData.username,
        password: userData.password,
        fullname: userData.fullname,
        email: userData.email,
        role: userData.role,
        active: userData.active,
      });

      if (!result.success) {
        throw new Error(result.error || "ไม่สามารถเพิ่มผู้ใช้ได้");
      }

      await loadUsers();
      showSuccess("เพิ่มผู้ใช้เรียบร้อย");
      return true;
    } catch (err) {
      console.error("Error adding user:", err);
      setError(err.message || "เกิดข้อผิดพลาดในการเพิ่มผู้ใช้");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (userData) => {
    setError(null);
    setLoading(true);

    try {
      const result = await updateUser(userData.id, {
        fullname: userData.fullname,
        email: userData.email,
        role: userData.role,
        active: userData.active,
      });

      if (!result.success) {
        throw new Error(result.error || "ไม่สามารถแก้ไขผู้ใช้ได้");
      }

      await loadUsers();
      showSuccess("แก้ไขผู้ใช้เรียบร้อย");
      return true;
    } catch (err) {
      console.error("Error editing user:", err);
      setError(err.message || "เกิดข้อผิดพลาดในการแก้ไขผู้ใช้");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (userId, newPassword, confirmPassword) => {
    setError(null);
    setLoading(true);

    if (!canEditPassword()) {
      setError("คุณไม่มีสิทธิ์เปลี่ยนรหัสผ่าน");
      setLoading(false);
      return false;
    }

    const { isValid, errors } = validatePassword(newPassword, confirmPassword);
    if (!isValid) {
      setError(errors.password || errors.confirmPassword);
      setLoading(false);
      return false;
    }

    try {
      const result = await changePassword(userId, newPassword);
      if (!result.success) {
        throw new Error(result.error || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
      }

      showSuccess("เปลี่ยนรหัสผ่านเรียบร้อย");
      return true;
    } catch (err) {
      console.error("Error changing password:", err);
      setError(err.message || "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!canDeleteUser()) {
      showError("คุณไม่มีสิทธิ์ลบผู้ใช้");
      return;
    }

    if (user.id === currentLoggedUser.id) {
      showError("คุณไม่สามารถลบบัญชีของตัวเองได้");
      return;
    }

    const confirmed = await showAlert({
      title: "ยืนยันการลบผู้ใช้",
      description: `คุณต้องการลบผู้ใช้ ${user.username} ใช่หรือไม่?`,
      confirmText: "ยืนยันการลบ",
      cancelText: "ยกเลิก",
      actionVariant: "destructive",
    });

    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const result = await deleteUser(user.id, false);
      if (!result.success) {
        throw new Error(result.error || "ไม่สามารถลบผู้ใช้ได้");
      }

      await loadUsers();
      showSuccess("ลบผู้ใช้เรียบร้อย");
    } catch (err) {
      console.error("Error deleting user:", err);
      setError(err.message || "เกิดข้อผิดพลาดในการลบผู้ใช้");
    } finally {
      setLoading(false);
    }
  };

  const canManageUser = () => currentLoggedUser.role === "admin";
  const canEditPassword = () => currentLoggedUser.role === "admin";
  const canDeleteUser = () => currentLoggedUser.role === "admin";

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <UserTable
          users={users}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterRole={filterRole}
          setFilterRole={setFilterRole}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          itemsPerPage={itemsPerPage}
          sortField={sortField}
          setSortField={setSortField}
          sortDirection={sortDirection}
          setSortDirection={setSortDirection}
          loading={loading}
          error={error}
          roleOptions={roleOptions}
          currentLoggedUser={currentLoggedUser} // ส่ง currentLoggedUser ผ่าน props
          canManageUser={canManageUser}
          canEditPassword={canEditPassword}
          canDeleteUser={canDeleteUser}
          openAddModal={() => setIsAddModalOpen(true)}
          openEditModal={(user) => {
            setCurrentUser(user);
            setIsEditModalOpen(true);
          }}
          openChangePasswordModal={(user) => {
            setCurrentUser(user);
            setIsChangePasswordModalOpen(true);
          }}
          handleDeleteUser={handleDeleteUser}
        />
        {isAddModalOpen && (
          <AddUserModal
            onClose={() => setIsAddModalOpen(false)}
            onSave={handleAddUser}
            roleOptions={roleOptions}
            loading={loading}
            error={error}
          />
        )}
        {isEditModalOpen && currentUser && (
          <EditUserModal
            user={currentUser}
            onClose={() => {
              setIsEditModalOpen(false);
              setCurrentUser(null);
            }}
            onSave={handleEditUser}
            roleOptions={roleOptions}
            loading={loading}
            error={error}
          />
        )}
        {isChangePasswordModalOpen && currentUser && (
          <ChangePasswordModal
            user={currentUser}
            onClose={() => {
              setIsChangePasswordModalOpen(false);
              setCurrentUser(null);
            }}
            onSave={handleChangePassword}
            loading={loading}
            error={error}
          />
        )}
      </div>
    </div>
  );
};

export default UserManagement;
