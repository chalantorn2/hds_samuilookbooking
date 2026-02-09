import React, { useState, useEffect } from "react";
import { apiClient } from "../../../services/apiClient";
import {
  User,
  Calendar,
  Save,
  ChevronLeft,
  Trash2,
  X,
  Phone,
  FileText,
  Tag,
  MapPin,
} from "lucide-react";
import { useAlertDialogContext } from "../../../contexts/AlertDialogContext";
import usePricing from "../../../hooks/usePricing";
import SaleStyles, { combineClasses } from "../../Sales/common/SaleStyles";
import PaymentMethodSection from "../../Sales/common/PaymentMethodSection";
import VoucherPassengerSection from "../../Sales/voucher/VoucherPassengerSection";
import VoucherServiceSection from "../../Sales/voucher/VoucherServiceSection";
import VoucherDetailsSection from "../../Sales/voucher/VoucherDetailsSection";
import PricingSummarySection from "../../Sales/ticket/PricingSummarySection";
import SaleHeader from "../../Sales/common/SaleHeader";
import { formatCustomerAddress } from "../../../utils/helpers";
import CancelReasonModal from "../common/CancelReasonModal";
import { useAuth } from "../../Login/AuthContext";
import { getCustomers } from "../../../services/customerService";
import { generateVCForVoucher } from "../../../services/voucherService";
import { createCustomerOverrideData } from "../../../utils/helpers";
import {
  getDisplayCustomerName,
  getDisplayCustomerAddress,
  getDisplayCustomerPhone,
  getDisplayCustomerIdNumber,
  getDisplayCustomerBranchType,
  getDisplayCustomerBranchNumber,
} from "../../../utils/helpers";

const BusBoatTourDetail_Edit = ({ voucherId, onClose, onSave }) => {
  const { user } = useAuth();
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [globalEditMode, setGlobalEditMode] = useState(false);
  const showAlert = useAlertDialogContext();
  const [voucherData, setVoucherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [generatingVC, setGeneratingVC] = useState(false);

  // Use same pricing hook as SaleVoucher
  const { pricing, updatePricing, calculateSubtotal, calculateTotal } =
    usePricing();

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

  // Fetch and map voucher data
  useEffect(() => {
    const fetchVoucherData = async () => {
      if (!voucherId) return;

      setLoading(true);
      try {
        // 🔄 เปลี่ยนจาก Supabase complex select เป็น API Gateway
        // OLD: const { data: ticket, error } = await supabase.from("bookings_ticket").select(...)
        const response = await apiClient.get("/gateway.php", {
          action: "getVoucherForEdit",
          voucherId: voucherId,
        });

        if (!response.success) {
          throw new Error(response.error || "ไม่สามารถโหลดข้อมูลได้");
        }

        const voucher = response.data;
        setVoucherData(voucher);
        mapDataToFormState(voucher);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVoucherData();
  }, [voucherId]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      // 🔄 เปลี่ยนจาก getSuppliers เป็น API Gateway (ใช้ supplierService ที่ migrate แล้ว)
      // ฟังก์ชันนี้ใช้ supplierService ที่ migrate ไปแล้ว ไม่ต้องแก้
      const data = await getVoucherSuppliers();
      setSuppliers(data);
    };
    fetchSuppliers();
  }, []);

  // Map database data to component state
  const mapDataToFormState = (voucher) => {
    // ✅ เพิ่ม customer_override_data ให้ voucher object
    const voucherWithOverride = {
      ...voucher,
      customer_override_data: voucher.customer_override_data, // ย้ายจาก root มาใส่ใน voucher object
    };

    const detail = voucher.details || {};
    const additional = voucher.additionalInfo || {};
    const pricingData = voucher.pricing || {};

    // ✅ ใช้ voucherWithOverride แทน voucher
    setFormData({
      customer: getDisplayCustomerName(voucherWithOverride),
      customerCode: voucher.customer?.code || "",
      contactDetails: getDisplayCustomerAddress(voucherWithOverride),
      phone: getDisplayCustomerPhone(voucherWithOverride),
      id: getDisplayCustomerIdNumber(voucherWithOverride),
      date: voucher.voucher?.issue_date?.split("T")[0] || "",
      creditDays: String(voucher.voucher?.credit_days || 0),
      dueDate: voucher.voucher?.due_date?.split("T")[0] || "",
      salesName: "",
      supplier: voucher.supplier?.code || "",
      supplierName: voucher.supplier?.name || "",
      supplierId: voucher.supplier?.id || null,
      serviceType: voucher.voucher?.service_type || "bus",
      paymentMethod:
        mapPaymentMethodFromDB(additional.company_payment_method) || "",
      companyPaymentDetails: additional.company_payment_details || "",
      customerPayment:
        mapPaymentMethodFromDB(additional.customer_payment_method) || "",
      customerPaymentDetails: additional.customer_payment_details || "",
      vatPercent: String(detail.vat_percent || 0),
      code: voucher.voucher?.reference_number || "",
      description: detail?.description || "",
      tripDate: detail?.trip_date || "",
      pickupTime: detail?.pickup_time || "",
      hotel: detail?.hotel || "",
      roomNo: detail?.room_no || "",
      reference: detail?.reference || "",
      remark: detail?.remark || "",
      branchType: getDisplayCustomerBranchType(voucherWithOverride),
      branchNumber: getDisplayCustomerBranchNumber(voucherWithOverride),
    });

    // Map pricing - แก้ไขการคำนวณ total ให้ถูกต้อง
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
    const mappedPassengers = voucher.passengers?.length
      ? voucher.passengers.map((p, index) => ({
          id: index + 1,
          name: p.passenger_name || "",
          type: p.passenger_type || "ADT",
          voucherNumber: p.voucher_number || "",
        }))
      : [{ id: 1, name: "", type: "ADT", voucherNumber: "" }];
    setPassengers(mappedPassengers);

    // Map extras - vouchers ไม่มี extras แต่เก็บ structure
    const mappedExtras = [
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

    // ✅ แก้ไขส่วน setSelectedCustomer
    if (voucher.customer) {
      setSelectedCustomer({
        id: voucher.customer.id,
        name: getDisplayCustomerName(voucherWithOverride),
        code: voucher.customer.code,
        address: getDisplayCustomerAddress(voucherWithOverride),
        phone: getDisplayCustomerPhone(voucherWithOverride),
        id_number: getDisplayCustomerIdNumber(voucherWithOverride),
        branch_type: getDisplayCustomerBranchType(voucherWithOverride),
        branch_number: getDisplayCustomerBranchNumber(voucherWithOverride),
        credit_days: voucher.customer.credit_days,
      });
    }
  };

  const getVoucherSuppliers = async (search = "", limit = 100) => {
    try {
      // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
      const response = await apiClient.get("/gateway.php", {
        action: "getVoucherSuppliers",
        search: search,
        limit: limit,
      });

      if (!response.success) {
        console.error("Error fetching suppliers:", response.error);
        return [];
      }

      return response.data;
    } catch (err) {
      console.error("Error in getVoucherSuppliers:", err);
      return [];
    }
  };

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

  // Calculate totals
  const calculatedSubtotal =
    calculateSubtotal() +
    extras.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
  const dbPricingData = voucherData?.pricing;
  const calculatedVatAmount = parseFloat(dbPricingData?.vat_amount || 0);
  // ✅ แก้เฉพาะ Total ให้คำนวณใหม่แทนใช้จากฐานข้อมูล และแปลงเป็น number
  const calculatedTotal = parseFloat(
    (calculatedSubtotal + calculatedVatAmount).toFixed(2)
  );

  // Save changes with confirmation
  const handleSubmit = async (e) => {
    e.preventDefault();

    // แสดง confirmation dialog ก่อนบันทึก (เก็บ logic เดิม)
    const confirmed = await showAlert({
      title: "ยืนยันการแก้ไข",
      description: `คุณต้องการบันทึกการแก้ไข voucher ${voucherData.voucher?.reference_number} ใช่หรือไม่?`,
      confirmText: "ยืนยัน",
      cancelText: "ยกเลิก",
    });

    if (!confirmed) return; // ถ้าผู้ใช้เลือก "ยกเลิก" ให้หยุดการทำงาน

    setSaving(true);

    try {
      // อัปเดตข้อมูลลูกค้าก่อน (ใช้ฟังก์ชันที่แก้ไปแล้ว)
      const customerOverrideData = createCustomerOverrideData(
        formData,
        selectedCustomer
      );

      // เตรียมข้อมูลสำหรับส่งไป API Gateway
      const updateData = {
        // Customer data (if needed)
        customerOverride: customerOverrideData,

        // Main voucher data
        mainVoucher: {
          customer_id: selectedCustomer?.id,
          information_id: formData.supplierId,
          service_type: formData.serviceType,
          updated_by: user?.id, // ✅ เพิ่ม updated_by
        },

        // Voucher detail data
        voucherDetails: {
          description: formData.description || "",
          trip_date: formData.tripDate || "",
          pickup_time: formData.pickupTime || "",
          hotel: formData.hotel || "",
          room_no: formData.roomNo || "",
          reference: formData.reference || "",
          remark: formData.remark || "",
          subtotal_before_vat: parseFloat(calculatedSubtotal.toFixed(2)),
          vat_percent: parseFloat(formData.vatPercent) || 0,
          vat_amount: parseFloat(calculatedVatAmount.toFixed(2)),
          grand_total: parseFloat(calculatedTotal.toFixed(2)),
        },

        // Additional info data
        additionalInfo: {
          company_payment_method: formData.paymentMethod || "",
          company_payment_details: formData.companyPaymentDetails || "",
          customer_payment_method: formData.customerPayment || "",
          customer_payment_details: formData.customerPaymentDetails || "",
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
          vat_percent: parseFloat(formData.vatPercent) || 0,
          vat_amount: parseFloat(calculatedVatAmount.toFixed(2)),
          total_amount: parseFloat(calculatedTotal.toFixed(2)),
        },

        // Passengers data (clean data)
        passengers: passengers
          .filter((p) => p.name?.trim())
          .map((p) => ({
            passenger_name: p.name,
            passenger_type: p.type,
            voucher_number: p.voucherNumber || "",
          })),
      };

      // ✅ เพิ่ม debug log
      console.log("=== DEBUG: Update Data ===");
      console.log("voucherId:", voucherId);
      console.log("selectedCustomer:", selectedCustomer);
      console.log("formData.supplierId:", formData.supplierId);
      console.log("pricing:", pricing);
      console.log("passengers:", passengers);
      console.log("updateData:", JSON.stringify(updateData, null, 2));
      console.log("========================");

      // แก้จาก POST เป็น GET เพื่อส่งใน $_REQUEST
      const response = await apiClient.post("/gateway.php", {
        action: "updateVoucherComplete", // ✅ ถูก action
        voucherId: voucherId,
        data: updateData,
      });

      if (!response.success) {
        console.error("API Response Error:", response);
        throw new Error(response.error || "ไม่สามารถบันทึกข้อมูลได้");
      }

      // แสดง success message และปิด modal
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

  // Cancel voucher
  const handleCancel = async (reason) => {
    setCancelling(true);
    try {
      // ดึงข้อมูล user ปัจจุบันจาก AuthContext
      const currentUserId = user?.id; // ใช้จาก useAuth()

      if (!currentUserId) {
        throw new Error("ไม่พบข้อมูลผู้ใช้งาน");
      }

      // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
      // OLD: const { error } = await supabase.from("bookings_voucher").update(...).eq("id", voucherId);
      const response = await apiClient.post("/gateway.php", {
        action: "cancelVoucher",
        voucherId: voucherId,
        userId: currentUserId,
        cancelReason: reason,
      });

      if (!response.success) {
        throw new Error(response.error || "ไม่สามารถยกเลิก voucher ได้");
      }

      setShowCancelModal(false);
      onSave?.();
      onClose();
    } catch (err) {
      setError(err.message);
      await showAlert({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถยกเลิก voucher ได้: " + err.message,
        confirmText: "ตกลง",
      });
    } finally {
      setCancelling(false);
    }
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateTime) => {
    if (!dateTime) return "-";
    return new Date(dateTime).toLocaleDateString("th-TH");
  };

  // Generate VC Number
  const handleGenerateVC = async () => {
    if (!voucherData?.voucher?.id) return;

    const confirmed = await showAlert({
      title: "ยืนยันการออก VC Number",
      description: `คุณต้องการออก VC Number สำหรับ voucher ${voucherData.voucher.reference_number} ใช่หรือไม่?`,
      confirmText: "ยืนยัน",
      cancelText: "ยกเลิก",
    });

    if (!confirmed) return;

    setGeneratingVC(true);
    try {
      const result = await generateVCForVoucher(voucherData.voucher.id);

      if (result.success) {
        await showAlert({
          title: "สำเร็จ",
          description: `ออก VC Number สำเร็จ: ${result.vcNumber}`,
          confirmText: "ตกลง",
        });

        // Refresh data
        const response = await apiClient.get("/gateway.php", {
          action: "getVoucherForEdit",
          voucherId: voucherId,
        });

        if (response.success) {
          setVoucherData(response.data);
        }
      } else {
        throw new Error(result.error || "ไม่สามารถออก VC Number ได้");
      }
    } catch (err) {
      await showAlert({
        title: "เกิดข้อผิดพลาด",
        description: err.message,
        confirmText: "ตกลง",
      });
    } finally {
      setGeneratingVC(false);
    }
  };

  // Helper function to map database payment method to form values
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

  if (error && !voucherData) {
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

  if (!voucherData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center shrink-0">
          <h1 className="text-xl font-bold">
            แก้ไข {formData.serviceType.toUpperCase()} Voucher:{" "}
            {voucherData.voucher?.reference_number}
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

            {/* Customer & Dates - ใช้ SaleHeader */}
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
                  readOnly={true} // true เพื่อให้เป็น readonly
                />
              </div>
            </div>

            {/* Passengers & Service */}
            <div className={SaleStyles.section.container}>
              <div className={SaleStyles.section.headerWrapper}>
                <h2 className={SaleStyles.section.headerTitle}>
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
                  readOnly={false}
                />
                <VoucherServiceSection
                  formData={formData}
                  setFormData={setFormData}
                  suppliers={suppliers}
                  onSupplierSearch={getVoucherSuppliers}
                  readOnly={false}
                />
              </div>
            </div>

            {/* Service Details & Trip Info */}
            <VoucherDetailsSection
              formData={formData}
              setFormData={setFormData}
              readOnly={false}
            />

            {/* Pricing Summary */}
            <PricingSummarySection
              pricing={pricing}
              updatePricing={updatePricing}
              setFormData={setFormData}
              extras={extras}
              readOnly={false}
              // ✅ คืน VAT กลับมาเหมือนเดิม แต่ไม่ส่ง actualTotal
              actualVatAmount={calculatedVatAmount}
              actualVatPercent={dbPricingData?.vat_percent || 0}
            />

            {/* Payment Methods */}
            <div className={SaleStyles.section.container}>
              <div className={SaleStyles.section.headerWrapper2}>
                <h2 className={SaleStyles.section.headerTitle}>การชำระเงิน</h2>
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
                      { id: "cashCompany", value: "cash", label: "เงินสด" },
                      { id: "otherCompany", value: "other", label: "อื่น ๆ" },
                    ]}
                    formData={formData}
                    setFormData={setFormData}
                    detailPlaceholder="รายละเอียดการชำระเงิน"
                    readOnly={false}
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
                      { id: "cashCustomer", value: "cash", label: "เงินสด" },
                      {
                        id: "creditCustomer",
                        value: "credit",
                        label: "เครดิต",
                      },
                    ]}
                    formData={formData}
                    setFormData={setFormData}
                    detailPlaceholder="รายละเอียดการชำระเงิน"
                    readOnly={false}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center shrink-0">
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                disabled={saving || cancelling || generatingVC}
              >
                <Trash2 size={16} className="mr-2" />
                {cancelling ? "กำลังยกเลิก..." : "ยกเลิกรายการ"}
              </button>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 flex items-center"
                disabled={saving || deleting || generatingVC}
              >
                <ChevronLeft size={16} className="mr-2" />
                ยกเลิก
              </button>

              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                disabled={saving || deleting || generatingVC}
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
        ticketNumber={voucherData?.voucher?.reference_number}
        loading={cancelling}
      />
    </div>
  );
};

export default BusBoatTourDetail_Edit;
