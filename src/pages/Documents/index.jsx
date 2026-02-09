import React, { useEffect, useState } from "react";
import InvoiceList from "./InvoiceList";
import DepositList from "./DepositList";
// ในอนาคตสามารถนำเข้าคอมโพเนนต์อื่นๆ เมื่อสร้างแล้ว
// import ReceiptList from "./ReceiptList";
// import DepositSlipList from "./DepositSlipList";
// import VoucherList from "./VoucherList";
// import RefundList from "./RefundList";

const DocumentsModule = ({ activeSubmenu }) => {
  const [activeTab, setActiveTab] = useState("invoice");

  // ตั้งค่า activeTab ตาม submenu ที่กำลังถูกเลือก
  useEffect(() => {
    if (activeSubmenu === "6.1") {
      setActiveTab("invoice");
    } else if (activeSubmenu === "6.2") {
      setActiveTab("receipt");
    } else if (activeSubmenu === "6.3") {
      setActiveTab("deposit");
    } else if (activeSubmenu === "6.4") {
      setActiveTab("voucher");
    } else if (activeSubmenu === "6.5") {
      setActiveTab("refund");
    }
  }, [activeSubmenu]);

  const renderContent = () => {
    switch (activeTab) {
      case "invoice":
        return <InvoiceList />;
      case "receipt":
        // return <ReceiptList />;
        return <ComingSoon title="Receipt List" description="รายการใบเสร็จ" />;
      case "deposit":
        // return <DepositSlipList />;
        return <DepositList />;
      case "voucher":
        // return <VoucherList />;
        return <ComingSoon title="Voucher List" description="รายการวาวเชอร์" />;
      case "refund":
        // return <RefundList />;
        return <ComingSoon title="Refund" description="การคืนเงิน" />;
      default:
        return <InvoiceList />;
    }
  };

  // แสดงข้อความ "Coming Soon" สำหรับหน้าที่ยังไม่ได้สร้าง
  const ComingSoon = ({ title, description }) => (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{title}</h1>
        <p className="text-gray-600 mb-6">{description}</p>
        <div className="text-blue-500 text-5xl mb-6">🚧</div>
        <p className="text-gray-700">
          หน้านี้กำลังอยู่ในระหว่างการพัฒนา <br /> และจะพร้อมใช้งานเร็วๆ นี้
        </p>
      </div>
    </div>
  );

  // แท็บสำหรับเลือกประเภทเอกสาร (แสดงบนมือถือเท่านั้น)
  const DocumentTypeSelector = () => {
    const tabItems = [
      { id: "invoice", label: "ใบแจ้งหนี้" },
      { id: "receipt", label: "ใบเสร็จ" },
      { id: "deposit", label: "ใบมัดจำ" },
      { id: "voucher", label: "วาวเชอร์" },
      { id: "refund", label: "การคืนเงิน" },
    ];

    return (
      <div className="md:hidden overflow-x-auto">
        <div className="flex space-x-2 border border-gray-400 -b pb-2 mb-4">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <DocumentTypeSelector />
      {renderContent()}
    </div>
  );
};

export default DocumentsModule;
