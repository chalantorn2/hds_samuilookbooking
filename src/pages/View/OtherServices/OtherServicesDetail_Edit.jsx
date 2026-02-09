import React, { useState, useEffect } from "react";
import { apiClient } from "../../../services/apiClient";
import { FiEdit, FiPlus, FiTrash2, FiSave, FiX } from "react-icons/fi";
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
  Plus,
} from "lucide-react";
import { useAlertDialogContext } from "../../../contexts/AlertDialogContext";
import usePricing from "../../../hooks/usePricing";
import SaleStyles, { combineClasses } from "../../Sales/common/SaleStyles";
import PaymentMethodSection from "../../Sales/common/PaymentMethodSection";
import PricingSummarySection from "../../Sales/ticket/PricingSummarySection";
import SaleHeader from "../../Sales/common/SaleHeader";
import SupplierSection from "../../Sales/common/SupplierSection";
import { formatCustomerAddress } from "../../../utils/helpers";
import CancelReasonModal from "../common/CancelReasonModal";
import { useAuth } from "../../Login/AuthContext";
import { getCustomers } from "../../../services/customerService";
import { createCustomerOverrideData } from "../../../utils/helpers";
import {
  getDisplayCustomerName,
  getDisplayCustomerAddress,
  getDisplayCustomerPhone,
  getDisplayCustomerIdNumber,
  getDisplayCustomerBranchType,
  getDisplayCustomerBranchNumber,
} from "../../../utils/helpers";

// ✅ Import Other Services form components
import InsuranceForm from "../../Sales/other/forms/InsuranceForm";
import HotelForm from "../../Sales/other/forms/HotelForm";
import TrainForm from "../../Sales/other/forms/TrainForm";
import VisaForm from "../../Sales/other/forms/VisaForm";
import OtherServiceForm from "../../Sales/other/forms/OtherServiceForm";

const OtherServicesDetail_Edit = ({ otherId, onClose, onSave }) => {
  const { user } = useAuth();
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [globalEditMode, setGlobalEditMode] = useState(false);
  const showAlert = useAlertDialogContext();
  const [otherData, setOtherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Use same pricing hook as SaleOther
  const { pricing, updatePricing, calculateSubtotal, calculateTotal } =
    usePricing();

  // Form state matching SaleOther structure
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
    serviceType: "insurance",
    paymentMethod: "",
    companyPaymentDetails: "",
    customerPayment: "",
    customerPaymentDetails: "",
    vatPercent: "0",
    code: "",
  });

  // ✅ Service form data for different service types
  const [serviceFormData, setServiceFormData] = useState({});

  // Other services components state
  const [passengers, setPassengers] = useState([
    { id: 1, name: "", type: "ADT", serviceNumber: "" },
  ]);

  const [extras, setExtras] = useState([
    { id: 1, description: "", net: "", sale: "", pax: 1, total: "" },
  ]);

  // Fetch and map other services data
  useEffect(() => {
    const fetchOtherData = async () => {
      if (!otherId) return;

      setLoading(true);
      try {
        const response = await apiClient.get("/gateway.php", {
          action: "getOtherForEdit",
          otherId: otherId,
        });

        if (!response.success) {
          throw new Error(response.error || "ไม่สามารถโหลดข้อมูลได้");
        }

        const other = response.data;
        setOtherData(other);
        mapDataToFormState(other);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOtherData();
  }, [otherId]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      const data = await getOtherSuppliers();
      setSuppliers(data);
    };
    fetchSuppliers();
  }, []);

  // Map database data to component state
  const mapDataToFormState = (other) => {
    const otherWithOverride = {
      ...other,
      customer_override_data: other.customer_override_data,
    };

    const mainOther = other.other || {};
    const details = other.details || {};
    const additionalInfo = other.additionalInfo || {};
    const pricingData = other.pricing || {};

    // Map main formData
    setFormData({
      customer: getDisplayCustomerName(otherWithOverride),
      customerCode: other.customer?.code || "",
      contactDetails: getDisplayCustomerAddress(otherWithOverride),
      phone: getDisplayCustomerPhone(otherWithOverride),
      id: getDisplayCustomerIdNumber(otherWithOverride),
      date: mainOther.issue_date?.split("T")[0] || "",
      creditDays: String(mainOther.credit_days || 0),
      dueDate: mainOther.due_date?.split("T")[0] || "",
      salesName: "",
      supplier: other.supplier?.code || "",
      supplierName: other.supplier?.name || "",
      supplierId: other.supplier?.id || null,
      serviceType: mainOther.service_type || "insurance",
      paymentMethod:
        mapPaymentMethodFromDB(additionalInfo.company_payment_method) || "",
      companyPaymentDetails: additionalInfo.company_payment_details || "",
      customerPayment:
        mapPaymentMethodFromDB(additionalInfo.customer_payment_method) || "",
      customerPaymentDetails: additionalInfo.customer_payment_details || "",
      vatPercent: String(details.vat_percent || 0),
      code: mainOther.reference_number || "",
      branchType: getDisplayCustomerBranchType(otherWithOverride),
      branchNumber: getDisplayCustomerBranchNumber(otherWithOverride),
    });

    // ✅ Map service form data based on service type
    setServiceFormData({
      description: details?.description || "",
      date: details?.service_date || "",
      reference: details?.reference_code || "",
      remark: details?.remark || "",
      // Hotel specific
      hotel: details?.hotel_name || "",
      checkIn: details?.check_in_date || "",
      checkOut: details?.check_out_date || "",
      nights: details?.nights || "",
      // Visa specific
      country: details?.country || "",
      visaType: details?.visa_type || "",
      // Train specific
      route: details?.route || "",
      departureTime: details?.departure_time || "",
      arrivalTime: details?.arrival_time || "",
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
    const mappedPassengers = other.passengers?.length
      ? other.passengers.map((p, index) => ({
          id: index + 1,
          name: p.passenger_name || "",
          type: p.passenger_type || "ADT",
          serviceNumber: p.service_number || "",
        }))
      : [{ id: 1, name: "", type: "ADT", serviceNumber: "" }];
    setPassengers(mappedPassengers);

    // Map extras (other services might not have extras)
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

    // Set selectedCustomer
    if (other.customer) {
      setSelectedCustomer({
        id: other.customer.id,
        name: getDisplayCustomerName(otherWithOverride),
        code: other.customer.code,
        address: getDisplayCustomerAddress(otherWithOverride),
        phone: getDisplayCustomerPhone(otherWithOverride),
        id_number: getDisplayCustomerIdNumber(otherWithOverride),
        branch_type: getDisplayCustomerBranchType(otherWithOverride),
        branch_number: getDisplayCustomerBranchNumber(otherWithOverride),
        credit_days: other.customer.credit_days,
      });
    }
  };

  const getOtherSuppliers = async (search = "", limit = 100) => {
    try {
      // ✅ Updated to match SaleOther.jsx pattern
      const response = await apiClient.get("/gateway.php", {
        action: "getOtherSuppliers",
        search: search,
        limit: limit,
        serviceType: formData.serviceType, // ✅ Pass current service type
      });

      if (!response.success) {
        console.error("Error fetching suppliers:", response.error);
        return { success: false, data: [], error: response.error };
      }

      // ✅ Return in format expected by SupplierSection autocomplete
      return { success: true, data: response.data || [] };
    } catch (err) {
      console.error("Error in getOtherSuppliers:", err);
      return { success: false, data: [], error: err.message };
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

  // Calculate totals - ✅ Fix price sync issue
  const calculatedSubtotal =
    calculateSubtotal() +
    extras.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);

  // ✅ Dynamic VAT calculation based on current form value
  const currentVatPercent = parseFloat(formData.vatPercent || 0);
  const calculatedVatAmount = (calculatedSubtotal * currentVatPercent) / 100;
  const calculatedTotal = parseFloat(
    (calculatedSubtotal + calculatedVatAmount).toFixed(2)
  );

  // ✅ Render service form based on service type
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
        return <InsuranceForm {...commonProps} />;
    }
  };

  // ✅ Get service type display name
  const getServiceTypeDisplayName = (serviceType) => {
    const serviceTypeNames = {
      insurance: "ประกันการเดินทาง",
      hotel: "โรงแรม",
      train: "รถไฟ",
      visa: "วีซ่า",
      other: "บริการอื่นๆ",
    };
    return serviceTypeNames[serviceType] || serviceType;
  };

  // Save changes with confirmation
  const handleSubmit = async (e) => {
    e.preventDefault();

    const confirmed = await showAlert({
      title: "ยืนยันการแก้ไข",
      description: `คุณต้องการบันทึกการแก้ไข other services ${otherData.other?.reference_number} ใช่หรือไม่?`,
      confirmText: "ยืนยัน",
      cancelText: "ยกเลิก",
    });

    if (!confirmed) return;

    setSaving(true);

    try {
      const customerOverrideData = createCustomerOverrideData(
        formData,
        selectedCustomer
      );

      const updateData = {
        customerOverride: customerOverrideData,
        mainOther: {
          customer_id: selectedCustomer?.id,
          information_id: formData.supplierId,
          service_type: formData.serviceType,
          updated_by: user?.id, // ✅ เพิ่ม updated_by
        },
        otherDetails: {
          description: serviceFormData.description || "",
          service_date: serviceFormData.date || "",
          reference_code: serviceFormData.reference || "",
          hotel_name: serviceFormData.hotel || "",
          check_in_date: serviceFormData.checkIn || "",
          check_out_date: serviceFormData.checkOut || "",
          nights: serviceFormData.nights
            ? parseInt(serviceFormData.nights)
            : null,
          country: serviceFormData.country || "",
          visa_type: serviceFormData.visaType || "",
          route: serviceFormData.route || "",
          departure_time: serviceFormData.departureTime || "",
          arrival_time: serviceFormData.arrivalTime || "",
          remark: serviceFormData.remark || "",
          subtotal_before_vat: parseFloat(calculatedSubtotal.toFixed(2)),
          vat_percent: parseFloat(formData.vatPercent) || 0,
          vat_amount: parseFloat(calculatedVatAmount.toFixed(2)),
          grand_total: parseFloat(calculatedTotal.toFixed(2)),
        },
        additionalInfo: {
          company_payment_method: formData.paymentMethod || "",
          company_payment_details: formData.companyPaymentDetails || "",
          customer_payment_method: formData.customerPayment || "",
          customer_payment_details: formData.customerPaymentDetails || "",
        },
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
        passengers: passengers
          .filter((p) => p.name?.trim())
          .map((p) => ({
            passenger_name: p.name,
            passenger_type: p.type,
            service_number: p.serviceNumber || "",
          })),
      };

      const response = await apiClient.post("/gateway.php", {
        action: "updateOtherComplete",
        otherId: otherId,
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

  // Cancel other services
  const handleCancel = async (reason) => {
    setCancelling(true);
    try {
      const currentUserId = user?.id;
      if (!currentUserId) {
        throw new Error("ไม่พบข้อมูลผู้ใช้งาน");
      }

      const response = await apiClient.post("/gateway.php", {
        action: "cancelOther",
        otherId: otherId,
        userId: currentUserId,
        cancelReason: reason,
      });

      if (!response.success) {
        throw new Error(response.error || "ไม่สามารถยกเลิก other services ได้");
      }

      setShowCancelModal(false);
      onSave?.();
      onClose();
    } catch (err) {
      setError(err.message);
      await showAlert({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถยกเลิก other services ได้: " + err.message,
        confirmText: "ตกลง",
      });
    } finally {
      setCancelling(false);
    }
  };

  // Helper function to map database payment method to form values
  const mapPaymentMethodFromDB = (dbValue) => {
    if (!dbValue) return "";
    const mapping = {
      เครดิตการ์ด: "creditCard",
      โอนเงินผ่านธนาการ: "bankTransfer",
      เงินสด: "cash",
      เครดิต: "credit",
      "อื่น ๆ": "other",
      อื่นๆ: "other",
      CREDITCARD: "creditCard",
      BANKTRANSFER: "bankTransfer",
      CASH: "cash",
      CREDIT: "credit",
      OTHER: "other",
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

  if (error && !otherData) {
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

  if (!otherData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center shrink-0">
          <h1 className="text-xl font-bold">
            แก้ไข {getServiceTypeDisplayName(formData.serviceType)}:{" "}
            {otherData.other?.reference_number}
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

            {/* Customer & Dates */}
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
                  totalAmount={calculatedTotal} // ✅ Dynamic total that updates when VAT changes
                  subtotalAmount={calculatedSubtotal}
                  vatAmount={calculatedVatAmount}
                  globalEditMode={globalEditMode}
                  setGlobalEditMode={setGlobalEditMode}
                  readOnly={true}
                />
              </div>
            </div>

            {/* Passengers & Supplier */}
            <div className={SaleStyles.section.container}>
              <div className={SaleStyles.section.headerWrapper}>
                <h2 className={SaleStyles.section.headerTitle}>
                  ข้อมูลผู้โดยสารและซัพพลายเออร์
                </h2>
              </div>
              <div className={SaleStyles.grid.fifteenColumns}>
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
                                e.target.value.toUpperCase();
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
                            onClick={() => {
                              if (passengers.length > 1) {
                                setPassengers(
                                  passengers.filter(
                                    (p) => p.id !== passenger.id
                                  )
                                );
                              }
                            }}
                            className="ml-2 p-2 text-red-500 hover:text-red-700"
                            disabled={passengers.length === 1}
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const newId =
                            Math.max(0, ...passengers.map((p) => p.id)) + 1;
                          setPassengers([
                            ...passengers,
                            {
                              id: newId,
                              name: "",
                              type: "ADT",
                            },
                          ]);
                        }}
                        className="mt-2 ml-6 flex items-center text-white bg-green-500 hover:bg-green-600 px-3 py-2 rounded-md text-sm"
                      >
                        <FiPlus className="mr-1" /> เพิ่มผู้โดยสาร
                      </button>
                    </div>
                  </section>
                </div>
                <SupplierSection
                  formData={formData}
                  setFormData={setFormData}
                  suppliers={suppliers}
                  onSupplierSearch={getOtherSuppliers}
                  hideCodeField={true}
                  readOnly={false}
                  supplierType="supplier-other"
                />
              </div>
            </div>

            {/* Service Details */}
            <div className={SaleStyles.section.container}>
              <div className={SaleStyles.section.headerWrapper}>
                <h2 className={SaleStyles.section.headerTitle}>
                  รายละเอียดบริการ
                </h2>
              </div>
              <div className="p-4">
                <div className="bg-blue-500 text-white p-2 mb-4 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="text-center font-medium text-xl">
                      {getServiceTypeDisplayName(formData.serviceType)}
                    </div>
                    {/* ❌ Remove service type selector - should be readonly in edit mode */}
                  </div>
                </div>
                {/* ✅ Render service form based on service type */}
                {renderServiceForm()}
              </div>
            </div>

            {/* Pricing Summary */}
            <PricingSummarySection
              pricing={pricing}
              updatePricing={updatePricing}
              setFormData={setFormData}
              extras={extras}
              readOnly={false}
              // ✅ Use calculated VAT values that update dynamically
              actualVatAmount={calculatedVatAmount}
              actualVatPercent={currentVatPercent}
              actualTotal={calculatedTotal}
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
                        label: "โอนเงินผ่านธนาการ",
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
                        label: "โอนเงินผ่านธนาการ",
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
                disabled={saving || cancelling}
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
                disabled={saving || deleting}
              >
                <ChevronLeft size={16} className="mr-2" />
                ยกเลิก
              </button>

              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                disabled={saving || deleting}
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
        ticketNumber={otherData?.other?.reference_number}
        loading={cancelling}
      />
    </div>
  );
};

export default OtherServicesDetail_Edit;
