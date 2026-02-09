import React, { useState, useEffect } from "react";
import { FiEdit, FiPlus, FiTrash2, FiSave, FiX } from "react-icons/fi";
import SaleHeader from "./common/SaleHeader";
import PaymentMethodSection from "./common/PaymentMethodSection";
// นำเข้าคอมโพเนนต์ฟอร์มแต่ละประเภท
import InsuranceForm from "./other/forms/InsuranceForm";
import HotelForm from "./other/forms/HotelForm";
import TrainForm from "./other/forms/TrainForm";
import VisaForm from "./other/forms/VisaForm";
import OtherServiceForm from "./other/forms/OtherServiceForm";

// ✅ เพิ่ม import ที่จำเป็น
import { useAuth } from "../../pages/Login/AuthContext";
import { getCustomers, createCustomer } from "../../services/customerService";
import { createOther, getOtherSuppliers } from "../../services/otherService";
import { getLocalDateString } from "../../utils/helpers";
import usePricing from "../../hooks/usePricing";
// ✅ เพิ่มบรรทัดนี้
import SupplierSection from "./common/SupplierSection";
import PricingTable from "./common/PricingTable";
import TotalSummary from "./common/TotalSummary";

const SaleOther = ({ initialServiceType = "hotel" }) => {
  // ✅ เพิ่ม auth context
  const { user: currentUser } = useAuth();

  // ✅ เพิ่ม state สำหรับ loading และ validation
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [globalEditMode, setGlobalEditMode] = useState(false);

  // สร้าง state สำหรับจัดการข้อมูล
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
    supplier: "",
    supplierName: "",
    supplierId: null,
    serviceType: initialServiceType,
    paymentMethod: "",
    companyPaymentDetails: "",
    customerPayment: "",
    customerPaymentDetails: "",
    vatPercent: "0",
    code: "",
  });

  // สร้าง state สำหรับข้อมูลฟอร์มแต่ละประเภท
  const [serviceFormData, setServiceFormData] = useState({});

  // State สำหรับการแสดงผู้โดยสาร
  const [passengers, setPassengers] = useState([
    { id: 1, name: "", type: "ADT" },
  ]);

  // ✅ ใช้ usePricing hook แทน state ธรรมดา
  const { pricing, updatePricing, calculateSubtotal, calculateTotal } =
    usePricing();

  useEffect(() => {
    const adultCount = passengers.filter((p) => p.type === "ADT").length;
    const childCount = passengers.filter((p) => p.type === "CHD").length;
    const infantCount = passengers.filter((p) => p.type === "INF").length;

    updatePricing(
      "adult",
      "pax",
      adultCount,
      (pricing.adult?.sale || 0) * adultCount
    );
    updatePricing(
      "child",
      "pax",
      childCount,
      (pricing.child?.sale || 0) * childCount
    );
    updatePricing(
      "infant",
      "pax",
      infantCount,
      (pricing.infant?.sale || 0) * infantCount
    );
  }, [passengers]); // ✅ ลบ updatePricing ออก

  // ✅ State สำหรับ extras (ถ้าต้องการ - ตาม pattern ของ voucher)
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

  // ✅ Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load customers
        const customersData = await getCustomers();
        setCustomers(customersData);

        // Load suppliers based on service type
        setSuppliers([]);
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    };
    loadInitialData();
  }, []);

  // อัปเดตประเภทบริการเมื่อ prop เปลี่ยน
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      serviceType: initialServiceType,
    }));
  }, [initialServiceType]);

  // ฟังก์ชันสำหรับการเพิ่ม/ลบรายการผู้โดยสาร
  const addPassenger = () => {
    setPassengers([
      ...passengers,
      { id: passengers.length + 1, name: "", type: "ADT" },
    ]);
  };

  const removePassenger = (id) => {
    if (passengers.length > 1) {
      setPassengers(passengers.filter((p) => p.id !== id));
    }
  };

  // ฟังก์ชันสำหรับเปลี่ยนประเภทบริการ
  const handleServiceTypeChange = (serviceType) => {
    setFormData({
      ...formData,
      serviceType,
      // Clear supplier when changing service type
      // (auto-select จะทำงานใน useEffect หลังจากนี้)
      supplier: "",
      supplierName: "",
      supplierId: null,
    });

    // ✅ Load suppliers for new service type
    loadSuppliersForServiceType(serviceType);
  };

  const loadSuppliersForServiceType = async (serviceType) => {
    try {
      const suppliersData = await getOtherSuppliers(serviceType);
      console.log("Supplier response:", suppliersData);

      // แก้ไขให้ตรงกับ response structure
      if (suppliersData.success) {
        setSuppliers(suppliersData.data);
      } else {
        console.error("Failed to load suppliers:", suppliersData.error);
        setSuppliers([]);
      }
    } catch (error) {
      console.error("Error loading suppliers:", error);
      setSuppliers([]);
    }
  };

  // ✅ Handle supplier search
  const handleSupplierSearch = async (searchTerm) => {
    try {
      return await getOtherSuppliers(formData.serviceType, searchTerm);
    } catch (error) {
      console.error("Error searching suppliers:", error);
      return [];
    }
  };

  useEffect(() => {
    // Auto load suppliers when service type changes
    if (formData.serviceType) {
      loadSuppliersForServiceType(formData.serviceType);
    }
  }, [formData.serviceType]);

  // ✅ Auto-select TRAIN supplier when service type is "train"
  useEffect(() => {
    const autoSelectTrainSupplier = async () => {
      if (formData.serviceType === "train" && suppliers.length > 0) {
        // ค้นหาซัพพลายเออร์ที่มีรหัส TRAIN
        const trainSupplier = suppliers.find(
          (supplier) => supplier.code?.toUpperCase() === "TRAIN"
        );

        if (trainSupplier) {
          // Auto-select ซัพพลายเออร์รถไฟ
          setFormData((prev) => ({
            ...prev,
            supplier: trainSupplier.code,
            supplierName: trainSupplier.name,
            supplierId: trainSupplier.id,
            supplierNumericCode: trainSupplier.numeric_code || "",
          }));
          console.log("✅ Auto-selected TRAIN supplier:", trainSupplier);
        } else {
          console.warn("⚠️ TRAIN supplier not found in suppliers list");
        }
      }
    };

    autoSelectTrainSupplier();
  }, [formData.serviceType, suppliers]);

  // ✅ Calculate totals using usePricing hook
  const calculatedSubtotal =
    calculateSubtotal() +
    extras.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
  const calculatedVatAmount =
    (calculatedSubtotal * parseFloat(formData.vatPercent || 0)) / 100;
  const calculatedTotal = calculatedSubtotal + calculatedVatAmount;

  // ฟังก์ชันจัดการการส่งฟอร์ม - ✅ เชื่อมต่อ API จริง
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setValidationErrors({});

    console.log("SaleOther form submitted", {
      formData,
      serviceFormData,
      passengers,
      pricing,
      extras,
    });

    try {
      // ✅ Simple validation
      const errors = {};

      // ตรวจสอบข้อมูลพื้นฐาน
      if (!formData.customer || formData.customer.trim() === "") {
        errors.customer = "กรุณากรอกชื่อลูกค้า";
      }

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        alert("กรุณาตรวจสอบข้อมูลที่กรอก");
        setLoading(false);
        return;
      }

      // เอาผู้โดยสารที่กรอกชื่อมาอย่างเดียว
      const validPassengers = passengers.filter(
        (p) => p.name && p.name.trim() !== ""
      );

      // Get current user info
      let userId = currentUser?.id;
      let userFullname = currentUser?.fullname;

      // Handle customer creation if needed
      let customerId = selectedCustomer?.id;
      if (!customerId && formData.customer) {
        console.log("Creating new customer from other services submission");
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

        if (newCustomerResult.success) {
          customerId = newCustomerResult.customerId;
          console.log("New customer created with ID:", customerId);
          // ⭐ ไม่แสดง alert สำหรับ WKIN (เพราะเป็นลูกค้าหน้างาน)
          if (formData.customerCode !== "WKIN") {
            alert(`สร้างลูกค้าใหม่สำเร็จ: ${formData.customer}`);
          }
        } else {
          console.error("Failed to create customer:", newCustomerResult.error);
          alert(`ไม่สามารถสร้างลูกค้าใหม่ได้: ${newCustomerResult.error}`);
          setLoading(false);
          return;
        }
      }

      // ✅ Prepare other services data
      const otherData = {
        // Basic Info
        customerId: customerId,
        supplierId: formData.supplierId || null,
        serviceType: formData.serviceType,
        status: "not_invoiced",
        paymentStatus: "unpaid",
        createdBy: userId,
        updatedBy: userId,

        // Dates
        issueDate: formData.date || getLocalDateString(), // ใช้ local timezone แทน UTC
        dueDate:
          formData.dueDate ||
          formData.date ||
          getLocalDateString(), // ใช้ local timezone แทน UTC
        creditDays: formData.creditDays,

        // Pricing
        pricing: pricing,
        vatPercent: parseFloat(formData.vatPercent || 0),

        // Service Details - ✅ รวบรวมจาก serviceFormData
        details: {
          description: serviceFormData.description || "",
          serviceDate:
            serviceFormData.date || serviceFormData.serviceDate || "",
          reference: serviceFormData.reference || "",
          hotel: serviceFormData.hotel || serviceFormData.hotelName || "",
          checkIn: serviceFormData.checkIn || serviceFormData.checkInDate || "",
          checkOut:
            serviceFormData.checkOut || serviceFormData.checkOutDate || "",
          nights: serviceFormData.nights || null,
          country: serviceFormData.country || "",
          visaType: serviceFormData.visaType || "",
          route: serviceFormData.route || "",
          departureTime: serviceFormData.departureTime || "",
          arrivalTime: serviceFormData.arrivalTime || "",
          remark: serviceFormData.remark || "",
        },

        // Passengers
        passengers: validPassengers.map((p) => ({
          name: p.name,
          type: p.type,
          serviceNumber: p.serviceNumber || "",
        })),

        // Extras (ถ้ามี)
        extras: extras
          .filter((e) => e.description)
          .map((e) => ({
            description: e.description,
            net_price: e.net_price || 0,
            sale_price: e.sale_price || 0,
            quantity: e.quantity || 1,
            total_amount: e.total_amount || 0,
          })),

        // Payment Methods
        companyPaymentMethod: formData.paymentMethod,
        companyPaymentDetails: formData.companyPaymentDetails || "",
        customerPaymentMethod: formData.customerPayment,
        customerPaymentDetails: formData.customerPaymentDetails || "",

        // Additional Info
        code: formData.code || "",
        salesName: userFullname || formData.salesName,
      };

      // 🔍 DEBUG: Log all data before sending
      console.group("🔍 OTHER SERVICES DEBUG DATA");
      console.log("1. Form Data:", formData);
      console.log("2. Service Form Data:", serviceFormData);
      console.log("3. Selected Customer:", selectedCustomer);
      console.log("4. Passengers:", passengers);
      console.log("5. Valid Passengers:", validPassengers);
      console.log("6. Pricing:", pricing);
      console.log("7. Extras:", extras);
      console.log("8. Final Other Data:", otherData);
      console.log("9. Calculated Totals:", {
        subtotal: calculatedSubtotal,
        vat: calculatedVatAmount,
        total: calculatedTotal,
      });
      console.groupEnd();

      console.log("🚀 Sending other services data:", otherData);

      const result = await createOther(otherData);

      if (result === null || result === undefined) {
        throw new Error("API ไม่ตอบสนอง กรุณาลองใหม่อีกครั้ง");
      } else if (result && result.success) {
        alert(`สร้าง Booking สำเร็จ ID: ${result.referenceNumber}`);
        window.location.reload();
      } else {
        throw new Error(
          result.error || "Failed to create other services booking"
        );
      }
    } catch (error) {
      console.error("❌ Error saving other services:", error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันเลือกแสดงฟอร์มตามประเภทบริการ
  const renderServiceForm = () => {
    const commonProps = {
      formData: serviceFormData,
      setFormData: setServiceFormData,
      pricing: pricing,
      updatePricing: updatePricing,
    };

    switch (formData.serviceType) {
      case "insurance":
        return <InsuranceForm {...commonProps} />;
      case "hotel":
        return <HotelForm {...commonProps} />;
      case "train":
        return <TrainForm {...commonProps} />;
      case "visa":
        return <VisaForm {...commonProps} />;
      case "other":
        return <OtherServiceForm {...commonProps} />;
      default:
        return <HotelForm {...commonProps} />;
    }
  };

  // สร้างแท็บเลือกประเภทบริการ
  const ServiceTypeSelector = () => {
    const serviceTypes = [
      { id: "insurance", label: "ประกันการเดินทาง" },
      { id: "hotel", label: "โรงแรม" },
      { id: "train", label: "รถไฟ" },
      { id: "visa", label: "วีซ่า" },
      { id: "other", label: "บริการอื่นๆ" },
    ];

    return (
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {serviceTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => handleServiceTypeChange(type.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                formData.serviceType === type.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ป้องกันการกด Enter ในฟอร์ม
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="max-w-7xl mx-auto">
        {/* Card หลัก */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
            <h1 className="text-xl font-bold">
              Sale Other / ประกัน/โรงแรม/รถไฟ/วีซ่า/อื่นๆ
            </h1>
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

          {/* เนื้อหาหลัก */}
          <div className="p-6">
            {/* ข้อมูลลูกค้าและราคา */}
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
                {/* ✅ Show validation errors */}
                {validationErrors.customer && (
                  <div className="text-red-500 text-sm mt-1">
                    {validationErrors.customer}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold border-b pb-2 mb-4">
                  ราคาและวันที่
                </h2>
                <SaleHeader
                  formData={formData}
                  setFormData={setFormData}
                  section="price"
                  totalAmount={calculatedTotal}
                  subtotalAmount={calculatedSubtotal}
                  vatAmount={calculatedVatAmount}
                  globalEditMode={globalEditMode}
                  setGlobalEditMode={setGlobalEditMode}
                />
              </div>
            </div>

            {/* Collapsible Sections */}
            <div className="space-y-6">
              {/* ส่วนซัพพลายเออร์และผู้โดยสาร */}
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
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                        clipRule="evenodd"
                      />
                    </svg>
                    ข้อมูลผู้โดยสารและซัพพลายเออร์
                  </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-15 gap-2">
                  {/* ข้อมูลผู้โดยสาร */}
                  <div className="col-span-10">
                    <section className="border border-gray-400 rounded-lg overflow-hidden h-full">
                      <div className="bg-blue-100 text-blue-600 p-3 flex justify-between items-center">
                        <h2 className="font-semibold">
                          ข้อมูลผู้โดยสาร (ทั้งหมด {passengers.length} คน)
                        </h2>
                      </div>
                      <div className="p-4">
                        {passengers.map((passenger, index) => (
                          <div
                            key={passenger.id}
                            className="flex items-center mb-2"
                          >
                            <div className="w-[16px] flex items-center justify-center mr-2">
                              <span className="font-medium">{index + 1}</span>
                            </div>
                            <input
                              type="text"
                              className="flex-1 w-full border border-gray-400 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 no-uppercase"
                              value={passenger.name}
                              onChange={(e) => {
                                const updatedPassengers = [...passengers];
                                updatedPassengers[index].name =
                                  e.target.value.toUpperCase(); // ✅ แก้ไข typo
                                setPassengers(updatedPassengers);
                              }}
                              placeholder="ชื่อผู้โดยสาร"
                            />
                            <select
                              className="ml-2 border border-gray-400 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                              value={passenger.type}
                              onChange={(e) => {
                                const updatedPassengers = [...passengers];
                                updatedPassengers[index].type = e.target.value;
                                setPassengers(updatedPassengers);
                              }}
                            >
                              <option value="ADT">ADT</option>
                              <option value="CHD">CHD</option>
                              <option value="INF">INF</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => removePassenger(passenger.id)}
                              className="ml-2 text-red-500 hover:text-red-700"
                              disabled={passengers.length === 1}
                            >
                              <FiTrash2 size={18} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addPassenger}
                          className="mt-2 ml-6 flex items-center text-white bg-green-500 hover:bg-green-600 px-3 py-2 rounded-md text-sm"
                        >
                          <FiPlus className="mr-1" /> เพิ่มผู้โดยสาร
                        </button>
                        {/* ✅ Show validation errors */}
                        {validationErrors.passengers && (
                          <div className="text-red-500 text-sm mt-2">
                            {validationErrors.passengers}
                          </div>
                        )}
                      </div>
                    </section>
                  </div>

                  <SupplierSection
                    formData={formData}
                    setFormData={setFormData}
                    suppliers={suppliers}
                    onSupplierSearch={handleSupplierSearch}
                    hideCodeField={true}
                    readOnly={false}
                    supplierType="supplier-other"
                  />
                </div>
              </div>

              <section className="border border-gray-400 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-1 shadow-md">
                  <h2 className="text-white font-bold px-3 py-2 flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                    </svg>
                    ประเภทบริการ
                  </h2>
                </div>
                <div className="p-4">
                  <div className="mb-6">
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "insurance", label: "ประกันการเดินทาง" },
                        { id: "hotel", label: "โรงแรม" },
                        { id: "train", label: "รถไฟ" },
                        { id: "visa", label: "วีซ่า" },
                        { id: "other", label: "บริการอื่นๆ" },
                      ].map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => handleServiceTypeChange(type.id)}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            formData.serviceType === type.id
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* แสดงฟอร์มตามประเภทบริการที่เลือก */}
                  <div className="bg-blue-500 text-white p-2 mb-2 rounded-md">
                    <div className="text-center font-medium text-xl">
                      {formData.serviceType === "insurance" &&
                        "ประกันการเดินทาง"}
                      {formData.serviceType === "hotel" && "โรงแรม"}
                      {formData.serviceType === "train" && "รถไฟ"}
                      {formData.serviceType === "visa" && "วีซ่า"}
                      {formData.serviceType === "other" && "บริการอื่นๆ"}
                    </div>
                  </div>

                  {renderServiceForm()}
                </div>
              </section>

              {/* Pricing & Summary Section - แบบเดียวกับ SaleVoucher */}
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
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                          clipRule="evenodd"
                        />
                      </svg>
                      ราคาและยอดรวม
                    </h2>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* PricingTable */}
                      <div className="col-span-2">
                        <PricingTable
                          pricing={pricing}
                          updatePricing={updatePricing}
                          config={{
                            showHeaders: true,
                            showBorder: true,
                            showTotal: true,
                            enableEdit: true,
                          }}
                        />
                      </div>

                      {/* TotalSummary */}
                      <div className="col-span-1">
                        <TotalSummary
                          subtotal={calculatedSubtotal}
                          total={calculatedTotal}
                          setFormData={setFormData}
                          pricing={pricing}
                          extras={extras}
                          vatPercent={formData.vatPercent}
                          config={{
                            showBorder: true,
                            size: "md",
                            align: "right",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* ส่วนการชำระเงิน */}
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <PaymentMethodSection
                        title="การชำระเงินของบริษัท"
                        sectionType="company"
                        fieldName="paymentMethod"
                        detailsFieldName="companyPaymentDetails"
                        options={[
                          {
                            id: "creditCardCompany",
                            value: "creditCard",
                            label: "เครดิตการ์ด",
                          },
                          {
                            id: "bankTransferCompany",
                            value: "bankTransfer",
                            label: "โอนเงินผ่านธนาคาร",
                          },
                          {
                            id: "cashCompany",
                            value: "cash",
                            label: "เงินสด",
                          },
                          {
                            id: "otherCompany",
                            value: "other",
                            label: "อื่น ๆ",
                          },
                        ]}
                        formData={formData}
                        setFormData={setFormData}
                        detailPlaceholder="รายละเอียดการชำระเงิน"
                      />

                      <PaymentMethodSection
                        title="การชำระเงินของลูกค้า"
                        sectionType="customer"
                        fieldName="customerPayment"
                        detailsFieldName="customerPaymentDetails"
                        options={[
                          {
                            id: "creditCardCustomer",
                            value: "creditCard",
                            label: "เครดิตการ์ด VISA / MSTR / AMEX / JCB",
                          },
                          {
                            id: "bankTransferCustomer",
                            value: "bankTransfer",
                            label: "โอนเงินผ่านธนาคาร",
                          },
                          {
                            id: "cashCustomer",
                            value: "cash",
                            label: "เงินสด",
                          },
                          {
                            id: "creditCustomer",
                            value: "credit",
                            label: "เครดิต",
                          },
                        ]}
                        formData={formData}
                        setFormData={setFormData}
                        detailPlaceholder="รายละเอียดการชำระเงิน"
                      />
                    </div>
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
                      บันทึกข้อมูล Other Services
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SaleOther;
