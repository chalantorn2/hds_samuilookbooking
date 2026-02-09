import React, { useEffect, useState } from "react";
import FlightTicketsView from "./FlightTickets/FlightTicketsView";

// คอมโพเนนต์สำหรับหน้าที่ยังไม่ได้สร้าง
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

/**
 * คอมโพเนนต์หลักสำหรับโมดูล View
 * @param {Object} props - คุณสมบัติของคอมโพเนนต์
 * @param {string} props.activeSubmenu - ID ของเมนูย่อยที่กำลังใช้งาน
 */
const ViewModule = ({ activeSubmenu }) => {
  const [activeView, setActiveView] = useState("flightTickets");

  // ตั้งค่า activeView ตาม submenu ที่กำลังถูกเลือก
  useEffect(() => {
    if (activeSubmenu === "2.1") {
      setActiveView("flightTickets");
    } else if (activeSubmenu === "2.2") {
      setActiveView("bus");
    } else if (activeSubmenu === "2.3") {
      setActiveView("boat");
    } else if (activeSubmenu === "2.4") {
      setActiveView("tour");
    } else if (activeSubmenu === "2.5") {
      setActiveView("insurance");
    } else if (activeSubmenu === "2.6") {
      setActiveView("hotel");
    } else if (activeSubmenu === "2.7") {
      setActiveView("train");
    } else if (activeSubmenu === "2.8") {
      setActiveView("visa");
    } else if (activeSubmenu === "2.9") {
      setActiveView("other");
    }
  }, [activeSubmenu]);

  // แสดงเนื้อหาตามประเภทที่เลือก
  const renderContent = () => {
    switch (activeView) {
      case "flightTickets":
        return <FlightTicketsView />;
      case "bus":
        return <ComingSoon title="Bus Tickets" description="รายการตั๋วรถบัส" />;
      case "boat":
        return <ComingSoon title="Boat Tickets" description="รายการตั๋วเรือ" />;
      case "tour":
        return (
          <ComingSoon title="Tour Packages" description="รายการแพ็คเกจทัวร์" />
        );
      case "insurance":
        return (
          <ComingSoon
            title="Travel Insurance"
            description="รายการประกันการเดินทาง"
          />
        );
      case "hotel":
        return (
          <ComingSoon title="Hotel Bookings" description="รายการจองโรงแรม" />
        );
      case "train":
        return (
          <ComingSoon title="Train Tickets" description="รายการตั๋วรถไฟ" />
        );
      case "visa":
        return (
          <ComingSoon title="Visa Services" description="รายการบริการวีซ่า" />
        );
      case "other":
        return (
          <ComingSoon title="Other Services" description="รายการบริการอื่นๆ" />
        );
      default:
        return <FlightTicketsView />;
    }
  };

  // แท็บสำหรับเลือกประเภทบริการ (แสดงบนมือถือเท่านั้น)
  const ViewTypeSelector = () => {
    const tabItems = [
      { id: "flightTickets", label: "ตั๋วเครื่องบิน" },
      { id: "bus", label: "รถบัส" },
      { id: "boat", label: "เรือ" },
      { id: "tour", label: "ทัวร์" },
      { id: "insurance", label: "ประกันการเดินทาง" },
      { id: "hotel", label: "โรงแรม" },
      { id: "train", label: "รถไฟ" },
      { id: "visa", label: "วีซ่า" },
      { id: "other", label: "บริการอื่นๆ" },
    ];

    return (
      <div className="md:hidden overflow-x-auto">
        <div className="flex space-x-2 border-b pb-2 mb-4">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === tab.id
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
      <ViewTypeSelector />
      {renderContent()}
    </div>
  );
};

export default ViewModule;
