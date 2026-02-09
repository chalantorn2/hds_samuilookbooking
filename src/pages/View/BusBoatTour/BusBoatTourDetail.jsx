// src/pages/View/BusBoatTour/BusBoatTourDetail.jsx
// Phase 3: Detail View Component for Bus/Boat/Tour Vouchers
// Based on FlightTicketDetail.jsx - Using SaleVoucher components structure
// ✅ Read-only display mode
// ❌ NO Email functionality
// ❌ NO Print functionality
// 🔲 Placeholder buttons (disabled)

import React, { useState, useEffect } from "react";
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
import usePricing from "../../../hooks/usePricing";
import SaleStyles, { combineClasses } from "../../Sales/common/SaleStyles";
import SaleHeader from "../../Sales/common/SaleHeader";
import PaymentMethodSection from "../../Sales/common/PaymentMethodSection";
// ✅ Import SaleVoucher components (TODO: Replace when SaleVoucher components exist)
import VoucherPassengerSection from "../../Sales/voucher/VoucherPassengerSection";
import VoucherServiceSection from "../../Sales/voucher/VoucherServiceSection";
import VoucherDetailsSection from "../../Sales/voucher/VoucherDetailsSection";
import PricingSummarySection from "../../Sales/ticket/PricingSummarySection";
import {
  displayThaiDateTime,
  formatCustomerAddress,
} from "../../../utils/helpers";
import { generateVCForVoucher } from "../../../services/voucherService";
import { DocumentViewer } from "../../../components/documents";
import EmailDocument from "../../../components/documents/email/EmailDocument";
import { useAuth } from "../../../pages/Login/AuthContext"; // ✅ เพิ่ม useAuth
import PrintConfirmModal from "../../../components/documents/modals/PrintConfirmModal";
import {
  getDisplayCustomerName,
  getDisplayCustomerAddress,
  getDisplayCustomerPhone,
  getDisplayCustomerIdNumber,
  getDisplayCustomerBranchType,
  getDisplayCustomerBranchNumber,
} from "../../../utils/helpers";

const BusBoatTourDetail = ({ voucherId, onClose, showOnlyView = false }) => {
  const [voucherData, setVoucherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Use same pricing hook as SaleVoucher
  const { pricing, updatePricing, calculateSubtotal } = usePricing();

  // ✅ เพิ่ม useAuth สำหรับ Activity Log
  const { user } = useAuth();

  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailNotification, setEmailNotification] = useState(null);

  // Form state matching SaleVoucher structure
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
    serviceType: "bus",
    paymentMethod: "",
    companyPaymentDetails: "",
    customerPayment: "",
    customerPaymentDetails: "",
    vatPercent: "0",
    code: "",
    description: "",
    tripDate: "",
    pickupTime: "",
    hotel: "",
    roomNo: "",
    reference: "",
    remark: "",
  });

  // Voucher components state
  const [passengers, setPassengers] = useState([
    { id: 1, name: "", type: "ADT", voucherNumber: "" },
  ]);

  const [extras, setExtras] = useState([
    { id: 1, description: "", net: "", sale: "", pax: 1, total: "" },
  ]);

  // Dummy states for SaleHeader compatibility
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [globalEditMode, setGlobalEditMode] = useState(false);

  useEffect(() => {
    const fetchVoucherDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log("🔄 Fetching voucher details for ID:", voucherId);

        // 🔄 API Gateway call for voucher details
        const response = await apiClient.get("/gateway.php", {
          action: "getVoucherById",
          voucherId: voucherId,
        });

        if (!response.success) {
          throw new Error(response.error || "ไม่สามารถโหลดข้อมูล voucher ได้");
        }

        const voucher = response.data;
        console.log("✅ Voucher data loaded:", voucher);

        // Fetch user information
        const userIds = [
          voucher.voucher?.created_by,
          voucher.voucher?.updated_by,
          voucher.voucher?.cancelled_by,
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

        // Get additional info - แก้ไข: ใช้ข้อมูลจาก getVoucherById แทน
        console.log("✅ Voucher data loaded:", voucher);

        // Process and map data to component state
        setVoucherData({
          ...voucher,
          createdByName: userMap.get(voucher.voucher?.created_by) || "-",
          updatedByName: userMap.get(voucher.voucher?.updated_by) || "-",
          cancelledByName: userMap.get(voucher.voucher?.cancelled_by) || "-",
        });

        mapDataToFormState(voucher);
      } catch (err) {
        console.error("Error fetching voucher details:", err);
        setError(err.message || "ไม่สามารถโหลดข้อมูล voucher ได้");
      } finally {
        setLoading(false);
      }
    };

    if (voucherId) fetchVoucherDetails();
  }, [voucherId]);

  // Map database data to component state
  const mapDataToFormState = (voucher) => {
    const voucherWithOverride = {
      ...voucher,
      customer_override_data: voucher.customer_override_data,
    };
    const mainVoucher = voucher.voucher || {};
    const details = voucher.details || {};
    const pricingData = voucher.pricing || {};
    const additionalInfo = voucher.additionalInfo || {}; // ✅ ตอนนี้มีข้อมูลแล้ว
    const customer = voucher.customer || {}; // ✅ ข้อมูลลูกค้าครบถ้วน
    const supplier = voucher.supplier || {}; // ✅ ข้อมูลซัพพลายเออร์ครบถ้วน

    // Map formData
    setFormData({
      customer: getDisplayCustomerName(voucherWithOverride), // ✅ แก้จาก customer.name
      customerCode: customer.code || "",
      contactDetails: getDisplayCustomerAddress(voucherWithOverride), // ✅ แก้จาก formatCustomerAddress(customer)
      phone: getDisplayCustomerPhone(voucherWithOverride), // ✅ แก้จาก customer.phone
      id: getDisplayCustomerIdNumber(voucherWithOverride), // ✅ แก้จาก customer.id_number
      date: mainVoucher.issue_date?.split("T")[0] || "",
      creditDays: String(mainVoucher.credit_days || 0),
      dueDate: mainVoucher.due_date?.split("T")[0] || "",
      salesName: "",
      supplier: supplier.code || "",
      supplierName: supplier.name || "",
      supplierId: supplier.id || null,
      serviceType: mainVoucher.service_type || "bus",
      paymentMethod: additionalInfo.company_payment_method || "", // ✅ ตอนนี้มีข้อมูลแล้ว
      companyPaymentDetails: additionalInfo.company_payment_details || "", // ✅ ตอนนี้มีข้อมูลแล้ว
      customerPayment: additionalInfo.customer_payment_method || "", // ✅ ตอนนี้มีข้อมูลแล้ว
      customerPaymentDetails: additionalInfo.customer_payment_details || "", // ✅ ตอนนี้มีข้อมูลแล้ว
      vatPercent: String(pricingData?.vat_percent || 0),
      code: mainVoucher.reference_number || "",
      description: details?.description || "",
      tripDate: details?.trip_date || "",
      pickupTime: details?.pickup_time || "",
      hotel: details?.hotel || "",
      roomNo: details?.room_no || "",
      reference: details?.reference || "",
      remark: details?.remark || "",
    });

    // Map pricing
    const adultTotal =
      (pricingData?.adult_sale_price || 0) * (pricingData?.adult_pax || 0);
    const childTotal =
      (pricingData?.child_sale_price || 0) * (pricingData?.child_pax || 0);
    const infantTotal =
      (pricingData?.infant_sale_price || 0) * (pricingData?.infant_pax || 0);

    updatePricing("adult", "net", pricingData?.adult_net_price || 0, 0);
    updatePricing("adult", "sale", pricingData?.adult_sale_price || 0, 0);
    updatePricing("adult", "pax", pricingData?.adult_pax || 0, adultTotal);
    updatePricing("child", "net", pricingData?.child_net_price || 0, 0);
    updatePricing("child", "sale", pricingData?.child_sale_price || 0, 0);
    updatePricing("child", "pax", pricingData?.child_pax || 0, childTotal);
    updatePricing("infant", "net", pricingData?.infant_net_price || 0, 0);
    updatePricing("infant", "sale", pricingData?.infant_sale_price || 0, 0);
    updatePricing("infant", "pax", pricingData?.infant_pax || 0, infantTotal);

    // Map passengers
    const mappedPassengers = voucher.passengers?.length
      ? voucher.passengers.map((p, index) => ({
          id: index + 1,
          name: p.passenger_name || "",
          type: p.passenger_type || "ADT",
          voucherNumber: p.voucher_number || "",
        }))
      : [{ id: 1, name: "", type: "ADT", voucherNumber: "" }];
    setPassengers(mappedPassengers);

    // Map extras (vouchers might not have extras)
    const mappedExtras = [
      { id: 1, description: "", net: 0, sale: 0, pax: 1, total: 0 },
    ];
    setExtras(mappedExtras);

    // Set selectedCustomer for SaleHeader compatibility
    if (customer.name) {
      setSelectedCustomer({
        id: customer.id,
        name: getDisplayCustomerName(voucherWithOverride),
        address: getDisplayCustomerAddress(voucherWithOverride),
        phone: getDisplayCustomerPhone(voucherWithOverride),
        id_number: getDisplayCustomerIdNumber(voucherWithOverride),
        branch_type: getDisplayCustomerBranchType(voucherWithOverride),
        branch_number: getDisplayCustomerBranchNumber(voucherWithOverride),
        credit_days: mainVoucher.credit_days || 0,
      });
    }
  };

  const calculatedSubtotal =
    calculateSubtotal() +
    extras.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);

  // ✅ ใช้ VAT จากฐานข้อมูล (ใช้ parseFloat เพื่อแปลง string เป็น number)
  const dbPricingData = voucherData?.pricing;
  const calculatedVatAmount = parseFloat(dbPricingData?.vat_amount || 0);
  const calculatedTotal =
    parseFloat(dbPricingData?.total_amount || 0) ||
    calculatedSubtotal + calculatedVatAmount;

  const handleConfirmPrint = async () => {
    setGenerating(true);

    try {
      const vcResult = await generateVCForVoucher(voucherId);

      if (vcResult.success) {
        // อัพเดท voucherData state
        setVoucherData((prev) => ({
          ...prev,
          voucher: {
            ...prev.voucher,
            vc_number: vcResult.vcNumber,
            vc_generated_at: new Date().toISOString(),
            status: "voucher_issued",
          },
        }));

        // เปิด DocumentViewer แทน alert
        setShowDocumentViewer(true);
        setShowPrintConfirm(false);
      } else {
        alert("ไม่สามารถสร้าง VC Number ได้: " + vcResult.error);
      }
    } catch (error) {
      console.error("Error generating VC:", error);
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrintClick = () => {
    if (voucherData?.voucher?.vc_number) {
      // มี VC แล้ว - เปิด DocumentViewer โดยตรง
      setShowDocumentViewer(true);
    } else {
      // ยังไม่มี VC - แสดง confirm modal เดิม
      setShowPrintConfirm(true);
    }
  };

  const handleEmailClick = () => {
    if (
      !voucherData?.voucher?.vc_number ||
      voucherData.voucher.vc_number.trim() === ""
    ) {
      alert("ไม่สามารถส่งอีเมลได้ กรุณาออกวาวเชอร์ก่อน");
      return;
    }
    setShowEmailModal(true);
  };

  const handleCloseEmailModal = () => {
    setShowEmailModal(false);
    setEmailNotification(null);
  };

  const handleEmailSent = (message) => {
    setEmailNotification(message);
    setTimeout(() => {
      setEmailNotification(null);
    }, 5000);
  };
  // Status Badge Helper
  const getStatusBadge = (status, vcNumber, vcGeneratedAt) => {
    if (status === "cancelled") {
      return (
        <div className="flex items-center">
          <AlertTriangle className="text-red-500 mr-2" size={18} />
          <div>
            <div className="text-base font-medium text-red-800">Cancelled</div>
            <div className="text-sm text-red-600">voucher ถูกยกเลิกแล้ว</div>
          </div>
        </div>
      );
    }

    if (vcNumber) {
      return (
        <div className="flex items-center">
          <CheckCircle className="text-green-500 mr-2" size={18} />
          <div>
            <div className="text-base font-medium text-gray-900">
              {vcNumber}
            </div>
            <div className="text-sm text-gray-600">
              {displayThaiDateTime(vcGeneratedAt)}
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
          Not Voucher
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 modal-backdrop bg-black flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <p className="text-center mt-4 text-base">
            กำลังโหลดข้อมูล voucher...
          </p>
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

  if (!voucherData) return null;

  return (
    <>
      <div className="fixed inset-0 modal-backdrop bg-black flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center">
            <h1 className="text-xl font-bold">
              รายละเอียด {formData.serviceType.toUpperCase()} Voucher:{" "}
              {formData.code || `#${voucherData.voucher.id}`}
            </h1>
            <div className="flex items-center space-x-2">
              {voucherData.voucher.status !== "cancelled" && (
                <>
                  {/* 🔲 Placeholder Print Button - Disabled */}
                  <button
                    className="p-2 hover:bg-blue-700 rounded-md transition-colors"
                    title="ออกวาวเชอร์"
                    onClick={handlePrintClick}
                  >
                    <Printer size={20} />
                  </button>

                  {/* 🔲 Placeholder Email Button - Disabled */}
                  {!showOnlyView && (
                    <button
                      className={`p-2 rounded-md transition-colors ${
                        voucherData?.voucher?.vc_number &&
                        voucherData.voucher.vc_number.trim() !== ""
                          ? "hover:bg-blue-700"
                          : "opacity-50 cursor-not-allowed"
                      }`}
                      title={
                        voucherData?.voucher?.vc_number &&
                        voucherData.voucher.vc_number.trim() !== ""
                          ? "ส่งอีเมล"
                          : "ต้องออกวาวเชอร์ก่อนส่งอีเมล"
                      }
                      onClick={handleEmailClick}
                      disabled={
                        !voucherData?.voucher?.vc_number ||
                        voucherData.voucher.vc_number.trim() === ""
                      }
                    >
                      <Mail size={20} />
                    </button>
                  )}
                </>
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

          {/* Content - Using SaleVoucher Components Structure */}
          <div className="flex-1 overflow-y-auto">
            <div className={SaleStyles.mainContent}>
              {/* 1. Customer & Dates - Using SaleHeader */}
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
                    totalAmount={calculatedTotal}
                    subtotalAmount={calculatedSubtotal}
                    vatAmount={calculatedVatAmount}
                    globalEditMode={globalEditMode}
                    setGlobalEditMode={setGlobalEditMode}
                    readOnly={true}
                  />
                </div>
              </div>

              {/* 2. Passengers & Supplier */}
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
                    readOnly={true}
                  />
                  <VoucherServiceSection
                    formData={formData}
                    setFormData={setFormData}
                    readOnly={true}
                  />
                </div>
              </div>

              {/* 3. Service Details & Trip Info */}
              <VoucherDetailsSection
                formData={formData}
                setFormData={setFormData}
                readOnly={true}
              />

              {/* 4. Pricing Summary - Using PricingSummarySection */}
              <PricingSummarySection
                pricing={pricing}
                updatePricing={updatePricing}
                setFormData={setFormData}
                extras={extras}
                readOnly={true}
                // ✅ ส่ง VAT จากฐานข้อมูลแทน form
                actualVatAmount={calculatedVatAmount}
                actualVatPercent={dbPricingData?.vat_percent || 0}
                actualTotal={calculatedTotal}
              />

              {/* 5. Payment Methods - Custom Implementation like FlightTicketDetail */}
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
                        <div className="space-y-3">
                          <div>
                            <span className="text-sm text-gray-600">
                              วิธีการชำระเงิน:
                            </span>
                            <div className="font-medium text-base mt-1">
                              {(() => {
                                const method =
                                  formData.paymentMethod?.toLowerCase();
                                switch (method) {
                                  case "creditcard":
                                    return "เครดิตการ์ด";
                                  case "banktransfer":
                                    return "โอนเงินผ่านธนาคาร";
                                  case "cash":
                                    return "เงินสด";
                                  case "other":
                                    return "อื่น ๆ";
                                  default:
                                    return formData.paymentMethod || "-";
                                }
                              })()}
                            </div>
                          </div>
                          {formData.companyPaymentDetails && (
                            <div>
                              <span className="text-sm text-gray-600">
                                รายละเอียด:
                              </span>
                              <div className="font-medium text-base mt-1 p-2 bg-gray-50 rounded border border-gray-200 uppercase">
                                {formData.companyPaymentDetails}
                              </div>
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
                        <div className="space-y-3">
                          <div>
                            <span className="text-sm text-gray-600">
                              วิธีการชำระเงิน:
                            </span>
                            <div className="font-medium text-base mt-1">
                              {(() => {
                                const method =
                                  formData.customerPayment?.toLowerCase();
                                switch (method) {
                                  case "creditcard":
                                    return "เครดิตการ์ด VISA / MSTR / AMEX / JCB";
                                  case "banktransfer":
                                    return "โอนเงินผ่านธนาคาร";
                                  case "cash":
                                    return "เงินสด";
                                  case "credit":
                                    return "เครดิต";
                                  case "other":
                                    return "อื่น ๆ";
                                  default:
                                    return formData.customerPayment || "-";
                                }
                              })()}
                            </div>
                          </div>
                          {formData.customerPaymentDetails && (
                            <div>
                              <span className="text-sm text-gray-600">
                                รายละเอียด:
                              </span>
                              <div className="font-medium text-base mt-1 p-2 bg-gray-50 rounded border border-gray-200 uppercase">
                                {formData.customerPaymentDetails}
                              </div>
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

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
            <div className="flex items-center space-x-6">
              {/* Status info */}
              <div className="flex items-center space-x-4">
                <div>
                  <div className="text-gray-600 mb-1 text-sm">สถานะรายการ</div>
                  {getStatusBadge(
                    voucherData.voucher.status,
                    voucherData.voucher.vc_number,
                    voucherData.voucher.vc_generated_at
                  )}
                </div>
                <div>
                  <div className="text-gray-600 mb-1 text-sm">สร้างโดย</div>
                  <div className="font-medium text-sm">
                    {voucherData.createdByName}
                  </div>
                  <div className="text-gray-600 text-sm">
                    {displayThaiDateTime(voucherData.voucher.created_at)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1 text-sm">อัปเดตโดย</div>
                  <div className="font-medium text-sm">
                    {voucherData.updatedByName}
                  </div>
                  <div className="text-gray-600 text-sm">
                    {displayThaiDateTime(voucherData.voucher.updated_at)}
                  </div>
                </div>
                {voucherData.voucher.cancelled_at && (
                  <div>
                    <div className="text-gray-600 mb-1 text-sm">ยกเลิกโดย</div>
                    <div className="font-medium text-sm">
                      {voucherData.cancelledByName}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {displayThaiDateTime(voucherData.voucher.cancelled_at)}
                    </div>
                    <div className="text-gray-600 text-sm">
                      เหตุผล: {voucherData.voucher.cancel_reason || "-"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions - ✅ Only Close button, NO Edit button */}
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
      <PrintConfirmModal
        isOpen={showPrintConfirm}
        onClose={() => setShowPrintConfirm(false)}
        onConfirm={handleConfirmPrint}
        loading={generating}
        documentType="voucher" // เพิ่มบรรทัดนี้
      />
      {showDocumentViewer && (
        <DocumentViewer
          isOpen={showDocumentViewer}
          onClose={() => {
            setShowDocumentViewer(false);
            onClose();
          }}
          documentType="voucher"
          voucherId={voucherId}
          onDocumentGenerated={() => {
            console.log("Voucher document generated");
          }}
        />
      )}

      <EmailDocument
        isOpen={showEmailModal}
        onClose={handleCloseEmailModal}
        documentType="voucher"
        recordId={voucherId}
        onEmailSent={handleEmailSent}
        userId={user?.id} // ✅ ส่ง userId สำหรับ Activity Log
      />
    </>
  );
};

export default BusBoatTourDetail;
