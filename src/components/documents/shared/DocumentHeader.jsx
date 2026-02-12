import React from "react";
import logo from "../../../assets/logo-print.png";

// Configuration สำหรับแต่ละประเภทเอกสาร
const DOCUMENT_CONFIGS = {
  invoice: {
    title: { thai: "ใบแจ้งหนี้", english: "Invoice" },
    numberField: "poNumber",
  },
  inv: {
    title: { thai: "ใบแจ้งหนี้", english: "Invoice" },
    numberField: "invoiceNumber",
  },
  receipt: {
    title: { thai: "ใบเสร็จรับเงิน", english: "Receipt" },
    numberField: "rcNumber", // ⭐ แสดง RC Number แทน INV Number
  },
  voucher: {
    title: { thai: "Voucher", english: "Voucher" },
    numberField: "vcNumber",
  },
  other: {
    title: { thai: "Voucher", english: "Voucher" },
    numberField: "vcNumber",
  },
  deposit: {
    title: { thai: "ใบมัดจำ", english: "Deposit" },
    numberField: "dpNumber",
  },
};

/**
 * DocumentHeader - Shared header component สำหรับทุกประเภทเอกสาร
 * เก็บ layout และ CSS classes เดิมจาก PrintInvoice ทั้งหมด
 */
const DocumentHeader = ({
  documentType = "invoice",
  customerData = {},
  documentInfo = {},
  serviceType = null, // เพิ่ม serviceType สำหรับ voucher
  isMultiPOReceipt = false, // เพื่อแยก Receipt เดี่ยวๆ กับ Multi INV Receipt
}) => {
  console.log("📄 DocumentHeader received props:", {
    documentType,
    customerData,
    customerDataKeys: Object.keys(customerData),
    hasTaxId: !!customerData.taxId,
    taxIdValue: customerData.taxId,
  });

  const config = DOCUMENT_CONFIGS[documentType];

  // สำหรับ voucher ให้ใช้ VC Number แทน service type
  const getDocumentTitle = () => {
    if (documentType === "voucher") {
      const vcNumber = documentInfo.vcNumber || "";
      return {
        thai: "Voucher",
        english: vcNumber, // แสดงเลขที่ VC
      };
    }

    if (documentType === "other" && serviceType) {
      const serviceTypeMapping = {
        insurance: "INSURANCE",
        hotel: "HOTEL",
        train: "TRAIN",
        visa: "VISA",
        other: "OTHER SERVICE",
      };

      return {
        thai: "Voucher",
        english: serviceTypeMapping[serviceType] || "OTHER SERVICE",
      };
    }

    return config.title;
  };

  // Helper function เพื่อความปลอดภัย
  const getCustomerDisplay = (field, fallback = "") => {
    return customerData[field] || fallback;
  };

  const getDocumentNumber = () => {
    const numberField = config.numberField;
    return documentInfo[numberField] || "";
  };

  const getBranchDisplay = () => {
    // ใช้ branch ที่คำนวณไว้แล้วจาก documentDataMapper.js (รองรับ override data)
    const branch = getCustomerDisplay("branch");
    if (branch) {
      return branch;
    }

    // Fallback: ถ้ายังมีการส่ง branchType/branchNumber แยก (backward compatibility)
    const branchType = getCustomerDisplay("branchType", "Head Office");
    const branchNumber = getCustomerDisplay("branchNumber");

    if (branchType === "Branch" && branchNumber) {
      return `${branchType} ${branchNumber}`;
    }
    return branchType;
  };

  const formatCustomerAddress = () => {
    const line1 =
      getCustomerDisplay("addressLine1") || getCustomerDisplay("address_line1");
    const line2 =
      getCustomerDisplay("addressLine2") || getCustomerDisplay("address_line2");
    const line3 =
      getCustomerDisplay("addressLine3") || getCustomerDisplay("address_line3");

    // ถ้ามี address ที่ต่อกันมาในบรรทัดเดียว ให้แยกด้วย \n
    const singleLineAddress = getCustomerDisplay("address");

    // ถ้ามี addressLine1-3 ให้ใช้แบบแยกบรรทัด
    if (line1 || line2 || line3) {
      return (
        <>
          {line1 && <div>{line1}</div>}
          {line2 && <div>{line2}</div>}
          {line3 && <div>{line3}</div>}
        </>
      );
    }

    // ถ้าไม่มี ให้ใช้ address เดิมที่อาจมี \n
    if (singleLineAddress) {
      return singleLineAddress
        .split("\n")
        .map((line, index) => <div key={index}>{line}</div>);
    }

    return null;
  };

  const documentTitle = getDocumentTitle();

  return (
    <>
      {/* Header - เก็บ structure เดิมจาก PrintInvoice */}
      <div className="print-header">
        <div className="print-company-info">
          <img src={logo} alt="Company Logo" className="print-company-logo" />
          <div className="print-company-details">
            <div className="print-company-title">บริษัท สมุย ลุค จำกัด</div>
            <div className="print-company-text">
              63/27 ม.3 ต.บ่อผุด อ.เกาะสมุย จ.สุราษฎร์ธานี 84320
            </div>
            <div className="print-company-text">
              โทร 077-950550 Email: samuilook@yahoo.com
            </div>
            <div className="print-company-text">
              เลขประจำตัวผู้เสียภาษี 0845545002700
            </div>
          </div>
        </div>
        <div
          className={`print-document-title ${
            documentType === "voucher" ? "voucher-title" : ""
          }`}
        >
          <div className="print-document-title-text">{documentTitle.thai}</div>
          <div className="print-document-title-text">
            {documentTitle.english}
          </div>
        </div>
      </div>

      {/* Customer & Document Info*/}
      {documentType !== "voucher" && (
        <div className="print-info-section">
          <div className="print-info-customer">
            <div className="print-info-row">
              <span className="print-info-label">ลูกค้า:</span>
              <span className="print-info-value">
                {getCustomerDisplay("name")}
              </span>
            </div>

            <div className="print-info-row">
              <span className="print-info-label">ที่อยู่:</span>
              <div className="print-info-value print-address">
                {formatCustomerAddress()}
              </div>
            </div>

            <div className="print-info-row">
              <span className="print-info-label">เบอร์โทร:</span>
              <span className="print-info-value">
                {getCustomerDisplay("phone")}
              </span>
            </div>

            <div className="print-info-row">
              <span className="print-info-label">เลขประจำตัวผู้เสียภาษี:</span>
              <span className="print-info-value">
                {getCustomerDisplay("taxId")} <strong>สาขา:</strong>{" "}
                {getBranchDisplay()}
              </span>
            </div>
          </div>

          <div className="print-info-invoice">
            <div className="print-info-row">
              <span className="print-info-label">เลขที่:</span>
              <span className="print-info-value">{getDocumentNumber()}</span>
            </div>

            {/* ⭐ แสดง Ref: INV Number สำหรับ Receipt เดี่ยวๆ เท่านั้น (ไม่ใช่ Multi INV Receipt) */}
            {documentType === "receipt" && !isMultiPOReceipt && documentInfo.poNumber && (
              <div className="print-info-row">
                <span className="print-info-label">Ref:</span>
                <span className="print-info-value">
                  {documentInfo.poNumber}
                </span>
              </div>
            )}

            <div className="print-info-row">
              <span className="print-info-label">วันที่:</span>
              <span className="print-info-value">
                {documentInfo.date || ""}
              </span>
            </div>

            {/* ⭐ ซ่อน วันที่ครบกำหนด สำหรับ Receipt */}
            {documentType !== "receipt" && (
              <div className="print-info-row">
                <span className="print-info-label">วันที่ครบกำหนด:</span>
                <span className="print-info-value">
                  {documentInfo.dueDate || ""}
                </span>
              </div>
            )}

            <div className="print-info-row">
              <span className="print-info-label">Sale /Staff:</span>
              <span className="print-info-value">
                {documentInfo.salesPerson || ""}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentHeader;
