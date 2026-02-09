import React, { useState, useEffect } from "react";
import { Search, Plus, Filter, ChevronLeft, ChevronRight } from "lucide-react";
// 🔄 MIGRATION: แทนที่ Supabase ด้วย service functions
import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deactivateItem,
} from "./services/informationService";
import {
  getCustomers,
  createCustomer,
  updateCustomer,
} from "../../services/customerService";
import {
  getCities,
  createCity,
  updateCity,
  deleteCity,
} from "../../services/cityService";
import DataTable from "./components/DataTable";
import AddEditForm from "./components/AddEditForm";

const Information = () => {
  const [categories] = useState([
    { id: "supplier", label: "Supplier" },
    { id: "customer", label: "Customer" },
    { id: "city", label: "City" },
  ]);

  // เพิ่ม supplier types สำหรับ filter
  const [supplierTypes] = useState([
    { value: "all", label: "ทั้งหมด" },
    { value: "Airline", label: "Airline" },
    // ✅ Removed "Voucher" - merged into "Other" (2026-01-09)
    { value: "Other", label: "Other" },
  ]);

  const [selectedCategory, setSelectedCategory] = useState("supplier");
  const [informationData, setInformationData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    name: "",
    code: "",
    numeric_code: "",
    email: "",
    address_line1: "",
    address_line2: "",
    address_line3: "",
    id_number: "",
    phone: "",
    branch_type: "Head Office",
    branch_number: "",
    credit_days: 0,
    type: "",
    city_code: "",
    city_name: "",
  });
  const [addingNew, setAddingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");

  // เพิ่ม state สำหรับ pagination และ filter
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedSupplierType, setSelectedSupplierType] = useState("all");

  useEffect(() => {
    if (selectedCategory === "customer") {
      loadCustomerData();
    } else if (selectedCategory === "city") {
      loadCityData();
    } else {
      loadInformationData();
    }
  }, [
    selectedCategory,
    currentPage,
    selectedSupplierType,
    searchTerm,
    sortField,
    sortDirection,
  ]);

  // 🔄 MIGRATED: loadInformationData ใช้ informationService
  const loadInformationData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Map supplier type filter to categories
      // ✅ Updated: removed "supplier-voucher" - merged into "supplier-other" (2026-01-09)
      let categories = ["airline", "supplier-other"];

      if (selectedSupplierType !== "all") {
        // Filter by specific supplier type
        if (selectedSupplierType === "Airline") {
          categories = ["airline"];
        } else if (selectedSupplierType === "Other") {
          categories = ["supplier-other"];
        }
        // Note: "Voucher" type removed - all voucher suppliers are now "Other"
      }

      // เรียกใช้ informationService แทน Supabase
      const result = await fetchSuppliers(categories, searchTerm, true);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Sort data ใน frontend (เนื่องจาก API Gateway อาจไม่รองรับ complex sorting)
      let sortedData = [...(result.data || [])];
      sortedData.sort((a, b) => {
        let aValue = a[sortField] || "";
        let bValue = b[sortField] || "";

        if (sortDirection === "asc") {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      });

      // Manual pagination (เนื่องจาก API Gateway ยังไม่รองรับ pagination)
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedData = sortedData.slice(startIndex, endIndex);

      setInformationData(paginatedData);
      setTotalItems(sortedData.length);
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔄 MIGRATED: loadCustomerData ใช้ customerService
  const loadCustomerData = async () => {
    setLoading(true);
    setError(null);
    try {
      // เรียกใช้ customerService แทน Supabase
      const customers = await getCustomers(searchTerm, 1000); // Get all customers first

      if (!customers || !Array.isArray(customers)) {
        throw new Error("ไม่สามารถโหลดข้อมูลลูกค้าได้");
      }

      // Sort data ใน frontend
      let sortedData = [...customers];
      sortedData.sort((a, b) => {
        let aValue = a[sortField] || "";
        let bValue = b[sortField] || "";

        if (sortDirection === "asc") {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      });

      // Manual pagination
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedData = sortedData.slice(startIndex, endIndex);

      setInformationData(paginatedData);
      setTotalItems(sortedData.length);
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูลลูกค้า: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 loadCityData ใช้ cityService
  const loadCityData = async () => {
    setLoading(true);
    setError(null);
    try {
      // เรียกใช้ cityService
      const cities = await getCities(searchTerm, 1000); // Get all cities first

      if (!cities || !Array.isArray(cities)) {
        throw new Error("ไม่สามารถโหลดข้อมูลเมืองได้");
      }

      // Sort data ใน frontend
      let sortedData = [...cities];
      sortedData.sort((a, b) => {
        let aValue = a[sortField] || "";
        let bValue = b[sortField] || "";

        if (sortDirection === "asc") {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      });

      // Manual pagination
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedData = sortedData.slice(startIndex, endIndex);

      setInformationData(paginatedData);
      setTotalItems(sortedData.length);
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูลเมือง: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setEditingItem(null);
    setAddingNew(false);
    setSearchTerm("");
    setCurrentPage(1);
    setSelectedSupplierType("all");
  };

  const handleSupplierTypeChange = (type) => {
    setSelectedSupplierType(type);
    setCurrentPage(1);
  };

  const handleSearchChange = (term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  // คำนวณจำนวนหน้าทั้งหมด
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // สร้างอาร์เรย์ของหมายเลขหน้า
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
      } else if (currentPage >= totalPages - 2) {
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
          pages.push(i);
        }
      }
    }

    return pages;
  };

  const handleEditItem = (item) => {
    setEditingItem({ ...item });
    setAddingNew(false);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  const handleInputChange = (e, type) => {
    const { name, value } = e.target;

    if (type === "edit") {
      const updatedItem = { ...editingItem };

      if (name === "code" && selectedCategory === "customer") {
        updatedItem[name] = value.toUpperCase().substring(0, 5);
      } else if (name === "city_code" && selectedCategory === "city") {
        updatedItem[name] = value.toUpperCase().substring(0, 3);
      } else if (name === "numeric_code") {
        updatedItem[name] = value.replace(/\D/g, "").substring(0, 3);
      } else if (name === "branch_type" && value === "Head Office") {
        updatedItem[name] = value;
        updatedItem.branch_number = "";
      } else {
        updatedItem[name] = value;
      }

      setEditingItem(updatedItem);
    } else {
      const updatedItem = { ...newItem };

      if (name === "code" && selectedCategory === "customer") {
        updatedItem[name] = value.toUpperCase().substring(0, 5);
      } else if (name === "city_code" && selectedCategory === "city") {
        updatedItem[name] = value.toUpperCase().substring(0, 3);
      } else if (name === "numeric_code") {
        updatedItem[name] = value.replace(/\D/g, "").substring(0, 3);
      } else if (name === "branch_type" && value === "Head Office") {
        updatedItem[name] = value;
        updatedItem.branch_number = "";
      } else {
        updatedItem[name] = value;
      }

      setNewItem(updatedItem);
    }
  };

  // 🔄 MIGRATED: handleSaveEdit ใช้ service functions
  const handleSaveEdit = async () => {
    if (selectedCategory === "city") {
      // City validation
      if (!editingItem.city_code || !editingItem.city_code.trim()) {
        alert("กรุณากรอกรหัสเมือง");
        return;
      }

      if (editingItem.city_code.length !== 3) {
        alert("รหัสเมืองต้องเป็น 3 ตัวอักษรเท่านั้น");
        return;
      }

      if (!editingItem.city_name || !editingItem.city_name.trim()) {
        alert("กรุณากรอกชื่อเมือง");
        return;
      }

      try {
        const result = await updateCity(editingItem.city_id, {
          city_code: editingItem.city_code.toUpperCase(),
          city_name: editingItem.city_name,
        });

        if (!result.success) {
          alert(result.error || "เกิดข้อผิดพลาดในการบันทึก");
          throw new Error(result.error);
        }

        await loadCityData();
        setEditingItem(null);
      } catch (err) {
        setError("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
      }
    } else if (selectedCategory === "customer") {
      if (!editingItem.name.trim()) {
        alert("กรุณากรอกชื่อลูกค้า");
        return;
      }

      if (!editingItem.address_line1 || !editingItem.address_line1.trim()) {
        alert("กรุณากรอกที่อยู่บรรทัดที่ 1");
        return;
      }

      if (
        editingItem.code &&
        (editingItem.code.length < 3 || editingItem.code.length > 5)
      ) {
        alert("รหัสลูกค้าต้องเป็นตัวอักษร 3-5 ตัว");
        return;
      }

      if (editingItem.branch_type === "Branch" && !editingItem.branch_number) {
        alert("กรุณากรอกหมายเลขสาขา (ต้องเป็นตัวเลข 4 หลัก)");
        return;
      }

      if (editingItem.email && editingItem.email.trim() !== "") {
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        if (!emailRegex.test(editingItem.email)) {
          alert("รูปแบบอีเมลไม่ถูกต้อง");
          return;
        }
      }

      try {
        // 🔄 ใช้ updateCustomer แทน Supabase
        const result = await updateCustomer(editingItem.id, {
          name: editingItem.name,
          code: editingItem.code,
          email: editingItem.email,
          address_line1: editingItem.address_line1,
          address_line2: editingItem.address_line2,
          address_line3: editingItem.address_line3,
          id_number: editingItem.id_number || null,
          phone: editingItem.phone,
          branch_type: editingItem.branch_type || "Head Office",
          branch_number:
            editingItem.branch_type === "Branch"
              ? editingItem.branch_number
              : null,
          credit_days: editingItem.credit_days || 0,
        });

        if (!result.success) {
          // แสดง error message โดยตรงใน alert
          alert(result.error || "เกิดข้อผิดพลาดในการบันทึก");

          // ถ้าเป็น error เรื่องรหัสซ้ำ ให้รีเฟรชหน้าจอ
          if (result.error && result.error.includes("รหัสลูกค้านี้มีอยู่ในระบบแล้ว")) {
            window.location.reload();
          }
          throw new Error(result.error);
        }

        await loadCustomerData();
        setEditingItem(null);
      } catch (err) {
        setError("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
      }
    } else {
      // Supplier edit
      if (
        !editingItem.code.trim() ||
        !editingItem.name.trim() ||
        !editingItem.type
      ) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
      }

      if (editingItem.numeric_code && editingItem.numeric_code.length !== 3) {
        alert("รหัสตัวเลขต้องเป็นตัวเลข 3 ตัว");
        return;
      }

      try {
        // 🔄 ใช้ updateSupplier แทน Supabase
        const result = await updateSupplier(editingItem.id, {
          type: editingItem.type,
          code: editingItem.code,
          name: editingItem.name,
          numeric_code: editingItem.numeric_code || null,
        });

        if (!result.success) {
          throw new Error(result.error);
        }

        await loadInformationData();
        setEditingItem(null);
      } catch (err) {
        setError("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
      }
    }
  };

  const handleAddNew = () => {
    setAddingNew(true);
    setEditingItem(null);
    setNewItem({
      name: "",
      code: "",
      numeric_code: "",
      email: "",
      address_line1: "",
      address_line2: "",
      address_line3: "",
      id_number: "",
      phone: "",
      branch_type: "Head Office",
      branch_number: "",
      credit_days: 0,
      type: "",
      city_code: "",
      city_name: "",
    });
  };

  const handleCancelAdd = () => {
    setAddingNew(false);
  };

  // 🔄 MIGRATED: handleSaveNew ใช้ service functions
  const handleSaveNew = async () => {
    if (selectedCategory === "city") {
      // City validation
      if (!newItem.city_code || !newItem.city_code.trim()) {
        alert("กรุณากรอกรหัสเมือง");
        return;
      }

      if (newItem.city_code.length !== 3) {
        alert("รหัสเมืองต้องเป็น 3 ตัวอักษรเท่านั้น");
        return;
      }

      if (!newItem.city_name || !newItem.city_name.trim()) {
        alert("กรุณากรอกชื่อเมือง");
        return;
      }

      try {
        const result = await createCity({
          city_code: newItem.city_code.toUpperCase(),
          city_name: newItem.city_name,
        });

        if (!result.success) {
          alert(result.error || "เกิดข้อผิดพลาดในการเพิ่มข้อมูล");
          throw new Error(result.error);
        }

        await loadCityData();
        setAddingNew(false);
        setNewItem({
          name: "",
          code: "",
          numeric_code: "",
          email: "",
          address_line1: "",
          address_line2: "",
          address_line3: "",
          id_number: "",
          phone: "",
          branch_type: "Head Office",
          branch_number: "",
          credit_days: 0,
          type: "",
          city_code: "",
          city_name: "",
        });
      } catch (err) {
        setError("เกิดข้อผิดพลาดในการเพิ่มข้อมูลเมือง: " + err.message);
      }
    } else if (selectedCategory === "customer") {
      if (!newItem.name.trim()) {
        alert("กรุณากรอกชื่อลูกค้า");
        return;
      }

      if (!newItem.address_line1 || !newItem.address_line1.trim()) {
        alert("กรุณากรอกที่อยู่บรรทัดที่ 1");
        return;
      }

      if (
        newItem.code &&
        (newItem.code.length < 3 || newItem.code.length > 5)
      ) {
        alert("รหัสลูกค้าต้องเป็นตัวอักษร 3-5 ตัว");
        return;
      }

      if (newItem.branch_type === "Branch" && !newItem.branch_number) {
        alert("กรุณากรอกหมายเลขสาขา (ต้องเป็นตัวเลข 4 หลัก)");
        return;
      }

      if (newItem.email && newItem.email.trim() !== "") {
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        if (!emailRegex.test(newItem.email)) {
          alert("รูปแบบอีเมลไม่ถูกต้อง");
          return;
        }
      }

      try {
        // 🔄 ใช้ createCustomer แทน Supabase
        const result = await createCustomer({
          name: newItem.name,
          code: newItem.code,
          email: newItem.email,
          address_line1: newItem.address_line1,
          address_line2: newItem.address_line2,
          address_line3: newItem.address_line3,
          id_number: newItem.id_number || null,
          phone: newItem.phone,
          branch_type: newItem.branch_type || "Head Office",
          branch_number:
            newItem.branch_type === "Branch" ? newItem.branch_number : null,
          credit_days: newItem.credit_days || 0,
        });

        if (!result.success) {
          // แสดง error message โดยตรงใน alert
          alert(result.error || "เกิดข้อผิดพลาดในการเพิ่มข้อมูล");

          // ถ้าเป็น error เรื่องรหัสซ้ำ ให้รีเฟรชหน้าจอ
          if (result.error && result.error.includes("รหัสลูกค้านี้มีอยู่ในระบบแล้ว")) {
            window.location.reload();
          }
          throw new Error(result.error);
        }

        await loadCustomerData();
        setAddingNew(false);
        setNewItem({
          name: "",
          code: "",
          numeric_code: "",
          email: "",
          address_line1: "",
          address_line2: "",
          address_line3: "",
          id_number: "",
          phone: "",
          branch_type: "Head Office",
          branch_number: "",
          credit_days: 0,
        });
      } catch (err) {
        setError("เกิดข้อผิดพลาดในการเพิ่มข้อมูล: " + err.message);
      }
    } else {
      // Supplier create
      if (!newItem.code.trim() || !newItem.name.trim() || !newItem.type) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
      }

      if (newItem.numeric_code && newItem.numeric_code.length !== 3) {
        alert("รหัสตัวเลขต้องเป็นตัวเลข 3 ตัว");
        return;
      }

      try {
        // 🔄 ใช้ createSupplier แทน Supabase
        const result = await createSupplier({
          type: newItem.type,
          code: newItem.code,
          name: newItem.name,
          numeric_code: newItem.numeric_code || null,
        });

        if (!result.success) {
          throw new Error(result.error);
        }

        await loadInformationData();
        setAddingNew(false);
        setNewItem({ code: "", name: "", type: "", numeric_code: "" });
      } catch (err) {
        setError("เกิดข้อผิดพลาดในการเพิ่มข้อมุล: " + err.message);
      }
    }
  };

  // 🔄 MIGRATED: handleDeactivate ใช้ service functions
  const handleDeactivate = async (id) => {
    let confirmText = "คุณต้องการยกเลิกการใช้งานข้อมูลนี้ใช่หรือไม่?";

    if (selectedCategory === "customer") {
      confirmText = "คุณต้องการยกเลิกการใช้งานข้อมูลลูกค้านี้ใช่หรือไม่?";
    } else if (selectedCategory === "city") {
      confirmText = "คุณต้องการลบข้อมูลเมืองนี้ใช่หรือไม่? (ข้อมูลจะถูกลบถาวร)";
    }

    if (window.confirm(confirmText)) {
      try {
        let result;

        if (selectedCategory === "city") {
          // City uses hard delete
          result = await deleteCity(id);
        } else {
          // Customer and Supplier use soft delete
          const table = selectedCategory === "customer" ? "customers" : "information";
          result = await deactivateItem(table, id);
        }

        if (!result.success) {
          throw new Error(result.error);
        }

        // Reload data based on category
        if (selectedCategory === "customer") {
          await loadCustomerData();
        } else if (selectedCategory === "city") {
          await loadCityData();
        } else {
          await loadInformationData();
        }
      } catch (err) {
        setError("เกิดข้อผิดพลาดในการยกเลิกรายการ: " + err.message);
      }
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <style>
        {`
    .table-customer {
      width: 100%;
    }
    .table-customer th, .table-customer td {
      padding-left: 0.75rem;
      padding-right: 0.75rem;
      padding-top: 0.5rem;
      padding-bottom: 0.5rem;
      white-space: normal;
      overflow: hidden;
    }
    .table-customer th:nth-child(1), .table-customer td:nth-child(1) {
      max-width: 80px;
    }
    .table-customer th:nth-child(2), .table-customer td:nth-child(2) {
      max-width: 200px;
    }
    .table-customer th:nth-child(3), .table-customer td:nth-child(3) {
      max-width: 100px;
    }
    .table-customer th:nth-child(4), .table-customer td:nth-child(4) {
      max-width: 80px;
    }
    .table-customer th:nth-child(5), .table-customer td:nth-child(5) {
      max-width: 80px;
    }
  `}
      </style>
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-white rounded-t-lg shadow-sm p-4 mb-4">
            <h1 className="text-xl font-bold">Information / ข้อมูล</h1>
            <p className="text-sm opacity-80">
              จัดการข้อมูล Supplier, Customer, Type ที่ใช้ในระบบ
            </p>
          </div>

          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-1/4 bg-gray-50 p-4 border-r border-gray-200">
              <h2 className="text-lg font-semibold mb-4">ประเภทข้อมูล</h2>
              <ul className="space-y-2">
                {categories.map((category) => (
                  <li key={category.id}>
                    <button
                      className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                        selectedCategory === category.id
                          ? "bg-blue-500 text-white"
                          : "hover:bg-gray-200"
                      }`}
                      onClick={() => handleCategoryChange(category.id)}
                    >
                      {category.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="w-full md:w-3/4 p-4">
              <div className="flex flex-col gap-4 mb-4">
                {/* Header และปุ่มเพิ่มข้อมูล */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-xl font-semibold">
                    {
                      categories.find((cat) => cat.id === selectedCategory)
                        ?.label
                    }
                  </h2>
                  <button
                    onClick={handleAddNew}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md flex items-center"
                    disabled={addingNew}
                  >
                    <Plus size={18} className="mr-1" />
                    เพิ่มข้อมูลใหม่
                  </button>
                </div>

                {/* แถบค้นหาและ filter */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* ช่องค้นหา */}
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="ค้นหา..."
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                    />
                  </div>

                  {/* Filter สำหรับ Supplier */}
                  {selectedCategory === "supplier" && (
                    <div className="flex items-center gap-2">
                      <Filter size={16} className="text-gray-400" />
                      <select
                        value={selectedSupplierType}
                        onChange={(e) =>
                          handleSupplierTypeChange(e.target.value)
                        }
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        {supplierTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* แสดงจำนวนข้อมูลและหน้าปัจจุบัน */}
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <div>
                    แสดง {(currentPage - 1) * itemsPerPage + 1} -{" "}
                    {Math.min(currentPage * itemsPerPage, totalItems)} จาก{" "}
                    {totalItems} รายการ
                    {selectedCategory === "supplier" &&
                      selectedSupplierType !== "all" && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          ประเภท:{" "}
                          {
                            supplierTypes.find(
                              (t) => t.value === selectedSupplierType
                            )?.label
                          }
                        </span>
                      )}
                  </div>
                  <div>
                    หน้า {currentPage} จาก {totalPages}
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-6">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent"></div>
                  <p className="mt-2 text-gray-600">กำลังโหลดข้อมูล...</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  {error}
                </div>
              ) : (
                <>
                  {addingNew && (
                    <AddEditForm
                      selectedCategory={selectedCategory}
                      newItem={newItem}
                      handleInputChange={handleInputChange}
                      handleCancelAdd={handleCancelAdd}
                      handleSaveNew={handleSaveNew}
                    />
                  )}

                  <DataTable
                    data={informationData}
                    selectedCategory={selectedCategory}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    handleSort={handleSort}
                    handleEditItem={handleEditItem}
                    handleDeactivate={handleDeactivate}
                    editingItem={editingItem}
                    handleInputChange={handleInputChange}
                    handleCancelEdit={handleCancelEdit}
                    handleSaveEdit={handleSaveEdit}
                    loadCityData={loadCityData}
                  />

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center mt-6 gap-2">
                      {/* ปุ่มหน้าก่อนหน้า */}
                      <button
                        onClick={() =>
                          setCurrentPage(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                        className={`p-2 rounded-md ${
                          currentPage === 1
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                        }`}
                      >
                        <ChevronLeft size={16} />
                      </button>

                      {/* หมายเลขหน้า */}
                      {getPageNumbers().map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 rounded-md ${
                            currentPage === pageNum
                              ? "bg-blue-500 text-white"
                              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}

                      {/* ปุ่มหน้าถัดไป */}
                      <button
                        onClick={() =>
                          setCurrentPage(Math.min(totalPages, currentPage + 1))
                        }
                        disabled={currentPage === totalPages}
                        className={`p-2 rounded-md ${
                          currentPage === totalPages
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                        }`}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Information;
