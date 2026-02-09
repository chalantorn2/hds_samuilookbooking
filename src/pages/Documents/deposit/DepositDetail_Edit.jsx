// src/pages/Documents/deposit/DepositDetail_Edit.jsx
// Deposit Detail Edit Modal - ตาม Pattern ของ FlightTicketDetail_Edit.jsx
// ใช้ Layout เหมือน DepositDetail.jsx แต่เป็น editable

import React, { useState, useEffect } from "react";
import { apiClient } from "../../../services/apiClient";
import { Save, ChevronLeft, Trash2, X } from "lucide-react";
import { useAlertDialogContext } from "../../../contexts/AlertDialogContext";
import usePricing from "../../../hooks/usePricing";
import SaleStyles, { combineClasses } from "../../Sales/common/SaleStyles";
import DepositPaymentSection from "../../Sales/deposit/DepositPaymentSection";
import SupplierSection from "../../Sales/common/SupplierSection";
import SaleHeader from "../../Sales/common/SaleHeader";
import PricingTable from "../../Sales/common/PricingTable";
import DepositTermsSection from "../../Sales/deposit/DepositTermsSection";
import DepositTypeSection from "../../Sales/deposit/DepositTypeSection";
import DepositPricingSection from "../../Sales/deposit/DepositPricingSection";
import RouteSection from "../../Sales/ticket/RouteSection";
import ExtrasSection from "../../Sales/ticket/ExtrasSection";
import { formatCustomerAddress } from "../../../utils/helpers";
import CancelReasonModal from "../../View/common/CancelReasonModal";
import { useAuth } from "../../Login/AuthContext";
import { getCustomers } from "../../../services/customerService";
import { getSuppliers, searchSupplierByCode } from "../../../services/supplierService";
import { createCustomerOverrideData } from "../../../utils/helpers";
import {
  getDisplayCustomerName,
  getDisplayCustomerAddress,
  getDisplayCustomerPhone,
  getDisplayCustomerIdNumber,
  getDisplayCustomerBranchType,
  getDisplayCustomerBranchNumber,
} from "../../../utils/helpers";

// แก้ไขฟังก์ชัน mapDataToFormState()

const DepositDetail_Edit = ({ depositId, onClose, onSave }) => {
  const { user } = useAuth();
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [globalEditMode, setGlobalEditMode] = useState(false);
  const showAlert = useAlertDialogContext();
  const [depositData, setDepositData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Use same pricing hook as SaleDeposit
  const { pricing, updatePricing, calculateSubtotal } = usePricing();

  // Form state matching SaleDeposit structure
  const [formData, setFormData] = useState({
    customer: "",
    customerCode: "",
    contactDetails: "",
    phone: "",
    id: "",
    date: "",
    creditDays: "0",
    dueDate: "",
    salesName: "",
    supplier: "",
    supplierName: "",
    supplierId: null,
    supplierNumericCode: "",
    depositType: "airTicket",
    otherTypeDescription: "",
    groupName: "",
    companyPaymentMethod: "",
    companyPaymentDetails: "",
    customerPaymentMethod: "",
    customerPaymentDetails: "",
    companyPayments: Array.from({ length: 5 }, () => ({ amount: '', date: '', by: '' })),
    customerPayments: Array.from({ length: 5 }, () => ({ amount: '', date: '', by: '' })),
    vatPercent: "0",
    code: "",
    description: "",
    branchType: "Head Office",
    branchNumber: "",
    // Deposit specific fields
    depositAmount: "0",
    depositPax: "0",
    depositAmount2: "0",
    depositPax2: "0",
    depositDueDate: "",
    secondDepositDueDate: "",
    passengerInfoDueDate: "",
    fullPaymentDueDate: "",
  });

  // Deposit amount state for DepositPricingSection
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositPax, setDepositPax] = useState(0);
  const [depositAmount2, setDepositAmount2] = useState(0);
  const [depositPax2, setDepositPax2] = useState(0);

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

  const mapPaymentMethodFromDB = (dbValue) => {
    if (!dbValue) return "";

    const mapping = {
      // Database values -> Form values
      เครดิตการ์ด: "creditCard",
      โอนเงินผ่านธนาคาร: "bankTransfer",
      เงินสด: "cash",
      เครดิต: "credit",
      "อื่น ๆ": "other",
      อื่นๆ: "other",
      // English values - เพิ่มตัวใหญ่
      CREDITCARD: "creditCard",
      BANKTRANSFER: "bankTransfer",
      CASH: "cash",
      CREDIT: "credit",
      OTHER: "other",
      // camelCase values
      creditCard: "creditCard",
      bankTransfer: "bankTransfer",
      cash: "cash",
      credit: "credit",
      other: "other",
    };

    return mapping[dbValue] || "";
  };

  // Map database data to component state
  const mapDataToFormState = (deposit) => {
    // ✅ เพิ่ม customer_override_data ให้ deposit object
    const depositWithOverride = {
      ...deposit,
      customer_override_data: deposit.customer_override_data, // ย้ายจาก root มาใส่ใน deposit object
    };

    const details = deposit.details || {};
    const terms = deposit.terms || {};
    const pricingData = deposit.pricing || {};
    const additionalInfo = deposit.additionalInfo || {};

    // ✅ ใช้ depositWithOverride แทน deposit
    setFormData({
      customer: getDisplayCustomerName(depositWithOverride),
      customerCode: deposit.customer?.code || "",
      contactDetails: getDisplayCustomerAddress(depositWithOverride),
      phone: getDisplayCustomerPhone(depositWithOverride),
      id: getDisplayCustomerIdNumber(depositWithOverride),
      date: deposit.deposit?.issue_date?.split("T")[0] || "",
      creditDays: String(deposit.deposit?.credit_days || 0),
      dueDate: deposit.deposit?.due_date?.split("T")[0] || "",
      salesName: "",
      supplier: deposit.supplier?.code || "",
      supplierName: deposit.supplier?.name || "",
      supplierId: deposit.supplier?.id || null,
      supplierNumericCode: deposit.supplier?.numeric_code || "",
      depositType: deposit.deposit?.deposit_type || "airTicket",
      otherTypeDescription: deposit.deposit?.other_type_description || "",
      groupName: deposit.deposit?.group_name || "",
      companyPaymentMethod:
        mapPaymentMethodFromDB(additionalInfo.company_payment_method) || "",
      companyPaymentDetails: additionalInfo.company_payment_details || "",
      customerPaymentMethod:
        mapPaymentMethodFromDB(additionalInfo.customer_payment_method) || "",
      customerPaymentDetails: additionalInfo.customer_payment_details || "",
      companyPayments: additionalInfo.company_payments || Array.from({ length: 5 }, () => ({ amount: '', date: '', by: '' })),
      customerPayments: additionalInfo.customer_payments || Array.from({ length: 5 }, () => ({ amount: '', date: '', by: '' })),
      vatPercent: String(details.vat_percent || 0),
      code: additionalInfo.code || "",
      description: details.description || "",
      branchType: getDisplayCustomerBranchType(depositWithOverride),
      branchNumber: getDisplayCustomerBranchNumber(depositWithOverride),
      // Deposit specific fields
      depositAmount: String(details.deposit_amount || 0),
      depositPax: String(details.deposit_pax || 0),
      depositAmount2: String(details.deposit_amount_2 || 0),
      depositPax2: String(details.deposit_pax_2 || 0),
      depositDueDate: terms.deposit_due_date || "",
      secondDepositDueDate: terms.second_deposit_due_date || "",
      passengerInfoDueDate: terms.passenger_info_due_date || "",
      fullPaymentDueDate: terms.full_payment_due_date || "",
    });

    // Map pricing
    const adultTotal =
      (pricingData.adult_sale_price || 0) * (pricingData.adult_pax || 0);
    const childTotal =
      (pricingData.child_sale_price || 0) * (pricingData.child_pax || 0);
    const infantTotal =
      (pricingData.infant_sale_price || 0) * (pricingData.infant_pax || 0);

    updatePricing("adult", "net", pricingData.adult_net_price || 0, 0);
    updatePricing("adult", "sale", pricingData.adult_sale_price || 0, 0);
    updatePricing("adult", "pax", pricingData.adult_pax || 0, adultTotal);
    updatePricing("child", "net", pricingData.child_net_price || 0, 0);
    updatePricing("child", "sale", pricingData.child_sale_price || 0, 0);
    updatePricing("child", "pax", pricingData.child_pax || 0, childTotal);
    updatePricing("infant", "net", pricingData.infant_net_price || 0, 0);
    updatePricing("infant", "sale", pricingData.infant_sale_price || 0, 0);
    updatePricing("infant", "pax", pricingData.infant_pax || 0, infantTotal);

    // Map deposit amounts
    setDepositAmount(parseFloat(details.deposit_amount || 0));
    setDepositPax(parseInt(details.deposit_pax || 0));
    setDepositAmount2(parseFloat(details.deposit_amount_2 || 0));
    setDepositPax2(parseInt(details.deposit_pax_2 || 0));

    // ✅ แก้ไขส่วน setSelectedCustomer
    if (deposit.customer) {
      setSelectedCustomer({
        id: deposit.customer.id,
        name: getDisplayCustomerName(depositWithOverride),
        code: deposit.customer.code,
        address: getDisplayCustomerAddress(depositWithOverride),
        phone: getDisplayCustomerPhone(depositWithOverride),
        id_number: getDisplayCustomerIdNumber(depositWithOverride),
        branch_type: getDisplayCustomerBranchType(depositWithOverride),
        branch_number: getDisplayCustomerBranchNumber(depositWithOverride),
        credit_days: deposit.customer.credit_days,
      });
    }

    if (deposit.supplier) {
      setFormData((prev) => ({
        ...prev,
        supplier: deposit.supplier.code || "",
        supplierName: deposit.supplier.name || "",
        supplierId: deposit.supplier.id || null,
        supplierNumericCode: deposit.supplier.numeric_code || "",
      }));
    }
    if (deposit.routes && Array.isArray(deposit.routes)) {
      if (deposit.routes.length > 0) {
        setRoutes(
          deposit.routes.map((route, index) => ({
            id: index + 1,
            date: route.date || "",
            flight: route.flight_number || route.flight || "",
            rbd: route.rbd || "",
            origin: route.origin || "",
            destination: route.destination || "",
            departure: route.departure_time || route.departure || "",
            arrival: route.arrival_time || route.arrival || "",
          }))
        );
      } else {
        setRoutes([
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
      }
    }

    if (deposit.extras && Array.isArray(deposit.extras)) {
      if (deposit.extras.length > 0) {
        setExtras(
          deposit.extras.map((extra, index) => ({
            id: index + 1,
            description: extra.description || "",
            net_price: extra.net_price || "",
            sale_price: extra.sale_price || "",
            quantity: extra.quantity || 1,
            total_amount: extra.total_amount || "",
          }))
        );
      } else {
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
      }
    }
  };

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

  // Fetch and map deposit data
  useEffect(() => {
    const fetchDepositData = async () => {
      if (!depositId) return;

      setLoading(true);
      try {
        const response = await apiClient.get("/gateway.php", {
          action: "getDepositForEdit",
          depositId: depositId,
        });

        if (!response.success) {
          throw new Error(response.error || "ไม่สามารถโหลดข้อมูลมัดจำได้");
        }

        const deposit = response.data;
        setDepositData(deposit);
        mapDataToFormState(deposit);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDepositData();
  }, [depositId]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      // ใช้ service ที่ migrate แล้ว
      const data = await getSuppliers("Airline");
      setSuppliers(data);
    };
    fetchSuppliers();
  }, []);

  // Sync selectedCustomer with formData
  useEffect(() => {
    if (selectedCustomer) {
      setFormData((prev) => ({
        ...prev,
        customer: selectedCustomer.name || "",
        customerCode: selectedCustomer.code || "",
        contactDetails:
          selectedCustomer.address || formatCustomerAddress(selectedCustomer),
        phone: selectedCustomer.phone || "",
        id: selectedCustomer.id_number || "",
        branchType: selectedCustomer.branch_type || "Head Office",
        branchNumber: selectedCustomer.branch_number || "",
        creditDays: String(selectedCustomer.credit_days || 0),
      }));
    }
  }, [selectedCustomer]);

  // ✅ Calculate totals (รวม extras)
  const pricingSubtotal = calculateSubtotal();

  // ✅ คำนวณ extras total
  const extrasTotal =
    extras?.reduce(
      (sum, item) => sum + parseFloat(item.total_amount || 0),
      0
    ) || 0;

  // ✅ Deposit total (แยกต่างหาก)
  const depositTotal = depositAmount * depositPax;
  const depositTotal2 = depositAmount2 * depositPax2;

  // ✅ Subtotal before VAT (pricing + extras, ไม่รวม deposit)
  const calculatedSubtotal = pricingSubtotal + extrasTotal;

  // ✅ VAT และ Grand Total
  const dbDetailsData = depositData?.details;
  const calculatedVatAmount = parseFloat(dbDetailsData?.vat_amount || 0);
  const calculatedTotal = parseFloat(
    (calculatedSubtotal + calculatedVatAmount).toFixed(2)
  );

  // Save changes with confirmation
  const handleSubmit = async (e) => {
    e.preventDefault();

    const confirmed = await showAlert({
      title: "ยืนยันการแก้ไข",
      description: `คุณต้องการบันทึกการแก้ไขมัดจำรหัส ${depositData.deposit?.reference_number} ใช่หรือไม่?`,
      confirmText: "ยืนยัน",
      cancelText: "ยกเลิก",
    });

    if (!confirmed) return;

    setSaving(true);

    try {
      // อัปเดตข้อมูลลูกค้าก่อน
      const customerOverrideData = createCustomerOverrideData(
        formData,
        selectedCustomer
      );

      // เตรียมข้อมูลสำหรับส่งไป API Gateway
      const updateData = {
        // Customer data (if needed)
        customerOverride: customerOverrideData,

        // Main deposit data
        mainDeposit: {
          customer_id: selectedCustomer?.id,
          supplier_id: formData.supplierId,
          deposit_type: formData.depositType,
          other_type_description: formData.otherTypeDescription,
          group_name: formData.groupName,
          issue_date: formData.date || null,
          due_date: formData.dueDate || null,
          credit_days: parseInt(formData.creditDays) || 0,
          updated_by: user?.id, // ✅ เพิ่ม updated_by
        },

        // Deposit detail data
        depositDetails: {
          description: formData.description || "",
          subtotal_before_vat: calculatedSubtotal,
          pricing_total: pricingSubtotal,
          deposit_amount: depositAmount,
          deposit_pax: depositPax,
          deposit_total: depositTotal,
          deposit_amount_2: depositAmount2,
          deposit_pax_2: depositPax2,
          deposit_total_2: depositTotal2,
          vat_percent: parseFloat(formData.vatPercent) || 0,
          vat_amount: calculatedVatAmount,
          grand_total: calculatedTotal,
        },

        // Deposit terms data
        depositTerms: {
          deposit_due_date: formData.depositDueDate || null,
          second_deposit_due_date: formData.secondDepositDueDate || null,
          passenger_info_due_date: formData.passengerInfoDueDate || null,
          full_payment_due_date: formData.fullPaymentDueDate || null,
        },

        // Additional info data
        additionalInfo: {
          code: formData.code || "",
          company_payment_method: formData.companyPaymentMethod || "",
          company_payment_details: formData.companyPaymentDetails || "",
          customer_payment_method: formData.customerPaymentMethod || "",
          customer_payment_details: formData.customerPaymentDetails || "",
          company_payments: formData.companyPayments || [],
          customer_payments: formData.customerPayments || [],
        },

        // Pricing data
        pricing: {
          adult_net_price: parseFloat(pricing.adult?.net || 0),
          adult_sale_price: parseFloat(pricing.adult?.sale || 0),
          adult_pax: parseInt(pricing.adult?.pax || 0),
          adult_total: parseFloat(pricing.adult?.total || 0),
          child_net_price: parseFloat(pricing.child?.net || 0),
          child_sale_price: parseFloat(pricing.child?.sale || 0),
          child_pax: parseInt(pricing.child?.pax || 0),
          child_total: parseFloat(pricing.child?.total || 0),
          infant_net_price: parseFloat(pricing.infant?.net || 0),
          infant_sale_price: parseFloat(pricing.infant?.sale || 0),
          infant_pax: parseInt(pricing.infant?.pax || 0),
          infant_total: parseFloat(pricing.infant?.total || 0),
          deposit_sale_price: depositAmount,
          deposit_pax: depositPax,
          deposit_total: depositTotal,
          subtotal_amount: calculatedSubtotal,
          vat_percent: parseFloat(formData.vatPercent) || 0,
          vat_amount: calculatedVatAmount,
          total_amount: calculatedTotal,
        },
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
            net_price: parseFloat(e.net_price || 0),
            sale_price: parseFloat(e.sale_price || 0),
            quantity: parseInt(e.quantity || 1),
            total_amount: parseFloat(e.total_amount || 0),
          })),
      };

      const response = await apiClient.post("/gateway.php", {
        action: "updateDepositComplete",
        depositId: depositId,
        data: updateData,
      });

      if (!response.success) {
        throw new Error(response.error || "ไม่สามารถบันทึกข้อมูลได้");
      }

      onSave?.();
      onClose();
    } catch (err) {
      setError(err.message);
      await showAlert({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้: " + err.message,
        confirmText: "ตกลง",
      });
    } finally {
      setSaving(false);
    }
  };

  // Cancel deposit
  const handleCancel = async (reason) => {
    setCancelling(true);
    try {
      const currentUserId = user?.id;

      if (!currentUserId) {
        throw new Error("ไม่พบข้อมูลผู้ใช้งาน");
      }

      const response = await apiClient.post("/gateway.php", {
        action: "cancelDeposit",
        depositId: depositId,
        userId: currentUserId,
        cancelReason: reason,
      });

      if (!response.success) {
        throw new Error(response.error || "ไม่สามารถยกเลิกมัดจำได้");
      }

      setShowCancelModal(false);
      onSave?.();
      onClose();
    } catch (err) {
      setError(err.message);
      await showAlert({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถยกเลิกมัดจำได้: " + err.message,
        confirmText: "ตกลง",
      });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-center mt-4">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error && !depositData) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <X className="h-12 w-12 mx-auto text-red-500" />
          <p className="text-center text-red-600 mt-4">{error}</p>
          <button
            onClick={onClose}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md mx-auto block"
          >
            ปิด
          </button>
        </div>
      </div>
    );
  }

  if (!depositData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center shrink-0">
          <h1 className="text-xl font-bold">
            แก้ไขมัดจำ: {depositData.deposit?.reference_number}
          </h1>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-700 rounded-md"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form
          onSubmit={handleSubmit}
          className={`${SaleStyles.contentWrapper} flex-1 overflow-y-auto`}
        >
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
                {error}
              </div>
            )}

            {/* Section 1: Customer & Dates */}
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
                  globalEditMode={true}
                  setGlobalEditMode={setGlobalEditMode}
                  readOnly={false}
                  isEditMode={true}
                  customers={customers}
                  setCustomers={setCustomers}
                />
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
                  readOnly={false}
                />
              </div>
            </div>

            {/* Section 2: Routes & Terms - ✅ ใหม่ */}
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
                  <RouteSection
                    routes={routes}
                    setRoutes={setRoutes}
                    readOnly={false}
                  />
                </div>

                {/* Terms - ขวา 3 คอลัมน์ */}
                <div className="col-span-3">
                  <DepositTermsSection
                    formData={formData}
                    setFormData={setFormData}
                    readOnly={false}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Extras (ซ้าย) + Supplier (ขวา) - ✅ ใหม่ */}
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
                  <ExtrasSection
                    extras={extras}
                    setExtras={setExtras}
                    readOnly={false}
                  />
                </div>

                {/* Supplier Section - ขวา 1 คอลัมน์ */}
                <div className="col-span-1">
                  <SupplierSection
                    formData={formData}
                    setFormData={setFormData}
                    suppliers={suppliers}
                    onSupplierSearch={handleSupplierSearch}
                    readOnly={false}
                    hideCodeField={false}
                    showDepositTypeButtons={true}
                  />
                </div>
              </div>
            </div>

            {/* Section 4: PricingTable & Summary - ✅ ใหม่ */}
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
                    readOnly={false}
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
                    calculateVat={() => calculatedVatAmount}
                    calculateTotal={() => calculatedTotal}
                    vatPercent={parseFloat(formData.vatPercent || 0)}
                    setVatPercent={() => {}}
                    readOnly={false}
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Payment Methods */}
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

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center shrink-0">
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
              disabled={saving || cancelling}
            >
              <Trash2 size={16} className="mr-2" />
              {cancelling ? "กำลังยกเลิก..." : "ยกเลิกรายการ"}
            </button>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 flex items-center"
                disabled={saving || cancelling}
              >
                <ChevronLeft size={16} className="mr-2" />
                ยกเลิก
              </button>

              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                disabled={saving || cancelling}
              >
                <Save size={16} className="mr-2" />
                {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Cancel Reason Modal */}
      <CancelReasonModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        ticketNumber={depositData?.deposit?.reference_number}
        loading={cancelling}
      />
    </div>
  );
};

export default DepositDetail_Edit;
