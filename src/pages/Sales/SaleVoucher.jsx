import React, { useState, useEffect } from "react";
import { FiSave } from "react-icons/fi";
import SaleHeader from "./common/SaleHeader";
import PaymentMethodSection from "./common/PaymentMethodSection";
import VoucherServiceSection from "./voucher/VoucherServiceSection";
import VoucherPassengerSection from "./voucher/VoucherPassengerSection";
import VoucherDetailsSection from "./voucher/VoucherDetailsSection";
import PricingSummarySection from "./ticket/PricingSummarySection";
import usePricing from "../../hooks/usePricing";
import SaleStyles, { combineClasses } from "./common/SaleStyles";
import { useAuth } from "../../pages/Login/AuthContext";
import { getCustomers, createCustomer } from "../../services/customerService";
import { getLocalDateString } from "../../utils/helpers";
// ✅ Phase 4: ใช้ voucherService แทน direct API calls
import {
  createVoucher,
  getVoucherSuppliers,
} from "../../services/voucherService";

const SaleVoucher = () => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [globalEditMode, setGlobalEditMode] = useState(false);

  // Form Data State
  const [formData, setFormData] = useState({
    // Customer Info (handled by SaleHeader)
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

    // Voucher Specific
    serviceType: "bus", // Default to bus
    supplier: "",
    supplierName: "",
    supplierId: null,
    code: "",

    // Service Details
    description: "",
    tripDate: "",
    pickupTime: "",
    hotel: "",
    roomNo: "",
    reference: "",
    remark: "",

    // Payment
    paymentMethod: "",
    companyPaymentDetails: "",
    customerPayment: "",
    customerPaymentDetails: "",
    vatPercent: "0",
  });

  // Pricing Hook
  const { pricing, updatePricing, calculateSubtotal, calculateTotal } =
    usePricing();

  // Passengers State
  const [passengers, setPassengers] = useState([
    { id: 1, name: "", type: "ADT", voucherNumber: "BS-25-001" },
  ]);

  // Extras State (reuse from ticket system)
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

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load customers
        const customersData = await getCustomers();
        setCustomers(customersData);

        // ✅ Phase 4: ใช้ voucherService
        const suppliersData = await getVoucherSuppliers();
        setSuppliers(suppliersData);
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    };
    loadInitialData();
  }, []);

  // Handle supplier search
  const handleSupplierSearch = async (searchTerm) => {
    try {
      // ✅ Phase 4: ใช้ voucherService
      return await getVoucherSuppliers(searchTerm);
    } catch (error) {
      console.error("Error searching suppliers:", error);
      return [];
    }
  };

  // Calculate totals
  const calculatedSubtotal =
    calculateSubtotal() +
    extras.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
  const calculatedVatAmount =
    (calculatedSubtotal * parseFloat(formData.vatPercent || 0)) / 100;
  const calculatedTotal = calculatedSubtotal + calculatedVatAmount;

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setValidationErrors({});

    console.log("SaleVoucher form submitted", {
      formData,
      passengers,
      pricing,
      extras,
    });

    try {
      // ✅ Phase 4: Simple validation (ไม่เข้มงวด)
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
        console.log("Creating new customer from voucher submission");
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

      // ✅ Phase 4: Prepare voucher data for voucherService
      const voucherData = {
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

        // Service Details
        details: {
          description: formData.description || "",
          tripDate: formData.tripDate || "",
          pickupTime: formData.pickupTime || "",
          hotel: formData.hotel || "",
          roomNo: formData.roomNo || "",
          reference: formData.reference || "",
          remark: formData.remark || "",
        },

        // Passengers
        passengers: validPassengers.map((p) => ({
          name: p.name,
          type: p.type,
          voucherNumber: p.voucherNumber || "",
        })),

        // Extras
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
      console.group("🔍 VOUCHER DEBUG DATA");
      console.log("1. Form Data:", formData);
      console.log("2. Selected Customer:", selectedCustomer);
      console.log("3. Passengers:", passengers);
      console.log("4. Valid Passengers:", validPassengers);
      console.log("5. Pricing:", pricing);
      console.log("6. Extras:", extras);
      console.log("7. Final Voucher Data:", voucherData);
      console.log("8. Calculated Totals:", {
        subtotal: calculatedSubtotal,
        vat: calculatedVatAmount,
        total: calculatedTotal,
      });
      console.groupEnd();

      // 🔍 DEBUG: Check if data is complete
      const debugChecks = {
        hasCustomer: !!customerId,
        hasServiceType: !!voucherData.serviceType,
        hasPassengers: voucherData.passengers.length > 0,
        hasPricing: !!(
          pricing.adult?.sale ||
          pricing.child?.sale ||
          pricing.infant?.sale
        ),
        hasDetails: !!(
          voucherData.details.description || voucherData.details.tripDate
        ),
        hasPayment: !!(
          voucherData.companyPaymentMethod || voucherData.customerPaymentMethod
        ),
      };

      console.log("🔍 DEBUG CHECKS:", debugChecks);

      console.log("🚀 Sending voucher data:", voucherData);

      const result = await createVoucher(voucherData);

      if (result.success) {
        alert(`สร้าง Booking สำเร็จ ID: ${result.referenceNumber}`);
        window.location.reload();
      } else {
        throw new Error(result.error || "Failed to create voucher");
      }
    } catch (error) {
      console.error("❌ Error saving voucher:", error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Reset form function
  const resetForm = () => {
    setFormData({
      customer: "",
      customerCode: "",
      contactDetails: "",
      phone: "",
      id: "",
      date: getLocalDateString(), // ใช้ local timezone แทน UTC
      creditDays: "0",
      dueDate: "",
      salesName: "",
      serviceType: "bus",
      supplier: "",
      supplierName: "",
      supplierId: null,
      code: "",
      description: "",
      tripDate: "",
      pickupTime: "",
      hotel: "",
      roomNo: "",
      reference: "",
      remark: "",
      paymentMethod: "",
      companyPaymentDetails: "",
      customerPayment: "",
      customerPaymentDetails: "",
      vatPercent: "7",
    });

    // Reset pricing
    updatePricing("adult", "net", "", 0);
    updatePricing("adult", "sale", "", 0);
    updatePricing("adult", "pax", 0, 0);
    updatePricing("child", "net", "", 0);
    updatePricing("child", "sale", "", 0);
    updatePricing("child", "pax", 0, 0);
    updatePricing("infant", "net", "", 0);
    updatePricing("infant", "sale", "", 0);
    updatePricing("infant", "pax", 0, 0);

    // Reset passengers
    setPassengers([
      { id: 1, name: "", type: "ADT", voucherNumber: "BS-25-001" },
    ]);

    // Reset extras
    setExtras([
      {
        id: 1,
        description: "",
        net_price: "",
        sale_price: "",
        quantity: 1,
        total_amount: "",
      },
    ]);

    setSelectedCustomer(null);
    setValidationErrors({});
    setGlobalEditMode(true);
  };

  // ป้องกันการกด Enter ในฟอร์ม
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  };

  return (
    <div className={SaleStyles.mainContainer}>
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className={SaleStyles.contentWrapper}>
        <div className={SaleStyles.mainCard}>
          {/* Header */}
          <div className={SaleStyles.header.container}>
            <h1 className={SaleStyles.header.title}>
              Sale Voucher / ขายบริการเดินทาง
            </h1>
            <div className={SaleStyles.header.buttonContainer}>
              <button
                type="submit"
                className={SaleStyles.button.primary}
                disabled={loading}
              >
                {loading ? (
                  <span>กำลังบันทึก...</span>
                ) : (
                  <>
                    <FiSave className={SaleStyles.button.icon} /> บันทึก
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className={SaleStyles.mainContent}>
            {/* Customer & Pricing Info */}
            <div className={SaleStyles.grid.twoColumns}>
              <div>
                <h2
                  className={combineClasses(
                    "text-lg font-semibold border-b pb-2",
                    SaleStyles.spacing.mb4
                  )}
                >
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
                {/* ✅ Phase 4: Show validation errors */}
                {validationErrors.customer && (
                  <div className="text-red-500 text-sm mt-1">
                    {validationErrors.customer}
                  </div>
                )}
              </div>
              <div>
                <h2
                  className={combineClasses(
                    "text-lg font-semibold border-b pb-2",
                    SaleStyles.spacing.mb4
                  )}
                >
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

            {/* Passenger & Service Provider Section */}
            <div className={SaleStyles.section.container}>
              <div className={SaleStyles.section.headerWrapper}>
                <h2 className={SaleStyles.section.headerTitle}>
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
              <div className={SaleStyles.grid.fifteenColumns}>
                <VoucherPassengerSection
                  passengers={passengers}
                  setPassengers={setPassengers}
                  updatePricing={updatePricing}
                  pricing={pricing}
                  formData={formData}
                  setFormData={setFormData}
                />
                <VoucherServiceSection
                  formData={formData}
                  setFormData={setFormData}
                  suppliers={suppliers}
                  onSupplierSearch={handleSupplierSearch}
                />
              </div>
              {/* ✅ Phase 4: Show validation errors */}
              {validationErrors.passengers && (
                <div className="text-red-500 text-sm mt-2 ml-4">
                  {validationErrors.passengers}
                </div>
              )}
            </div>

            {/* Service Details Section */}
            <div className={SaleStyles.section.container}>
              <div className={SaleStyles.grid.fifteenColumns}>
                <VoucherDetailsSection
                  formData={formData}
                  setFormData={setFormData}
                />
              </div>
            </div>

            {/* Pricing Summary Section */}
            <PricingSummarySection
              pricing={pricing}
              updatePricing={updatePricing}
              setFormData={setFormData}
              extras={extras}
            />

            {/* Payment Methods Section */}
            <div className={SaleStyles.section.container}>
              <section className={SaleStyles.subsection.container}>
                <div className={SaleStyles.section.headerWrapper2}>
                  <h2 className={SaleStyles.section.headerTitle}>
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
                <div className={SaleStyles.subsection.content}>
                  <div className={SaleStyles.grid.twoColumns}>
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
                        { id: "otherCompany", value: "other", label: "อื่น ๆ" },
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
          <div
            className={combineClasses(
              SaleStyles.section.container,
              "border-t-2 border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-6"
            )}
          >
            <div className="flex justify-center">
              <button
                type="submit"
                className={combineClasses(
                  "px-8 py-3 bg-green-500 text-white rounded-lg flex items-center hover:bg-green-600 text-lg font-semibold shadow-lg transform hover:scale-105 transition-all duration-200",
                  loading ? "opacity-50 cursor-not-allowed" : ""
                )}
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
                    บันทึกข้อมูล Voucher
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

export default SaleVoucher;
