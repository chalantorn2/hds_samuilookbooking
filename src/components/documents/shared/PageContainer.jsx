import React from "react";

/**
 * PageContainer - Wrapper component สำหรับแต่ละหน้าของเอกสาร
 * เก็บ CSS classes และ structure เดิมจาก PrintInvoice ทั้งหมด
 */
const PageContainer = ({
  children,
  pageNumber = 1,
  totalPages = 1,
  className = "",
}) => {
  // กำหนด class สำหรับ page break (หน้าที่ 2 เป็นต้นไป)
  const pageBreakClass = pageNumber > 1 ? "page-break" : "";

  return (
    <div
      className={`print-page ${pageBreakClass} ${className}`}
      id={`page-${pageNumber}`}
    >
      {children}
    </div>
  );
};

export default PageContainer;
