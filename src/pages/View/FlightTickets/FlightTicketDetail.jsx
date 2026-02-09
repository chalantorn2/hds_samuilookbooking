import React, { useState, useEffect } from "react";
import { apiClient } from "../../../services/apiClient";
import { generatePOForTicket } from "../../../services/ticketService";
import EmailDocument from "../../../components/documents/email/EmailDocument";
import { useAuth } from "../../../pages/Login/AuthContext";
import {
  Printer,
  Mail,
  X,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  Edit2,
} from "lucide-react";

// ✅ เปลี่ยนจาก PrintDocument เป็น DocumentViewer
import { DocumentViewer } from "../../../components/documents";

import SaleHeader from "../../Sales/common/SaleHeader";
import PaymentMethodSection from "../../Sales/common/PaymentMethodSection";
import PassengerSection from "../../Sales/ticket/PassengerSection";
import SupplierSection from "../../Sales/common/SupplierSection";
import RouteSection from "../../Sales/ticket/RouteSection";
import TicketTypeSection from "../../Sales/ticket/TicketTypeSection";
import ExtrasSection from "../../Sales/ticket/ExtrasSection";
import PricingSummarySection from "../../Sales/ticket/PricingSummarySection";
import usePricing from "../../../hooks/usePricing";
import SaleStyles, { combineClasses } from "../../Sales/common/SaleStyles";
import {
  formatCustomerAddress,
  displayThaiDateTime,
  formatDateOnly,
} from "../../../utils/helpers";
import ReceiptSelectionModal from "../../../components/documents/modals/ReceiptSelectionModal";
import PrintConfirmModal from "../../../components/documents/modals/PrintConfirmModal";
import { generateRCForTicket } from "../../../services/referencesService";
import {
  getDisplayCustomerName,
  getDisplayCustomerAddress,
  getDisplayCustomerPhone,
  getDisplayCustomerIdNumber,
  getDisplayCustomerBranchType,
  getDisplayCustomerBranchNumber,
} from "../../../utils/customerOverrideHelpers";

const FlightTicketDetail = ({
  ticketId,
  onClose,
  onEdit,
  onPOGenerated,
  showOnlyPrint = false,
  isFromInvoiceList = false,
}) => {
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailNotification, setEmailNotification] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptSelectionData, setReceiptSelectionData] = useState(null);
  const [printMode, setPrintMode] = useState("invoice"); // "invoice" หรือ "receipt"
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);

  // ✅ เพิ่ม useAuth สำหรับ Activity Log
  const { user } = useAuth();

  // Use same pricing hook as SaleTicket
  const { pricing, updatePricing, calculateSubtotal } = usePricing();

  // Form state matching SaleTicket structure
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
    ticketType: "bsp",
    paymentMethod: "",
    companyPaymentDetails: "",
    customerPayment: "",
    customerPaymentDetails: "",
    vatPercent: "0",
    code: "",
    b2bDetails: "",
    otherDetails: "",
    tgDetails: "",
    branchType: "Head Office",
    branchNumber: "",
  });

  // Components state matching SaleTicket
  const [passengers, setPassengers] = useState([
    { id: 1, name: "", type: "ADT", ticketNumber: "", ticketCode: "" },
  ]);

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

  // Dummy states for SaleHeader compatibility
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [globalEditMode, setGlobalEditMode] = useState(false);

  useEffect(() => {
    const fetchTicketDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
        // OLD: const { data: ticket, error } = await supabase.from("bookings_ticket").select(...)
        const response = await apiClient.get("/gateway.php", {
          action: "getFlightTicketDetailById",
          ticketId: ticketId,
        });

        if (!response.success) {
          throw new Error(response.error || "ไม่สามารถโหลดข้อมูลตั๋วได้");
        }

        const ticket = response.data;

        // Fetch user information - เปลี่ยนจาก Supabase เป็น API Gateway
        const userIds = [
          ticket.created_by,
          ticket.updated_by,
          ticket.cancelled_by,
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
            // ไม่ throw error เพราะข้อมูล user ไม่ใช่ข้อมูลหลัก
          }
        }

        // เก็บ logic การ process ข้อมูลเหมือนเดิม
        setTicketData({
          ...ticket,
          createdByName: userMap.get(ticket.created_by) || "-",
          updatedByName: userMap.get(ticket.updated_by) || "-",
          cancelledByName: userMap.get(ticket.cancelled_by) || "-",
        });

        mapDataToFormState(ticket);
      } catch (err) {
        console.error("Error fetching ticket details:", err);
        setError(err.message || "ไม่สามารถโหลดข้อมูลตั๋วได้");
      } finally {
        setLoading(false);
      }
    };

    if (ticketId) fetchTicketDetails();
  }, [ticketId]);

  const mapDataToFormState = (ticket) => {
    const ticketWithOverride = {
      ...ticket,
      customer_override_data: ticket.customer_override_data,
    };
    const detail = ticket.tickets_detail?.[0] || {};
    const additional = ticket.ticket_additional_info?.[0] || {};
    const pricingData = ticket.tickets_pricing?.[0] || {};

    // Map formData
    setFormData({
      customer: getDisplayCustomerName(ticketWithOverride),
      contactDetails: getDisplayCustomerAddress(ticketWithOverride),
      phone: getDisplayCustomerPhone(ticketWithOverride),
      id: getDisplayCustomerIdNumber(ticketWithOverride),
      customerCode: ticket.customer?.code || "",
      date: detail.issue_date?.split("T")[0] || "",
      creditDays: String(detail.credit_days || 0),
      dueDate: detail.due_date?.split("T")[0] || "",
      salesName: "",
      supplier: ticket.supplier?.code || "",
      supplierName: ticket.supplier?.name || "",
      supplierId: ticket.supplier?.id || null,
      supplierNumericCode: ticket.supplier?.numeric_code || "",
      ticketType: (additional.ticket_type || "bsp").toLowerCase(),
      paymentMethod: additional.company_payment_method || "",
      companyPaymentDetails: additional.company_payment_details || "",
      customerPayment: additional.customer_payment_method || "",
      customerPaymentDetails: additional.customer_payment_details || "",
      vatPercent: String(detail.vat_percent || 0),
      code: additional.code || "",
      b2bDetails:
        additional.ticket_type?.toLowerCase() === "b2b"
          ? additional.ticket_type_details || ""
          : "",
      otherDetails:
        additional.ticket_type?.toLowerCase() === "other"
          ? additional.ticket_type_details || ""
          : "",
      tgDetails:
        additional.ticket_type?.toLowerCase() === "tg"
          ? additional.ticket_type_details || ""
          : "",
      branchType: getDisplayCustomerBranchType(ticketWithOverride),
      branchNumber: getDisplayCustomerBranchNumber(ticketWithOverride),
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

    // Map passengers
    const mappedPassengers = ticket.tickets_passengers?.length
      ? ticket.tickets_passengers.map((p, index) => ({
          id: index + 1,
          name: p.passenger_name || "",
          type: p.age || "ADT",
          ticketNumber: p.ticket_number || "",
          ticketCode: p.ticket_code || "",
        }))
      : [{ id: 1, name: "", type: "ADT", ticketNumber: "", ticketCode: "" }];
    setPassengers(mappedPassengers);

    // Map routes
    const mappedRoutes = ticket.tickets_routes?.length
      ? ticket.tickets_routes.map((r, index) => ({
          id: index + 1,
          date: r.date || "",
          flight: r.flight_number || "",
          rbd: r.rbd || "",
          origin: r.origin || "",
          destination: r.destination || "",
          departure: r.departure_time || "",
          arrival: r.arrival_time || "",
        }))
      : [
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
        ];
    setRoutes(mappedRoutes);

    // Map extras
    const mappedExtras = ticket.tickets_extras?.length
      ? ticket.tickets_extras.map((e, index) => ({
          id: index + 1,
          description: e.description || "",
          net_price: e.net_price || 0,
          sale_price: e.sale_price || 0,
          quantity: e.quantity || 1,
          total_amount: e.total_amount || 0,
        }))
      : [
          {
            id: 1,
            description: "",
            net_price: 0,
            sale_price: 0,
            quantity: 1,
            total_amount: 0,
          },
        ];
    setExtras(mappedExtras);
  };

  // Calculate totals
  const calculatedSubtotal =
    calculateSubtotal() +
    extras.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
  // ✅ ดึงค่า VAT และ Total จาก tickets_detail (ไม่ใช่ tickets_pricing)
  const dbDetailData = ticketData?.tickets_detail?.[0];
  const dbPricingData = ticketData?.tickets_pricing?.[0];

  // ✅ Fallback: ถ้า vat_amount = 0 แต่ vat_percent > 0 ให้คำนวณใหม่
  const dbVatAmount = parseFloat(dbDetailData?.vat_amount || 0);
  const dbVatPercent = parseFloat(dbDetailData?.vat_percent || 0);
  const dbGrandTotal = parseFloat(dbDetailData?.grand_total || 0);

  const calculatedVatAmount = (dbVatAmount === 0 && dbVatPercent > 0)
    ? (calculatedSubtotal * dbVatPercent) / 100
    : dbVatAmount;

  const calculatedTotal = (dbVatAmount === 0 && dbVatPercent > 0)
    ? parseFloat((calculatedSubtotal + calculatedVatAmount).toFixed(2))
    : dbGrandTotal;

  const handlePrintClick = () => {
    if (isFromInvoiceList) {
      // ⭐ เพิ่มการตรวจสอบว่ามี RC แล้วหรือไม่
      if (ticketData.rc_number && ticketData.rc_number.trim() !== "") {
        // มี RC แล้ว → ถามว่าต้องการแก้ไขไหม
        const confirmEdit = window.confirm(
          `มี Receipt Number: ${ticketData.rc_number} อยู่แล้ว\n` +
            `คุณต้องการแก้ไขข้อมูล Receipt นี้หรือไม่?\n\n` +
            `- กด OK = แก้ไขทับข้อมูลเดิม\n` +
            `- กด Cancel = ยกเลิก`
        );

        if (confirmEdit) {
          setShowReceiptModal(true);
        }
      } else {
        // ไม่มี RC → สร้างใหม่
        setShowReceiptModal(true);
      }
    } else {
      // จาก Flight Tickets → ตรวจสอบว่ามี PO แล้วหรือไม่
      if (ticketData.po_number && ticketData.po_number.trim() !== "") {
        // มี PO แล้ว → พิมพ์ทันที ไม่ต้องยืนยัน
        setPrintMode("invoice");
        setShowPrintModal(true);
      } else {
        // ไม่มี PO → แสดง PrintConfirmModal เพื่อยืนยันการออก PO
        setShowPrintConfirmModal(true);
      }
    }
  };

  const handleConfirmPrint = () => {
    setShowPrintConfirmModal(false);
    setPrintMode("invoice");
    setShowPrintModal(true);
  };

  const handleReceiptConfirm = async (selectionData) => {
    setReceiptLoading(true);

    try {
      // ⭐ ส่ง selectionData ไปด้วยเมื่อสร้าง RC Number
      // ⭐ เพิ่ม allowOverwrite: true เมื่อมี RC แล้ว
      const hasExistingRC =
        ticketData.rc_number && ticketData.rc_number.trim() !== "";
      const rcResult = await generateRCForTicket(
        ticketId,
        selectionData,
        hasExistingRC
      );

      if (!rcResult.success) {
        alert("ไม่สามารถสร้าง RC Number ได้: " + rcResult.error);
        return;
      }

      // อัพเดต ticketData ด้วย RC Number
      setTicketData((prev) => ({
        ...prev,
        rc_number: rcResult.rcNumber,
        rc_generated_at: new Date().toISOString(),
        rc_selection_data: selectionData, // ⭐ เพิ่มการเก็บ selection data ใน state
      }));

      // เรียก onPOGenerated เพื่ออัพเดต parent component
      if (onPOGenerated) {
        onPOGenerated();
      }

      // เก็บข้อมูลที่เลือกและเปิด Print Modal
      setReceiptSelectionData(selectionData);
      setPrintMode("receipt");
      setShowReceiptModal(false);
      setShowPrintModal(true);

      console.log("✅ RC Number created with selection data:", {
        rcNumber: rcResult.rcNumber,
        selectionDataSaved: rcResult.selectionDataSaved,
        selectedPassengers: selectionData.passengers?.length || 0,
        selectedExtras: selectionData.extras?.length || 0,
      });
    } catch (error) {
      console.error("Error creating Receipt:", error);
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleClosePrintModal = () => {
    setShowPrintModal(false);
    // Reset receipt data เมื่อปิด
    setReceiptSelectionData(null);
    setPrintMode("invoice");
  };

  const handlePOGenerated = () => {
    if (onPOGenerated) {
      onPOGenerated();
    }

    if (ticketId) {
      const fetchUpdatedData = async () => {
        try {
          const { data: updatedTicket, error } = await supabase
            .from("bookings_ticket")
            .select("po_number, po_generated_at, status")
            .eq("id", ticketId)
            .single();

          if (!error && updatedTicket) {
            setTicketData((prev) => ({
              ...prev,
              po_number: updatedTicket.po_number,
              po_generated_at: updatedTicket.po_generated_at,
              status: updatedTicket.status,
            }));
          }
        } catch (err) {
          console.error("Error refreshing ticket data:", err);
        }
      };
      fetchUpdatedData();
    }
  };

  const handleEmailClick = () => {
    if (!ticketData.po_number || ticketData.po_number.trim() === "") {
      alert("ไม่สามารถส่งอีเมลได้ กรุณาออกเลข PO ก่อน");
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

  // 8. แก้ไขการแสดง Receipt Status ใน getStatusBadge
  const getReceiptStatusDisplay = (ticket) => {
    if (ticket.rc_number && ticket.rc_number.trim() !== "") {
      return (
        <div className="flex items-center">
          <CheckCircle className="text-purple-500 mr-2" size={18} />{" "}
          {/* แก้นี้ */}
          <div>
            <div className="text-base font-medium text-gray-900">
              {ticket.rc_number}
            </div>
            <div className="text-sm text-gray-600">
              {displayThaiDateTime(ticket.rc_generated_at)}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const getBranchDisplay = (branchType, branchNumber) => {
    if (branchType === "Branch" && branchNumber) {
      return `${branchType} ${branchNumber}`;
    }
    return branchType || "Head Office";
  };

  const getStatusBadge = (status, poNumber, poGeneratedAt, invoiceNumber, invoiceGeneratedAt) => {
    // ตรวจสอบสถานะยกเลิกก่อน
    if (status === "cancelled") {
      return (
        <div className="flex items-center">
          <AlertTriangle className="text-red-500 mr-2" size={18} />
          <div>
            <div className="text-base font-medium text-red-800">Cancelled</div>
            <div className="text-sm text-red-600">ตั๋วถูกยกเลิกแล้ว</div>
          </div>
        </div>
      );
    }

    // แสดง INV และ PO (ถ้ามี) แนวนอนข้างๆกัน
    const hasInvoice = invoiceNumber && invoiceNumber.trim() !== "";
    const hasPO = poNumber && poNumber.trim() !== "";

    if (hasInvoice || hasPO) {
      return (
        <div className="flex items-center gap-4">
          {hasInvoice && (
            <div className="flex items-center">
              <CheckCircle className="text-blue-500 mr-2" size={18} />
              <div>
                <div className="text-base font-medium text-gray-900">
                  {invoiceNumber}
                </div>
                <div className="text-sm text-gray-600">
                  {displayThaiDateTime(invoiceGeneratedAt)}
                </div>
              </div>
            </div>
          )}
          {hasPO && (
            <div className="flex items-center">
              <CheckCircle className="text-green-500 mr-2" size={18} />
              <div>
                <div className="text-base font-medium text-gray-900">
                  {poNumber}
                </div>
                <div className="text-sm text-gray-600">
                  {displayThaiDateTime(poGeneratedAt)}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    } else {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
          Not Invoiced
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

  if (!ticketData) return null;

  return (
    <>
      <div className="fixed inset-0 modal-backdrop bg-black flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header - same as original */}
          <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center">
            <h1 className="text-xl font-bold">
              รายละเอียดตั๋วเครื่องบิน:{" "}
              {ticketData.reference_number || `#${ticketData.id}`}
            </h1>
            <div className="flex items-center space-x-2">
              {ticketData.status !== "cancelled" && (
                <button
                  className="p-2 hover:bg-blue-700 rounded-md transition-colors"
                  title="พิมพ์"
                  onClick={handlePrintClick}
                >
                  <Printer size={20} />
                </button>
              )}

              {/* แสดงปุ่ม Email เฉพาะเมื่อ showOnlyPrint เป็น false */}
              {!showOnlyPrint && ticketData.status !== "cancelled" && (
                <button
                  className={`p-2 rounded-md transition-colors ${
                    ticketData.po_number && ticketData.po_number.trim() !== ""
                      ? "hover:bg-blue-700"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                  title={
                    ticketData.po_number && ticketData.po_number.trim() !== ""
                      ? "ส่งอีเมล"
                      : "ต้องออกเลข PO ก่อนส่งอีเมล"
                  }
                  onClick={handleEmailClick}
                  disabled={
                    !ticketData.po_number || ticketData.po_number.trim() === ""
                  }
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

          {/* Content - Using SaleTicket components */}
          <div className="flex-1 overflow-y-auto">
            <div className={SaleStyles.mainContent}>
              {/* 1. Customer & Dates */}
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
                  <PassengerSection
                    passengers={passengers}
                    setPassengers={setPassengers}
                    updatePricing={updatePricing}
                    pricing={pricing}
                    formData={formData}
                    setFormData={setFormData}
                    readOnly={true}
                  />
                  <SupplierSection
                    formData={formData}
                    setFormData={setFormData}
                    readOnly={true}
                  />
                </div>
              </div>

              {/* 3. Routes & Ticket Type */}
              <div className={SaleStyles.section.container}>
                <div className={SaleStyles.section.headerWrapper}>
                  <h2 className={SaleStyles.section.headerTitle}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                    </svg>
                    ประเภทตั๋วและเส้นทางการเดินทาง
                  </h2>
                </div>
                <div className="grid grid-cols-10 gap-2">
                  <RouteSection
                    routes={routes}
                    setRoutes={setRoutes}
                    readOnly={true}
                  />
                  <TicketTypeSection
                    formData={formData}
                    setFormData={setFormData}
                    readOnly={true}
                  />
                </div>
              </div>

              {/* 4. Extras */}
              <ExtrasSection
                extras={extras}
                setExtras={setExtras}
                readOnly={true}
              />

              {/* 5. Pricing Summary */}
              <PricingSummarySection
                pricing={pricing}
                updatePricing={updatePricing}
                setFormData={setFormData}
                extras={extras}
                readOnly={true}
                // ✅ ส่งค่า VAT และ Total ที่คำนวณแล้ว (มี fallback)
                actualVatAmount={calculatedVatAmount}
                actualVatPercent={dbVatPercent}
                actualTotal={calculatedTotal}
              />

              {/* 6. Payment Methods - Simple Display */}
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
                    ticketData.status,
                    ticketData.po_number,
                    ticketData.po_generated_at,
                    ticketData.invoice_number,
                    ticketData.invoice_generated_at
                  )}
                </div>
                <div>
                  <div className="text-gray-600 mb-1 text-sm">สร้างโดย</div>
                  <div className="font-medium text-sm">
                    {ticketData.createdByName}
                  </div>
                  <div className="text-gray-600 text-sm">
                    {displayThaiDateTime(ticketData.created_at)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1 text-sm">อัปเดตโดย</div>
                  <div className="font-medium text-sm">
                    {ticketData.updatedByName}
                  </div>
                  <div className="text-gray-600 text-sm">
                    {displayThaiDateTime(ticketData.updated_at)}
                  </div>
                </div>
                {getReceiptStatusDisplay(ticketData) && (
                  <div>
                    <div className="text-gray-600 mb-1 text-sm">
                      Receipt Status
                    </div>
                    {getReceiptStatusDisplay(ticketData)}
                  </div>
                )}
                {ticketData.cancelled_at && (
                  <div>
                    <div className="text-gray-600 mb-1 text-sm">ยกเลิกโดย</div>
                    <div className="font-medium text-sm">
                      {ticketData.cancelledByName}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {displayThaiDateTime(ticketData.cancelled_at)}
                    </div>
                    <div className="text-gray-600 text-sm">
                      เหตุผล: {ticketData.cancel_reason || "-"}
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

      {/* Modals - แก้ไขใช้ DocumentViewer แทน PrintDocument */}
      <DocumentViewer
        isOpen={showPrintModal}
        onClose={() => {
          handleClosePrintModal();
          onClose();
        }}
        documentType={printMode} // "invoice" หรือ "receipt"
        ticketId={ticketId}
        receiptData={receiptSelectionData}
        onPOGenerated={handlePOGenerated}
        onDocumentGenerated={handlePOGenerated} // สำหรับ RC Number
      />

      <EmailDocument
        isOpen={showEmailModal}
        onClose={handleCloseEmailModal}
        documentType="invoice"
        recordId={ticketId}
        onEmailSent={handleEmailSent}
        userId={user?.id} // ✅ ส่ง userId สำหรับ Activity Log
      />

      <ReceiptSelectionModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        onConfirm={handleReceiptConfirm}
        ticketData={ticketData}
        loading={receiptLoading}
      />

      <PrintConfirmModal
        isOpen={showPrintConfirmModal}
        onClose={() => setShowPrintConfirmModal(false)}
        onConfirm={handleConfirmPrint}
        documentType="invoice"
        documentNumber={ticketData?.reference_number || `#${ticketData?.id}`}
      />
    </>
  );
};

export default FlightTicketDetail;
