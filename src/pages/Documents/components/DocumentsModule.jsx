// src/components/Documents/DocumentsModule.jsx
// โมดูลเอกสาร - รวม Invoice List, Receipt List, Deposit List, Voucher List
// ✅ Updated: เพิ่ม DepositList component

import React from "react";
import InvoiceList from "../InvoiceList";
import ReceiptList from "../ReceiptList";
import DepositList from "../DepositList"; // ✅ เพิ่ม import
import VoucherList from "../VoucherList";

const DocumentsModule = ({ activeSubmenu }) => {
  const renderContent = () => {
    switch (activeSubmenu) {
      case "6.1": // Invoice List
        return <InvoiceList />;
      case "6.2": // Receipt List
        return <ReceiptList />;
      case "6.3": // Deposit List - ✅ Updated
        return <DepositList />;
      case "6.4": // Voucher List
        return <VoucherList />;
      default:
        return (
          <div className="bg-gray-100 min-h-screen p-4">
            <div className="max-w-7xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h1 className="text-xl font-bold text-gray-800 mb-4">
                  เอกสาร (Documents)
                </h1>
                <p className="text-gray-500">กรุณาเลือกเมนูย่อยจากด้านซ้าย</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return <>{renderContent()}</>;
};

export default DocumentsModule;
