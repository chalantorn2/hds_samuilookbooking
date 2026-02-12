// src/components/documents/tables/MultiPOReceiptTable.jsx
import React from "react";
import {
  formatCurrencyWithDecimal,
  formatCurrency,
  numberToEnglishText,
} from "../services/documentDataMapper";

/**
 * MultiPOReceiptTable - ตารางสำหรับ RC ที่รวมหลาย INV
 * โครงสร้างต่างจากเอกสารอื่นๆ แสดงรายการ INV แทนที่จะแสดง Passengers/Flights
 */
const MultiPOReceiptTable = ({ selectedPOs, summary }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="print-items-table">
      <table className="print-table multi-po-receipt-table">
        <thead>
          <tr>
            <th className="print-th-no">ลำดับ</th>
            <th className="print-th-doc-no">เลขที่เอกสาร</th>
            <th className="print-th-doc-date">เอกสารวันที่</th>
            <th className="print-th-airline">สายการบิน</th>
            <th className="print-th-routing">เส้นทาง</th>
            <th className="print-th-payment">ยอดชำระ</th>
          </tr>
        </thead>
        <tbody>
          {/* แสดงรายการ INV ที่เลือก */}
          {(() => {
            const MIN_ROWS = 15;
            const sortedPOs =
              selectedPOs && selectedPOs.length > 0
                ? selectedPOs.slice().sort((a, b) => {
                    const poA = a.po_number || "";
                    const poB = b.po_number || "";
                    return poA.localeCompare(poB, "th", { numeric: true });
                  })
                : [];

            // สร้างแถวข้อมูลจริง
            const dataRows = sortedPOs.map((po, index) => (
              <tr key={po.id || index}>
                <td className="print-td-center">{index + 1}</td>
                <td className="print-td-left">{po.po_number || "-"}</td>
                <td className="print-td-left">{formatDate(po.po_date)}</td>
                <td className="print-td-center">
                  {po.supplier?.code ||
                    po.supplier?.supplier_code ||
                    po.supplierCode ||
                    "-"}
                </td>
                <td className="print-td-left">{po.routingDisplay || "-"}</td>
                <td className="print-td-amount">
                  {po.selectedAmount
                    ? formatCurrencyWithDecimal(po.selectedAmount)
                    : formatCurrencyWithDecimal(po.total_amount || 0)}
                </td>
              </tr>
            ));

            // เพิ่มบรรทัดว่าง 1 บรรทัดก่อนรายการแรก
            const spacerRow = (
              <tr key="spacer-top">
                <td className="print-td-center">&nbsp;</td>
                <td className="print-td-left">&nbsp;</td>
                <td className="print-td-left">&nbsp;</td>
                <td className="print-td-center">&nbsp;</td>
                <td className="print-td-left">&nbsp;</td>
                <td className="print-td-amount">&nbsp;</td>
              </tr>
            );

            // สร้างแถวว่างเพื่อให้ครบ 15 แถว
            const emptyRowsCount = Math.max(0, MIN_ROWS - sortedPOs.length);
            const emptyRows = Array.from({ length: emptyRowsCount }, (_, index) => (
              <tr key={`empty-${index}`}>
                <td className="print-td-center">&nbsp;</td>
                <td className="print-td-left">&nbsp;</td>
                <td className="print-td-left">&nbsp;</td>
                <td className="print-td-center">&nbsp;</td>
                <td className="print-td-left">&nbsp;</td>
                <td className="print-td-amount">&nbsp;</td>
              </tr>
            ));

            // เพิ่มบรรทัดว่าง 1 บรรทัดหลังรายการที่ 15
            const spacerRowBottom = (
              <tr key="spacer-bottom">
                <td className="print-td-center">&nbsp;</td>
                <td className="print-td-left">&nbsp;</td>
                <td className="print-td-left">&nbsp;</td>
                <td className="print-td-center">&nbsp;</td>
                <td className="print-td-left">&nbsp;</td>
                <td className="print-td-amount">&nbsp;</td>
              </tr>
            );

            return [spacerRow, ...dataRows, ...emptyRows, spacerRowBottom];
          })()}

          {/* Total Row */}
          <tr className="print-total-row">
            <td colSpan="5" className="print-total-label-cell">
              <span className="print-total-english-text">
                ({numberToEnglishText(summary?.total || 0)} Baht)
              </span>
              <span className="print-td-amount print-summary-label">Total</span>
            </td>
            <td className="print-td-amount print-summary-value">
              {formatCurrencyWithDecimal(summary?.total || 0)} Baht
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default MultiPOReceiptTable;
