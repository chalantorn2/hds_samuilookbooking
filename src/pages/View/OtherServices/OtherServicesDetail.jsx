import React, { useState, useEffect } from "react";
import { apiClient } from "../../../services/apiClient";
import {
  X,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  Printer,
  Mail,
} from "lucide-react";
import usePricing from "../../../hooks/usePricing";
import SaleStyles, { combineClasses } from "../../Sales/common/SaleStyles";
import SaleHeader from "../../Sales/common/SaleHeader";
import PricingTable from "../../Sales/common/PricingTable";
import TotalSummary from "../../Sales/common/TotalSummary";
import SupplierSection from "../../Sales/common/SupplierSection";
// ✅ Import form components จาก Sales/other/forms
import InsuranceForm from "../../Sales/other/forms/InsuranceForm";
import HotelForm from "../../Sales/other/forms/HotelForm";
import TrainForm from "../../Sales/other/forms/TrainForm";
import VisaForm from "../../Sales/other/forms/VisaForm";
import OtherServiceForm from "../../Sales/other/forms/OtherServiceForm";

import { generateVCForOther } from "../../../services/otherService"; // เพิ่มบรรทัดนี้
import { DocumentViewer } from "../../../components/documents"; // เพิ่มบรรทัดนี้
import PrintConfirmModal from "../../../components/documents/modals/PrintConfirmModal"; // เพิ่มบรรทัดนี้

import {
  displayThaiDateTime,
  formatCustomerAddress,
} from "../../../utils/helpers";
import {
  getDisplayCustomerName,
  getDisplayCustomerAddress,
  getDisplayCustomerPhone,
  getDisplayCustomerIdNumber,
  getDisplayCustomerBranchType,
  getDisplayCustomerBranchNumber,
} from "../../../utils/helpers";

const OtherServicesDetail = ({ otherId, onClose, showOnlyView = false }) => {
  const [otherData, setOtherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use same pricing hook as SaleOther
  const { pricing, updatePricing, calculateSubtotal } = usePricing();

  const [generating, setGenerating] = useState(false); // เพิ่มบรรทัดนี้
  const [showDocumentViewer, setShowDocumentViewer] = useState(false); // เพิ่มบรรทัดนี้
  const [showPrintConfirm, setShowPrintConfirm] = useState(false); // เพิ่มบรรทัดนี้

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

  // ✅ Service form data ตาม Sales/other/forms structure
  const [serviceFormData, setServiceFormData] = useState({});

  // Other services components state
  const [passengers, setPassengers] = useState([
    { id: 1, name: "", type: "ADT" },
  ]);

  const [extras, setExtras] = useState([
    { id: 1, description: "", net: "", sale: "", pax: 1, total: "" },
  ]);

  // Dummy states for SaleHeader compatibility
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [globalEditMode, setGlobalEditMode] = useState(false);

  useEffect(() => {
    const fetchOtherDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log("📄 Fetching other services details for ID:", otherId);

        // 📄 API Gateway call for other services details
        const response = await apiClient.get("/gateway.php", {
          action: "getOtherById",
          otherId: otherId,
        });

        if (!response.success) {
          throw new Error(
            response.error || "ไม่สามารถโหลดข้อมูล other services ได้"
          );
        }

        const other = response.data;
        console.log("✅ Other services data loaded:", other);

        // Fetch user information
        const userIds = [
          other.other?.created_by,
          other.other?.updated_by,
          other.other?.cancelled_by,
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

        // Process and map data to component state
        setOtherData({
          ...other,
          createdByName: userMap.get(other.other?.created_by) || "-",
          updatedByName: userMap.get(other.other?.updated_by) || "-",
          cancelledByName: userMap.get(other.other?.cancelled_by) || "-",
        });

        mapDataToFormState(other);
      } catch (err) {
        console.error("Error fetching other services details:", err);
        setError(err.message || "ไม่สามารถโหลดข้อมูล other services ได้");
      } finally {
        setLoading(false);
      }
    };

    if (otherId) fetchOtherDetails();
  }, [otherId]);

  // Map database data to component state
  const mapDataToFormState = (other) => {
    const otherWithOverride = {
      ...other,
      customer_override_data: other.customer_override_data,
    };
    const mainOther = other.other || {};
    const details = other.details || {};
    const pricingData = other.pricing || {};
    const additionalInfo = other.additionalInfo || {};
    const customer = other.customer || {};
    const supplier = other.supplier || {};

    // Map formData
    setFormData({
      customer: getDisplayCustomerName(otherWithOverride),
      customerCode: customer.code || "",
      contactDetails: getDisplayCustomerAddress(otherWithOverride),
      phone: getDisplayCustomerPhone(otherWithOverride),
      id: getDisplayCustomerIdNumber(otherWithOverride),
      date: mainOther.issue_date?.split("T")[0] || "",
      creditDays: String(mainOther.credit_days || 0),
      dueDate: mainOther.due_date?.split("T")[0] || "",
      salesName: "",
      supplier: supplier.code || "",
      supplierName: supplier.name || "",
      supplierId: supplier.id || null,
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

    // ✅ Map service form data ตาม form components
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
        }))
      : [{ id: 1, name: "", type: "ADT" }];
    setPassengers(mappedPassengers);

    // Map extras (other services might not have extras)
    const mappedExtras = [
      { id: 1, description: "", net: 0, sale: 0, pax: 1, total: 0 },
    ];
    setExtras(mappedExtras);

    // Set selectedCustomer for SaleHeader compatibility
    if (customer.name) {
      setSelectedCustomer({
        id: customer.id,
        name: getDisplayCustomerName(otherWithOverride),
        address: getDisplayCustomerAddress(otherWithOverride),
        phone: getDisplayCustomerPhone(otherWithOverride),
        id_number: getDisplayCustomerIdNumber(otherWithOverride),
        branch_type: getDisplayCustomerBranchType(otherWithOverride),
        branch_number: getDisplayCustomerBranchNumber(otherWithOverride),
        credit_days: mainOther.credit_days || 0,
      });
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
      // English values - เพิ่มตัวใหม่
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

  const calculatedSubtotal =
    calculateSubtotal() +
    extras.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);

  // ใช้ VAT จากฐานข้อมูล
  const dbPricingData = otherData?.pricing;
  const calculatedVatAmount = parseFloat(dbPricingData?.vat_amount || 0);
  const calculatedTotal =
    parseFloat(dbPricingData?.total_amount || 0) ||
    calculatedSubtotal + calculatedVatAmount;

  const handleConfirmPrint = async () => {
    setGenerating(true);

    try {
      const vcResult = await generateVCForOther(otherId);

      if (vcResult.success) {
        // อัพเดท otherData state
        setOtherData((prev) => ({
          ...prev,
          other: {
            ...prev.other,
            vc_number: vcResult.vcNumber,
            vc_generated_at: new Date().toISOString(),
            status: "voucher_issued",
          },
        }));

        // เปิด DocumentViewer
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
    if (otherData?.other?.vc_number) {
      // มี VC แล้ว - เปิด DocumentViewer โดยตรง
      setShowDocumentViewer(true);
    } else {
      // ยังไม่มี VC - แสดง confirm modal
      setShowPrintConfirm(true);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status, vcNumber, vcGeneratedAt) => {
    if (status === "cancelled") {
      return (
        <div className="flex items-center">
          <AlertTriangle className="text-red-500 mr-2" size={18} />
          <div>
            <div className="text-base font-medium text-red-800">Cancelled</div>
            <div className="text-sm text-red-600">รายการถูกยกเลิกแล้ว</div>
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

  // Render service form based on service type
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

  // Get service type display name
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

  if (loading) {
    return (
      <div className="fixed inset-0 modal-backdrop bg-black flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <p className="text-center mt-4 text-base">
            กำลังโหลดข้อมูล other services...
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

  if (!otherData) return null;

  return (
    <>
      <div className="fixed inset-0 modal-backdrop bg-black flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center">
            <h1 className="text-xl font-bold">
              รายละเอียด {getServiceTypeDisplayName(formData.serviceType)}:{" "}
              {formData.code || `#${otherData.other.id}`}
            </h1>
            <div className="flex items-center space-x-2">
              {/* Print and Email buttons hidden */}

              <button
                onClick={onClose}
                className="p-2 hover:bg-blue-700 rounded-md transition-colors"
                title="ปิด"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content - Using SaleOther Components Structure */}
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
                  {/* Passenger Section - เขียนเองแบบง่าย */}
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
                              className="flex-1 w-full border border-gray-400 rounded-md p-2 bg-gray-100"
                              value={passenger.name}
                              readOnly
                            />
                            <input
                              type="text"
                              className="ml-2 w-16 border border-gray-400 rounded-md p-2 text-center bg-gray-100"
                              value={passenger.type}
                              readOnly
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <SupplierSection
                    formData={formData}
                    setFormData={setFormData}
                    suppliers={[]}
                    onSupplierSearch={() => {}}
                    hideCodeField={true}
                    readOnly={true}
                    supplierType="supplier-other"
                  />
                </div>
              </div>

              {/* 3. Service Details & Form */}
              <div className={SaleStyles.section.container}>
                <div className={SaleStyles.section.headerWrapper}>
                  <h2 className={SaleStyles.section.headerTitle}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                    </svg>
                    รายละเอียดบริการ
                  </h2>
                </div>
                <div className="p-4">
                  <div className="bg-blue-500 text-white p-2 mb-4 rounded-md">
                    <div className="text-center font-medium text-xl">
                      {getServiceTypeDisplayName(formData.serviceType)}
                    </div>
                  </div>
                  {/* ✅ ใช้ form components จาก Sales/other/forms */}
                  <div className="pointer-events-none">
                    {renderServiceForm()}
                  </div>
                </div>
              </div>

              {/* 4. Pricing Summary */}
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
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                        clipRule="evenodd"
                      />
                      <path d="M9 12a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" />
                    </svg>
                    ราคาและยอดรวม
                  </h2>
                </div>
                <div className="p-4">
                  <div className={SaleStyles.grid.fifteenColumns}>
                    <div className="col-span-10">
                      <PricingTable
                        pricing={pricing}
                        updatePricing={updatePricing}
                        readOnly={true}
                      />
                    </div>
                    <div className="col-span-5">
                      <TotalSummary
                        subtotal={calculatedSubtotal}
                        total={calculatedTotal}
                        setFormData={setFormData}
                        pricing={pricing}
                        extras={extras}
                        readOnly={true}
                        actualVatAmount={calculatedVatAmount}
                        actualVatPercent={dbPricingData?.vat_percent || 0}
                        actualTotal={calculatedTotal}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Payment Methods - Custom Implementation */}
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
                    otherData.other.status,
                    otherData.other.vc_number,
                    otherData.other.vc_generated_at
                  )}
                </div>
                <div>
                  <div className="text-gray-600 mb-1 text-sm">สร้างโดย</div>
                  <div className="font-medium text-sm">
                    {otherData.createdByName}
                  </div>
                  <div className="text-gray-600 text-sm">
                    {displayThaiDateTime(otherData.other.created_at)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1 text-sm">อัปเดตโดย</div>
                  <div className="font-medium text-sm">
                    {otherData.updatedByName}
                  </div>
                  <div className="text-gray-600 text-sm">
                    {displayThaiDateTime(otherData.other.updated_at)}
                  </div>
                </div>
                {otherData.other.cancelled_at && (
                  <div>
                    <div className="text-gray-600 mb-1 text-sm">ยกเลิกโดย</div>
                    <div className="font-medium text-sm">
                      {otherData.cancelledByName}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {displayThaiDateTime(otherData.other.cancelled_at)}
                    </div>
                    <div className="text-gray-600 text-sm">
                      เหตุผล: {otherData.other.cancel_reason || "-"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions - Only Close button */}
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
        documentType="voucher"
      />

      {showDocumentViewer && (
        <DocumentViewer
          isOpen={showDocumentViewer}
          onClose={() => {
            setShowDocumentViewer(false);
            onClose();
          }}
          documentType="voucher"
          otherId={otherId}
          onDocumentGenerated={() => {
            console.log("Other services document generated");
          }}
        />
      )}
    </>
  );
};

export default OtherServicesDetail;
