// src/components/documents/tables/ReceiptTable.jsx
import React from "react";
import InvoiceTable from "./InvoiceTable";

/**
 * ReceiptTable - ใช้ InvoiceTable แต่แสดงเฉพาะข้อมูลที่เลือก
 *
 * จุดต่าง:
 * - ข้อมูลผ่านการ filter จาก ReceiptSelectionModal แล้ว
 * - passengers, passengerTypes, extras เป็นเฉพาะที่เลือก
 * - summary เป็นยอดรวมที่คำนวณใหม่
 * - ใช้ format เดียวกับ Invoice ทุกอย่าง
 */
const ReceiptTable = (props) => {
  // ส่ง props ทั้งหมดไปยัง InvoiceTable
  // เพราะ format เหมือนกันทุกอย่าง เพียงแต่ข้อมูลต่างกัน
  return <InvoiceTable {...props} />;
};

export default ReceiptTable;
