import React from "react";
import logo from "../../../assets/logo-print.png";

// Configuration สำหรับลายเซ็นแต่ละประเภทเอกสาร
const SIGNATURE_CONFIGS = {
  invoice: {
    left: "Issued by",
    right: "Received by",
  },
  inv: {
    left: "Issued by",
    right: "Received by",
  },
  receipt: {
    left: "Issued by",
    right: "ผู้รับชำระเงิน",
  },
  voucher: {
    left: "Issued by",
    right: "ผู้รับชำระเงิน",
  },
  other: {
    left: "Issued by",
    right: "ผู้รับชำระเงิน",
  },
  deposit: {
    left: "Issued by",
    right: "Received by",
  },
};

/**
 * DocumentFooter - Shared footer component สำหรับทุกประเภทเอกสาร
 * เก็บ layout และ CSS classes เดิมจาก PrintInvoice ทั้งหมด
 */
const DocumentFooter = ({
  documentType = "invoice",
  pageNumber = 1,
  totalPages = 1,
  updatedByName = null,
  issueDate = null,
}) => {
  const signatureConfig = SIGNATURE_CONFIGS[documentType] || SIGNATURE_CONFIGS.invoice;

  // Format วันที่ออกเอกสาร (ถ้ามี) - รูปแบบ DD/MM/YY
  const getFormattedIssueDate = () => {
    if (!issueDate) return "";
    try {
      const date = new Date(issueDate);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear().toString().slice(-2); // เอาแค่ 2 หลักท้าย
      return `${day}/${month}/${year}`;
    } catch (e) {
      return "";
    }
  };

  // Debug log
  console.log("DocumentFooter props:", {
    documentType,
    updatedByName,
    issueDate,
    formattedDate: getFormattedIssueDate(),
  });

  return (
    <>
      {/* Payment Info & Signatures - เก็บ structure เดิมจาก PrintInvoice */}
      <div className="print-bottom-section">
        <div className="print-spacer"></div>

        {/* Signatures section - เก็บ layout เดิม */}
        <div className="print-signatures">
          <div className="print-signature">
            <div className="print-signature-title">{signatureConfig.left}</div>
            <div className="print-signature-area">
              {/* แสดงชื่อผู้อัพเดทแทนโลโก้ */}
              {updatedByName ? (
                <div style={{ fontWeight: "500", fontSize: "14px" }}>
                  {updatedByName}
                </div>
              ) : (
                <img
                  src={logo}
                  alt="Approved Signature"
                  className="print-signature-logo"
                />
              )}
            </div>
            <div className="print-signature-date">
              Date: {getFormattedIssueDate()}
            </div>
          </div>

          <div className="print-signature">
            <div className="print-signature-title">{signatureConfig.right}</div>
            <div className="print-signature-area">
              {/* เพิ่มข้อมูลผู้อัพเดทแบบซ่อนเพื่อให้ spacing ตรงกับ Issued by */}
              {updatedByName ? (
                <div style={{ fontWeight: "500", fontSize: "14px", visibility: "hidden" }}>
                  {updatedByName}
                </div>
              ) : (
                <img
                  src={logo}
                  alt="Approved Signature"
                  className="print-signature-logo"
                  style={{ visibility: "hidden" }}
                />
              )}
            </div>
            <div className="print-signature-date">
              Date: ...............................
            </div>
          </div>
        </div>
      </div>

      {/* Page Footer - เก็บ structure เดิมจาก PrintInvoice */}
      <div className="print-footer">
        หน้า {pageNumber}/{totalPages}
      </div>
    </>
  );
};

export default DocumentFooter;
