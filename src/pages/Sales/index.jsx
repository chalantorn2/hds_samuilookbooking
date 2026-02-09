import React, { useEffect, useState } from "react";
import SaleTicket from "./SaleTicket";
import SaleDeposit from "./SaleDeposit";
import SaleVoucher from "./SaleVoucher";
import SaleOther from "./SaleOther";

const SaleModule = ({ activeSubmenu }) => {
  const [activeTab, setActiveTab] = useState("ticket");
  const [otherServiceType, setOtherServiceType] = useState("hotel");

  // ตั้งค่า activeTab ตาม submenu ที่กำลังถูกเลือก
  useEffect(() => {
    if (activeSubmenu === "1.1") {
      setActiveTab("ticket");
    } else if (activeSubmenu === "1.2") {
      setActiveTab("deposit");
    } else if (activeSubmenu === "1.3") {
      setActiveTab("voucher");
    } else if (activeSubmenu === "1.4") {
      setActiveTab("other");

      // ตั้งค่า service type ตาม submenu ย่อย
      if (activeSubmenu === "1.4.1") {
        setOtherServiceType("insurance");
      } else if (activeSubmenu === "1.4.2") {
        setOtherServiceType("hotel");
      } else if (activeSubmenu === "1.4.3") {
        setOtherServiceType("train");
      } else if (activeSubmenu === "1.4.4") {
        setOtherServiceType("visa");
      } else if (activeSubmenu === "1.4.5") {
        setOtherServiceType("other");
      }
    }
  }, [activeSubmenu]);

  const renderContent = () => {
    switch (activeTab) {
      case "ticket":
        return <SaleTicket />;
      case "deposit":
        return <SaleDeposit />;
      case "voucher":
        return <SaleVoucher />;
      case "other":
        return <SaleOther initialServiceType={otherServiceType} />;
      default:
        return <SaleTicket />;
    }
  };

  return <div className="min-h-screen bg-gray-100">{renderContent()}</div>;
};

export default SaleModule;
