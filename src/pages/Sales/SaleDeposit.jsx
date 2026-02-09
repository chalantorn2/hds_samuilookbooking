import React, { useState, useEffect } from "react";
import { FiSave } from "react-icons/fi";
import SaleHeader from "./common/SaleHeader";
import DepositPaymentSection from "./deposit/DepositPaymentSection";
import PricingTable from "./common/PricingTable";
import SupplierSection from "./common/SupplierSection";
import DepositTypeSection from "./deposit/DepositTypeSection";
import DepositTermsSection from "./deposit/DepositTermsSection";
import DepositPricingSection from "./deposit/DepositPricingSection";
import RouteSection from "./ticket/RouteSection";
import ExtrasSection from "./ticket/ExtrasSection";
import usePricing from "../../hooks/usePricing";
import { searchSupplierByCode } from "../../services/supplierService";
import { useAuth } from "../../pages/Login/AuthContext";
import { getCustomers, createCustomer } from "../../services/customerService";
import { getLocalDateString } from "../../utils/helpers";
import {
  createDeposit,
  getDepositSuppliers,
} from "../../services/depositService";

const SaleDeposit = () => {
  const [formData, setFormData] = useState({
    customer: "",
    customerCode: "",
    contactDetails: "",
    phone: "",
    id: "",
    branchType: "Head Office",
    branchNumber: "",
    date: getLocalDateString(), // ใช้ local timezone แทน UTC
    creditDays: "0",
    dueDate: "",
    salesName: "",
    depositNo: "DP-" + new Date().getFullYear() + "001",
    reference: "",
    supplier: "",
    supplierName: " ",
    depositType: "",
    otherTypeDescription: "",
    groupName: "",
    description: "",
    depositDueDate: "",
    secondDepositDueDate: "",
    passengerInfoDueDate: "",
    fullPaymentDueDate: "",
    vatPercent: "0",
    depositTotal: 0,
    companyPayments: Array.from({ length: 5 }, () => ({ amount: '', date: '', by: '' })),
    customerPayments: Array.from({ length: 5 }, () => ({ amount: '', date: '', by: '' })),
  });

  const {
    pricing,
    vatPercent,
    setVatPercent,
    updatePricing,
    calculateSubtotal,
    calculateVat,
    calculateTotal,
  } = usePricing();

  const [depositAmount, setDepositAmount] = useState(0);
  const [depositPax, setDepositPax] = useState(1);
  const [depositAmount2, setDepositAmount2] = useState(0);
  const [depositPax2, setDepositPax2] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [globalEditMode, setGlobalEditMode] = useState(false);
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [suppliers, setSuppliers] = useState([]);

  const [routes, setRoutes] = useState([
    {
      id: 1,
      date: "",
      flight: "",
      rbd: "",
      origin: "",
      destination: "",
      departure: "",
      arrival: "",
    },
  ]);

  const [extras, setExtras] = useState([
    {
      id: 1,
      description: "",
      net_price: "",
      sale_price: "",
      quantity: 1,
      total_amount: "",
    },
  ]);

  const handleSupplierSearch = async (searchTerm) => {
    try {
      const supplier = await searchSupplierByCode(searchTerm);
      if (supplier) {
        setFormData((prev) => ({
          ...prev,
          supplier: supplier.code,
          supplierName: supplier.name,
          supplierId: supplier.id,
          supplierNumericCode: supplier.numeric_code || "",
        }));
      }
    } catch (error) {
      console.error("Supplier search error:", error);
    }
  };

  useEffect(() => {
    setVatPercent(0);
  }, [setVatPercent]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setValidationErrors({});

    try {
      // Simple validation
      const errors = {};

      if (!formData.customer || formData.customer.trim() === "") {
        errors.customer = "กรุณากรอกชื่อลูกค้า";
      }

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        alert("กรุณาตรวจสอบข้อมูลที่กรอก");
        setLoading(false);
        return;
      }

      // Get current user info
      let userId = currentUser?.id;
      let customerId = selectedCustomer?.id;

      // 🔍 DEBUG: Log customer data before creation
      console.log("🔍 DEBUG - Before customer creation:");
      console.log("  selectedCustomer:", selectedCustomer);
      console.log("  customerId:", customerId);
      console.log("  formData.customer:", formData.customer);
      console.log("  formData.customerCode:", formData.customerCode);
      console.log("  formData.branchType:", formData.branchType);
      console.log("  formData.branchNumber:", formData.branchNumber);

      // Handle customer creation if needed
      if (!customerId && formData.customer) {
        console.log("✅ Creating new customer...");
        console.log("  Customer data:", {
          name: formData.customer,
          code: formData.customerCode || null,
          address_line1: formData.contactDetails || "",
          id_number: formData.id || "",
          phone: formData.phone || "",
          credit_days: parseInt(formData.creditDays) || 0,
          branch_type: formData.branchType || "Head Office",
          branch_number: formData.branchNumber || null,
        });

        const newCustomerResult = await createCustomer({
          name: formData.customer,
          code: formData.customerCode || null,
          address_line1: formData.contactDetails || "",
          id_number: formData.id || "",
          phone: formData.phone || "",
          credit_days: parseInt(formData.creditDays) || 0,
          branch_type: formData.branchType || "Head Office",
          branch_number: formData.branchNumber || null,
        });

        console.log("📦 Customer creation result:", newCustomerResult);

        if (newCustomerResult.success) {
          customerId = newCustomerResult.customerId;
          console.log("✅ New customerId:", customerId);
          // ⭐ ไม่แสดง alert สำหรับ WKIN (เพราะเป็นลูกค้าหน้างาน)
          if (formData.customerCode !== "WKIN") {
            alert(`สร้างลูกค้าใหม่สำเร็จ: ${formData.customer}`);
          }
        } else {
          console.error("❌ Failed to create customer:", newCustomerResult.error);
          alert(`ไม่สามารถสร้างลูกค้าใหม่ได้: ${newCustomerResult.error}`);
          setLoading(false);
          return;
        }
      }

      console.log("🔍 Final customerId before sending:", customerId);
      console.log("🔍 DEBUG: formData.code =", formData.code);
      console.log("🔍 DEBUG: Full formData =", formData);

      const depositData = {
        customerId: customerId,
        supplierId: formData.supplierId || null,
        depositType: formData.depositType || "airTicket",
        otherTypeDescription: formData.otherTypeDescription,
        groupName: formData.groupName,
        status: "pending",
        paymentStatus: "unpaid",
        createdBy: userId,
        updatedBy: userId,
        issueDate: formData.date,
        dueDate: formData.dueDate,
        creditDays: formData.creditDays,
        pricing: pricing,
        vatPercent: parseFloat(formData.vatPercent || 0),
        depositAmount: depositAmount,
        depositPax: depositPax,
        depositAmount2: depositAmount2,
        depositPax2: depositPax2,
        depositDueDate: formData.depositDueDate,
        secondDepositDueDate: formData.secondDepositDueDate,
        passengerInfoDueDate: formData.passengerInfoDueDate,
        fullPaymentDueDate: formData.fullPaymentDueDate,
        companyPayments: formData.companyPayments,
        customerPayments: formData.customerPayments,
        description: formData.description,
        salesName: currentUser?.fullname || formData.salesName,
        code: formData.code || "",
        routes: routes
          .filter((r) => r.origin || r.destination)
          .map((r) => ({
            flight: r.flight,
            flight_number: r.flight,
            rbd: r.rbd,
            date: r.date,
            origin: r.origin,
            destination: r.destination,
            departure: r.departure,
            arrival: r.arrival,
          })),
        extras: extras
          .filter((e) => e.description)
          .map((e) => ({
            description: e.description,
            net_price: e.net_price || 0,
            sale_price: e.sale_price || 0,
            quantity: e.quantity || 1,
            total_amount: e.total_amount || 0,
          })),
      };

      console.log("🚀 Sending deposit data:", depositData);
      console.log("💰 Company Payments:", formData.companyPayments);
      console.log("💰 Customer Payments:", formData.customerPayments);
      console.log("✅ Payments in depositData:", {
        companyPayments: depositData.companyPayments,
        customerPayments: depositData.customerPayments
      });

      const result = await createDeposit(depositData);

      if (result.success) {
        alert(`สร้าง Booking สำเร็จ ID: ${result.referenceNumber}`);

        // Reset form
        window.location.reload();
      } else {
        throw new Error(result.error || "Failed to create deposit");
      }
    } catch (error) {
      console.error("❌ Error saving deposit:", error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const extrasSubtotal = extras.reduce(
    (sum, item) => sum + parseFloat(item.total_amount || 0),
    0
  );
  const subtotal = calculateSubtotal() + extrasSubtotal;
  const vatAmount = calculateVat(subtotal);
  const total = calculateTotal(subtotal, vatAmount);

  useEffect(() => {
    const searchSupplierByCodeFunc = async () => {
      if (
        formData.searchSupplierCode &&
        formData.searchSupplierCode.length >= 2
      ) {
        console.log(
          "Searching for supplier code:",
          formData.searchSupplierCode
        );

        try {
          const supplier = await searchSupplierByCode(
            formData.searchSupplierCode
          );
          console.log("Search result:", supplier);

          if (supplier) {
            console.log("Found supplier:", supplier.code, supplier.name);

            setFormData((prev) => ({
              ...prev,
              supplier: supplier.code,
              supplierName: supplier.name,
              supplierId: supplier.id,
              supplierNumericCode: supplier.numeric_code || "",
              searchSupplierCode: "",
            }));
          } else {
            console.log(
              "Supplier not found for code:",
              formData.searchSupplierCode
            );

            setFormData((prev) => ({
              ...prev,
              supplierName: "",
              supplierId: null,
              supplierNumericCode: "",
              searchSupplierCode: "",
            }));
          }
        } catch (error) {
          console.error("Error in searchSupplierByCodeFunc:", error);
          setFormData((prev) => ({
            ...prev,
            searchSupplierCode: "",
          }));
        }
      }
    };

    searchSupplierByCodeFunc();
  }, [formData.searchSupplierCode]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load customers (ใช้ getCustomers ที่มีอยู่แล้ว)

        // Load deposit suppliers
        const suppliersData = await getDepositSuppliers();
        setSuppliers(suppliersData);
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    };
    loadInitialData();
  }, []);

  // ป้องกันการกด Enter ในฟอร์ม
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
            <h1 className="text-xl font-bold">Sale Deposit / วางมัดจำ</h1>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-500 text-white rounded-md flex items-center hover:bg-green-600"
                disabled={loading}
              >
                {loading ? (
                  <span>กำลังบันทึก...</span>
                ) : (
                  <>
                    <FiSave className="mr-1" /> บันทึก
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Section 1: Header - ข้อมูลลูกค้าและราคา */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div>
                <h2 className="text-lg font-semibold border-b pb-2 mb-4">
                  ข้อมูลลูกค้า
                </h2>
                <SaleHeader
                  formData={formData}
                  setFormData={setFormData}
                  section="customer"
                  selectedCustomer={selectedCustomer}
                  setSelectedCustomer={setSelectedCustomer}
                  globalEditMode={globalEditMode}
                  setGlobalEditMode={setGlobalEditMode}
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold border-b pb-2 mb-4">
                  ราคาและวันที่
                </h2>
                <SaleHeader
                  formData={formData}
                  setFormData={setFormData}
                  section="price"
                  totalAmount={total}
                  subtotalAmount={subtotal}
                  vatAmount={vatAmount}
                  globalEditMode={globalEditMode}
                  setGlobalEditMode={setGlobalEditMode}
                />
              </div>
            </div>

            <div className="space-y-6">
              {/* ==========================================
      Section 2: Routes (ซ้าย) + Terms (ขวา) - ✅ ใหม่
      ========================================== */}
              <div className="space-y-2 mt-6">
                <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-1 rounded-lg shadow-md">
                  <h2 className="text-white font-bold px-3 py-2 flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                    </svg>
                    เส้นทางการเดินทางและเงื่อนไข
                  </h2>
                </div>

                <div className="grid grid-cols-10 gap-2">
                  {/* Routes - ซ้าย 7 คอลัมน์ */}
                  <div className="col-span-7">
                    <RouteSection routes={routes} setRoutes={setRoutes} />
                  </div>

                  {/* Terms - ขวา 3 คอลัมน์ */}
                  <div className="col-span-3">
                    <DepositTermsSection
                      formData={formData}
                      setFormData={setFormData}
                    />
                  </div>
                </div>
              </div>

              {/* ==========================================
      Section 3: Extras (ซ้าย) + Supplier (ขวา) - ✅ ใหม่
      ========================================== */}
              <div className="space-y-2 mt-6">
                <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-1 rounded-lg shadow-md">
                  <h2 className="text-white font-bold px-3 py-2 flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                    </svg>
                    รายการเพิ่มเติมและข้อมูลซัพพลายเออร์
                  </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                  {/* Extras Section - ซ้าย 2 คอลัมน์ */}
                  <div className="col-span-2">
                    <ExtrasSection extras={extras} setExtras={setExtras} />
                  </div>

                  {/* Supplier Section - ขวา 1 คอลัมน์ */}
                  <div className="col-span-1">
                    <SupplierSection
                      formData={formData}
                      setFormData={setFormData}
                      onSupplierSearch={handleSupplierSearch}
                      showDepositTypeButtons={true}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ==========================================
      Section 4: PricingTable (ซ้าย) + DepositPricing (ขวา) - ✅ ใหม่
      ========================================== */}
            <div className="space-y-2 mt-6">
              <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-1 rounded-lg shadow-md">
                <h2 className="text-white font-bold px-3 py-2 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                      clipRule="evenodd"
                    />
                    <path d="M9 12a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" />
                  </svg>
                  ตารางราคาและยอดรวม
                </h2>
              </div>

              <div className="grid grid-cols-15 gap-2">
                {/* PricingTable - ซ้าย 9 คอลัมน์ */}
                <div className="col-span-9 rounded-lg self-start overflow-hidden">
                  <PricingTable
                    pricing={pricing}
                    updatePricing={updatePricing}
                  />
                </div>

                {/* DepositPricing - ขวา 6 คอลัมน์ */}
                <div className="col-span-6">
                  <DepositPricingSection
                    formData={formData}
                    setFormData={setFormData}
                    pricing={pricing}
                    extras={extras}
                    depositAmount={depositAmount}
                    setDepositAmount={setDepositAmount}
                    depositPax={depositPax}
                    setDepositPax={setDepositPax}
                    depositAmount2={depositAmount2}
                    setDepositAmount2={setDepositAmount2}
                    depositPax2={depositPax2}
                    setDepositPax2={setDepositPax2}
                    calculateSubtotal={calculateSubtotal}
                    calculateVat={calculateVat}
                    calculateTotal={calculateTotal}
                    vatPercent={vatPercent}
                    setVatPercent={setVatPercent}
                  />
                </div>
              </div>
            </div>

            {/* ==========================================
    Section 6: Payment (ใหม่สำหรับ Deposit)
    ========================================== */}
            <div className="space-y-2 mt-6">
              <section className="border border-gray-400 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-1 shadow-md">
                  <h2 className="text-white font-bold px-3 py-2 flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                      <path
                        fillRule="evenodd"
                        d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    การชำระเงิน
                  </h2>
                </div>
                <div className="p-4">
                  <DepositPaymentSection
                    formData={formData}
                    setFormData={setFormData}
                  />
                </div>
              </section>
            </div>
          </div>
          {/* Bottom Save Button */}
          <div className="border-t-2 border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-6 mt-6">
            <div className="flex justify-center">
              <button
                type="submit"
                className={`px-8 py-3 bg-green-500 text-white rounded-lg flex items-center hover:bg-green-600 text-lg font-semibold shadow-lg transform hover:scale-105 transition-all duration-200 ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <FiSave className="mr-2" size={20} />
                    บันทึกข้อมูล Deposit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SaleDeposit;
