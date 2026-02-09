// src/pages/Documents/deposit/DepositDetail.jsx
// Deposit Detail Modal - ตาม Pattern ของ FlightTicketDetail
// ใช้ Component เฉพาะของ Deposit และ Component ร่วมกัน

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../../services/apiClient";
import {
  Printer,
  Mail,
  X,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  Edit2,
} from "lucide-react";
import SaleHeader from "../../Sales/common/SaleHeader";
import SupplierSection from "../../Sales/common/SupplierSection";
import PricingTable from "../../Sales/common/PricingTable";
import DepositTermsSection from "../../Sales/deposit/DepositTermsSection";
import DepositTypeSection from "../../Sales/deposit/DepositTypeSection";
import DepositPricingSection from "../../Sales/deposit/DepositPricingSection";
import RouteSection from "../../Sales/ticket/RouteSection";
import ExtrasSection from "../../Sales/ticket/ExtrasSection";
import SaleStyles, { combineClasses } from "../../Sales/common/SaleStyles";
import usePricing from "../../../hooks/usePricing";
import {
  formatCustomerAddress,
  displayThaiDateTime,
  formatDateOnly,
} from "../../../utils/helpers";
import DocumentViewer from "../../../components/documents/viewers/DocumentViewer";
import EmailDocument from "../../../components/documents/email/EmailDocument";
import PrintConfirmModal from "../../../components/documents/modals/PrintConfirmModal";
import { updateDepositStatus } from "../../../services/depositService";
import {
  getDisplayCustomerName,
  getDisplayCustomerAddress,
  getDisplayCustomerPhone,
  getDisplayCustomerIdNumber,
  getDisplayCustomerBranchType,
  getDisplayCustomerBranchNumber,
} from "../../../utils/helpers";
import { useAuth } from "../../Login/AuthContext";

const DepositDetail = ({
  depositId,
  onClose,
  onEdit,
  showOnlyPrint = false,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [depositData, setDepositData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use same pricing hook as SaleTicket
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
    companyPayments: Array.from({ length: 5 }, () => ({
      amount: "",
      date: "",
      by: "",
    })),
    customerPayments: Array.from({ length: 5 }, () => ({
      amount: "",
      date: "",
      by: "",
    })),
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

  const [routes, setRoutes] = useState([]);
  const [extras, setExtras] = useState([]);

  // Dummy states for SaleHeader compatibility
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [globalEditMode, setGlobalEditMode] = useState(false);

  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // ✅ Helper function คำนวณ status
  const calculateDepositStatus = (deposit) => {
    if (!deposit) return null;

    // 1. ถ้ามี flight_ticket_reference แสดงว่าออกตั๋วแล้ว
    if (deposit.deposit?.flight_ticket_reference) {
      return { type: "issued_ticket" };
    }

    // 2. คำนวณยอดที่ลูกค้าชำระแล้ว
    const customerPayments = deposit.additionalInfo?.customer_payments || [];
    const totalPaid = customerPayments.reduce((sum, payment) => {
      return sum + (parseFloat(payment.amount) || 0);
    }, 0);

    // 3. คำนวณ grand_total
    const grandTotal = parseFloat(deposit.details?.grand_total) || 0;

    // 4. ถ้าชำระครบแล้ว (sum = grand_total) → รอออกตั๋ว
    if (totalPaid >= grandTotal && grandTotal > 0 && totalPaid > 0) {
      return { type: "awaiting_ticket" };
    }

    // 5. ถ้าลูกค้าชำระเงินครั้งที่ 1 แล้ว → รอชำระส่วนที่เหลือ
    const firstPayment = customerPayments[0];
    if (firstPayment && parseFloat(firstPayment.amount || 0) > 0) {
      return { type: "awaiting_payment" };
    }

    // 6. Default → รอมัดจำ (ยังไม่ได้รับเงินเลย)
    return { type: "awaiting_deposit" };
  };

  useEffect(() => {
    const fetchDepositDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get("/gateway.php", {
          action: "getDepositById",
          depositId: depositId,
        });

        if (!response.success) {
          throw new Error(response.error || "ไม่สามารถโหลดข้อมูลมัดจำได้");
        }

        const deposit = response.data;

        // Fetch user information
        const userIds = [
          deposit.deposit.created_by,
          deposit.deposit.updated_by,
          deposit.deposit.cancelled_by,
        ].filter(Boolean);

        let userMap = new Map();

        if (userIds.length > 0) {
          const usersResponse = await apiClient.post("/gateway.php", {
            action: "getUsersByIds",
            userIds: userIds,
          });

          if (usersResponse.success && usersResponse.data) {
            userMap = new Map(
              usersResponse.data.map((user) => [user.id, user.fullname])
            );
          } else {
            console.warn(
              "Warning: Could not fetch user data:",
              usersResponse.error
            );
          }
        }

        setDepositData({
          ...deposit,
          createdByName: userMap.get(deposit.deposit.created_by) || "-",
          updatedByName: userMap.get(deposit.deposit.updated_by) || "-",
          cancelledByName: userMap.get(deposit.deposit.cancelled_by) || "-",
        });

        // ✅ Debug: ดูว่ามี flight_ticket_reference หรือไม่
        console.log("🔍 Deposit Data:", deposit);
        console.log(
          "🔍 Flight Ticket Reference:",
          deposit.deposit?.flight_ticket_reference
        );

        mapDataToFormState(deposit);
      } catch (err) {
        console.error("Error fetching deposit details:", err);
        setError(err.message || "ไม่สามารถโหลดข้อมูลมัดจำได้");
      } finally {
        setLoading(false);
      }
    };

    if (depositId) fetchDepositDetails();
  }, [depositId]);

  // Map database data to component state
  const mapDataToFormState = (deposit) => {
    const depositWithOverride = {
      ...deposit,
      customer_override_data: deposit.customer_override_data,
    };
    const details = deposit.details || {};
    const terms = deposit.terms || {};
    const pricingData = deposit.pricing || {};
    const additionalInfo = deposit.additionalInfo || {};

    // Map formData
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
      companyPaymentMethod: additionalInfo.company_payment_method || "",
      companyPaymentDetails: additionalInfo.company_payment_details || "",
      customerPaymentMethod: additionalInfo.customer_payment_method || "",
      customerPaymentDetails: additionalInfo.customer_payment_details || "",
      companyPayments:
        additionalInfo.company_payments ||
        Array.from({ length: 5 }, () => ({ amount: "", date: "", by: "" })),
      customerPayments:
        additionalInfo.customer_payments ||
        Array.from({ length: 5 }, () => ({ amount: "", date: "", by: "" })),
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

    if (deposit.customer) {
      setSelectedCustomer({
        id: deposit.customer.id,
        name: getDisplayCustomerName(depositWithOverride),
        address: getDisplayCustomerAddress(depositWithOverride),
        phone: getDisplayCustomerPhone(depositWithOverride),
        id_number: getDisplayCustomerIdNumber(depositWithOverride),
        branch_type: getDisplayCustomerBranchType(depositWithOverride),
        branch_number: getDisplayCustomerBranchNumber(depositWithOverride),
        credit_days: deposit.customer.credit_days,
      });
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
        setRoutes([]);
      }
    } else {
      setRoutes([]);
    }

    if (deposit.extras && Array.isArray(deposit.extras)) {
      setExtras(deposit.extras);
    } else {
      setExtras([]);
    }
  };

  const pricingSubtotal =
    (pricing.adult?.total || 0) +
    (pricing.child?.total || 0) +
    (pricing.infant?.total || 0);

  // ✅ คำนวณ extras total
  const extrasTotal =
    extras?.reduce(
      (sum, item) => sum + parseFloat(item.total_amount || 0),
      0
    ) || 0;

  // ✅ VAT คำนวณจาก pricing + extras (ไม่รวม deposit)
  const subtotalBeforeVat = pricingSubtotal + extrasTotal;
  const pricingVatAmount =
    (subtotalBeforeVat * parseFloat(formData.vatPercent || 0)) / 100;
  const pricingTotal = subtotalBeforeVat + pricingVatAmount;

  // Grand totals from database (รวม deposit แล้ว)
  const calculatedSubtotal = parseFloat(
    depositData?.details?.subtotal_before_vat || 0
  );
  const calculatedVatAmount = parseFloat(depositData?.details?.vat_amount || 0);
  const calculatedTotal = parseFloat(depositData?.details?.grand_total || 0);

  const getBranchDisplay = (branchType, branchNumber) => {
    if (branchType === "Branch" && branchNumber) {
      return `${branchType} ${branchNumber}`;
    }
    return branchType || "Head Office";
  };

  const getStatusBadge = (status, cancelledAt, flightTicketReference) => {
    // ตรวจสอบสถานะยกเลิกก่อน
    if (status === "cancelled") {
      return (
        <div className="flex items-center">
          <AlertTriangle className="text-red-500 mr-2" size={18} />
          <div>
            <div className="text-base font-medium text-red-800">Cancelled</div>
            <div className="text-sm text-red-600">มัดจำถูกยกเลิกแล้ว</div>
          </div>
        </div>
      );
    }

    // แสดงสถานะ Active และ FT (ถ้ามี) แนวนอนข้างๆกัน เหมือน INV และ PO
    const hasFT = flightTicketReference && flightTicketReference.trim() !== "";
    const isIssued = status === "issued";

    if (isIssued || hasFT) {
      return (
        <div className="flex items-center gap-4">
          {isIssued && (
            <div className="flex items-center">
              <CheckCircle className="text-green-500 mr-2" size={18} />
              <div>
                <div className="text-base font-medium text-gray-900">
                  Issued
                </div>
                <div className="text-sm text-gray-600">ออก Deposit แล้ว</div>
              </div>
            </div>
          )}
          {hasFT && (
            <div className="flex items-center">
              <CheckCircle className="text-blue-500 mr-2" size={18} />
              <div>
                <div className="text-base font-medium text-gray-900">
                  {flightTicketReference}
                </div>
                <div className="text-sm text-gray-600">ออก INV แล้ว</div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // สถานะ Pending (ยังไม่ได้ออกเอกสาร)
    return (
      <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
        Pending
      </span>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 modal-backdrop bg-black flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <p className="text-center mt-4 text-base">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 modal-backdrop bg-black flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
          <div className="text-center text-red-500 mb-4">
            <AlertTriangle className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-center text-red-600 text-base">{error}</p>
          <div className="flex justify-center mt-6">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-base"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ฟังก์ชันจัดการคลิก Sale Ticket - แปลง DP เป็น FT
  const handleSaleTicketClick = () => {
    const status = depositData.deposit?.status;

    if (status === "cancelled") {
      alert("ไม่สามารถแปลง Deposit ที่ถูกยกเลิกเป็น Flight Ticket ได้");
      return;
    }

    // เตรียมข้อมูลที่จะส่งไปหน้า Sale Ticket
    const depositDataForSaleTicket = {
      // Customer information
      customer: formData.customer,
      customerCode: formData.customerCode,
      contactDetails: formData.contactDetails,
      phone: formData.phone,
      id: formData.id,
      branchType: formData.branchType,
      branchNumber: formData.branchNumber,

      // Supplier information
      supplier: formData.supplier,
      supplierName: formData.supplierName,
      supplierId: formData.supplierId,
      supplierNumericCode: formData.supplierNumericCode,
      code: formData.code,

      // Date information
      date: formData.date,
      creditDays: formData.creditDays,
      dueDate: formData.dueDate,

      // Payment information
      paymentMethod: formData.companyPaymentMethod,
      companyPaymentDetails: formData.companyPaymentDetails,
      customerPayment: formData.customerPaymentMethod,
      customerPaymentDetails: formData.customerPaymentDetails,

      // Pricing
      pricing: pricing,
      vatPercent: formData.vatPercent,

      // Routes
      routes: routes,

      // Extras
      extras: extras,

      // Selected customer object
      selectedCustomer: selectedCustomer,

      // Reference
      fromDepositId: depositData.deposit?.id,
      fromDepositRef: depositData.deposit?.reference_number,
    };

    console.log(
      "Navigating to Sale Ticket with data:",
      depositDataForSaleTicket
    );

    // Navigate to Sale Ticket page with deposit data
    navigate("/sale/ticket", {
      state: { fromDeposit: depositDataForSaleTicket },
    });
  };

  // ฟังก์ชันจัดการคลิกปุ่มพิมพ์
  const handlePrintClick = () => {
    const status = depositData.deposit?.status;

    if (status === "cancelled") {
      alert("ไม่สามารถพิมพ์เอกสารที่ถูกยกเลิกได้");
      return;
    }

    if (status === "pending") {
      // แสดง modal ยืนยันก่อน
      setShowConfirmModal(true);
    } else if (status === "issued") {
      // เปิด viewer เลย
      setShowDocumentViewer(true);
    }
  };

  const handleEmailClick = () => {
    const status = depositData.deposit?.status;

    if (status === "cancelled") {
      alert("ไม่สามารถส่งอีเมลเอกสารที่ถูกยกเลิกได้");
      return;
    }

    // เปิด Email Modal
    setShowEmailModal(true);
  };

  // ฟังก์ชันยืนยันการพิมพ์ (สำหรับสถานะ pending)
  const handleConfirmPrint = async () => {
    setIsUpdatingStatus(true);

    try {
      // อัปเดตสถานะเป็น issued
      const result = await updateDepositStatus(
        depositData.deposit.id,
        "issued",
        user?.id
      );

      if (result.success) {
        // อัปเดต depositData ใน state
        setDepositData({
          ...depositData,
          deposit: {
            ...depositData.deposit,
            status: "issued",
          },
        });

        // ปิด modal
        setShowConfirmModal(false);

        // เปิด viewer
        setTimeout(() => {
          setShowDocumentViewer(true);
        }, 300);
      } else {
        alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ: " + result.error);
      }
    } catch (error) {
      console.error("Error updating deposit status:", error);
      alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // ฟังก์ชันปิด viewer
  const handleCloseViewer = () => {
    setShowDocumentViewer(false);
  };

  if (!depositData) return null;

  return (
    <>
      <div className="fixed inset-0 modal-backdrop bg-black flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center">
            <h1 className="text-xl font-bold">
              รายละเอียดมัดจำ:{" "}
              {depositData.deposit?.reference_number ||
                `#${depositData.deposit?.id}`}
            </h1>
            <div className="flex items-center space-x-2">
              {depositData.deposit?.status !== "cancelled" &&
                calculateDepositStatus(depositData)?.type ===
                  "awaiting_ticket" && (
                  <button
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md transition-colors font-medium text-sm"
                    title="ออก INV - แปลง DP เป็น FT"
                    onClick={handleSaleTicketClick}
                  >
                    ออก INV
                  </button>
                )}

              {depositData.deposit?.status !== "cancelled" && (
                <button
                  className="p-2 hover:bg-blue-700 rounded-md transition-colors"
                  title="พิมพ์"
                  onClick={handlePrintClick}
                >
                  <Printer size={20} />
                </button>
              )}

              {!showOnlyPrint &&
                depositData.deposit?.status !== "cancelled" && (
                  <button
                    className="p-2 hover:bg-blue-700 rounded-md transition-colors"
                    title="ส่งอีเมล"
                    onClick={handleEmailClick}
                  >
                    <Mail size={20} />
                  </button>
                )}

              <button
                onClick={onClose}
                className="p-2 hover:bg-blue-700 rounded-md transition-colors"
                title="ปิด"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content - ใช้ Layout เดียวกับ SaleDeposit */}
          <div className="flex-1 overflow-y-auto">
            <div className={SaleStyles.mainContent}>
              {/* Section 1: Customer & Dates - เหมือนเดิม */}
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
                    readOnly={true}
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
                    totalAmount={pricingTotal}
                    subtotalAmount={pricingSubtotal}
                    vatAmount={pricingVatAmount}
                    globalEditMode={globalEditMode}
                    setGlobalEditMode={setGlobalEditMode}
                    readOnly={true}
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
                      readOnly={true}
                    />
                  </div>

                  {/* Terms - ขวา 3 คอลัมน์ */}
                  <div className="col-span-3">
                    <DepositTermsSection
                      formData={formData}
                      setFormData={setFormData}
                      readOnly={true}
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
                      readOnly={true}
                    />
                  </div>

                  {/* Supplier Section - ขวา 1 คอลัมน์ */}
                  <div className="col-span-1">
                    <SupplierSection
                      formData={formData}
                      setFormData={setFormData}
                      readOnly={true}
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
                      readOnly={true}
                    />
                  </div>

                  {/* DepositPricing - ขวา 6 คอลัมน์ */}
                  <div className="col-span-6">
                    <DepositPricingSection
                      formData={formData}
                      setFormData={setFormData}
                      pricing={pricing}
                      extras={extras}
                      depositAmount={parseFloat(formData.depositAmount || 0)}
                      setDepositAmount={() => {}}
                      depositPax={parseInt(formData.depositPax || 0)}
                      setDepositPax={() => {}}
                      depositAmount2={parseFloat(formData.depositAmount2 || 0)}
                      setDepositAmount2={() => {}}
                      depositPax2={parseInt(formData.depositPax2 || 0)}
                      setDepositPax2={() => {}}
                      calculateSubtotal={calculateSubtotal}
                      calculateVat={() => calculatedVatAmount}
                      calculateTotal={() => calculatedTotal}
                      vatPercent={parseFloat(formData.vatPercent || 0)}
                      setVatPercent={() => {}}
                      readOnly={true}
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Extras - ✅ ใหม่ */}
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
                      {/* การชำระเงินของบริษัท */}
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h3 className="font-semibold mb-3 text-blue-600 text-lg flex items-center">
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                            <path
                              fillRule="evenodd"
                              d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                          การชำระเงินของบริษัท
                        </h3>
                        <div className="space-y-2">
                          {formData.companyPayments &&
                            formData.companyPayments.map((payment, index) => {
                              if (
                                !payment.amount &&
                                !payment.date &&
                                !payment.by
                              )
                                return null;
                              return (
                                <div key={index} className="text-sm">
                                  <span className="text-gray-600">
                                    ชำระครั้งที่ {index + 1}:
                                  </span>
                                  <span className="ml-2 font-medium">
                                    {payment.amount
                                      ? parseFloat(
                                          payment.amount
                                        ).toLocaleString("en-US", {
                                          minimumFractionDigits: 0,
                                          maximumFractionDigits: 2,
                                        }) + " บาท"
                                      : "-"}
                                  </span>
                                  {payment.date && (
                                    <span className="ml-2 text-gray-600">
                                      วันที่:{" "}
                                      <span className="font-medium text-gray-800">
                                        {formatDateOnly(payment.date)}
                                      </span>
                                    </span>
                                  )}
                                  {payment.by && (
                                    <span className="ml-2 text-gray-600">
                                      โดย:{" "}
                                      <span className="font-medium text-gray-800">
                                        {payment.by}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          {(!formData.companyPayments ||
                            formData.companyPayments.every(
                              (p) => !p.amount && !p.date && !p.by
                            )) && (
                            <div className="text-sm text-gray-500">
                              ไม่มีข้อมูลการชำระเงิน
                            </div>
                          )}
                        </div>
                      </div>

                      {/* การชำระเงินของลูกค้า */}
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h3 className="font-semibold mb-3 text-blue-600 text-lg flex items-center">
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                            <path
                              fillRule="evenodd"
                              d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                          การชำระเงินของลูกค้า
                        </h3>
                        <div className="space-y-2">
                          {formData.customerPayments &&
                            formData.customerPayments.map((payment, index) => {
                              if (
                                !payment.amount &&
                                !payment.date &&
                                !payment.by
                              )
                                return null;
                              return (
                                <div key={index} className="text-sm">
                                  <span className="text-gray-600">
                                    ชำระครั้งที่ {index + 1}:
                                  </span>
                                  <span className="ml-2 font-medium">
                                    {payment.amount
                                      ? parseFloat(
                                          payment.amount
                                        ).toLocaleString("en-US", {
                                          minimumFractionDigits: 0,
                                          maximumFractionDigits: 2,
                                        }) + " บาท"
                                      : "-"}
                                  </span>
                                  {payment.date && (
                                    <span className="ml-2 text-gray-600">
                                      วันที่:{" "}
                                      <span className="font-medium text-gray-800">
                                        {formatDateOnly(payment.date)}
                                      </span>
                                    </span>
                                  )}
                                  {payment.by && (
                                    <span className="ml-2 text-gray-600">
                                      โดย:{" "}
                                      <span className="font-medium text-gray-800">
                                        {payment.by}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          {(!formData.customerPayments ||
                            formData.customerPayments.every(
                              (p) => !p.amount && !p.date && !p.by
                            )) && (
                            <div className="text-sm text-gray-500">
                              ไม่มีข้อมูลการชำระเงิน
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>

          {/* Footer - เหมือนเดิม */}
          <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
            <div className="flex items-center space-x-6">
              {/* Status info */}
              <div className="flex items-center space-x-4">
                <div>
                  <div className="text-gray-600 mb-1 text-sm">สถานะรายการ</div>
                  {getStatusBadge(
                    depositData.deposit?.status,
                    depositData.deposit?.cancelled_at,
                    depositData.deposit?.flight_ticket_reference
                  )}
                </div>
                <div>
                  <div className="text-gray-600 mb-1 text-sm">สร้างโดย</div>
                  <div className="font-medium text-sm">
                    {depositData.createdByName}
                  </div>
                  <div className="text-gray-600 text-sm">
                    {displayThaiDateTime(depositData.deposit?.created_at)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1 text-sm">อัปเดตโดย</div>
                  <div className="font-medium text-sm">
                    {depositData.updatedByName}
                  </div>
                  <div className="text-gray-600 text-sm">
                    {displayThaiDateTime(depositData.deposit?.updated_at)}
                  </div>
                </div>
                {depositData.deposit?.cancelled_at && (
                  <div>
                    <div className="text-gray-600 mb-1 text-sm">ยกเลิกโดย</div>
                    <div className="font-medium text-sm">
                      {depositData.cancelledByName}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {displayThaiDateTime(depositData.deposit?.cancelled_at)}
                    </div>
                    <div className="text-gray-600 text-sm">
                      เหตุผล: {depositData.deposit?.cancel_reason || "-"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors flex items-center text-sm font-medium"
              >
                <ChevronLeft size={16} className="mr-2" />
                กลับ
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Print Confirmation Modal */}
      <PrintConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmPrint}
        loading={isUpdatingStatus}
        documentType="deposit"
      />

      {/* Document Viewer */}
      {showDocumentViewer && (
        <DocumentViewer
          isOpen={showDocumentViewer}
          onClose={() => {
            setShowDocumentViewer(false);
            onClose();
          }}
          documentType="deposit"
          depositId={depositId}
        />
      )}
      {/* Email Document Modal */}
      {showEmailModal && (
        <EmailDocument
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          documentType="deposit"
          recordId={depositId}
          onEmailSent={(message) => {
            console.log("Email sent successfully:", message);
            setShowEmailModal(false);
          }}
          userId={user?.id} // ✅ ส่ง userId สำหรับ Activity Log
        />
      )}
    </>
  );
};

export default DepositDetail;
