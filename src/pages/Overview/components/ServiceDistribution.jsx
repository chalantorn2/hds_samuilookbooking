import React from "react";
import { serviceTypes } from "../hooks/useOverviewData";
import {
  Activity,
  Plane,
  Ship,
  Bus,
  Hotel,
  Package,
  Database,
  FileText,
  AlertCircle,
  Shield,
  Train,
} from "lucide-react";

/**
 * คอมโพเนนต์แสดงสัดส่วนประเภทบริการ
 * @param {Object} props - คุณสมบัติของคอมโพเนนต์
 * @param {Object} props.summary - ข้อมูลสรุป
 */
const ServiceDistribution = ({ summary }) => {
  // แมปไอคอน Lucide สำหรับแต่ละประเภทบริการ
  const getIcon = (iconName, size = 16) => {
    switch (iconName) {
      case "Activity":
        return <Activity size={size} />;
      case "Plane":
        return <Plane size={size} />;
      case "Ship":
        return <Ship size={size} />;
      case "Bus":
        return <Bus size={size} />;
      case "Hotel":
        return <Hotel size={size} />;
      case "Package":
        return <Package size={size} />;
      case "Database":
        return <Database size={size} />;
      case "FileText":
        return <FileText size={size} />;
      case "Shield":
        return <Shield size={size} />;
      case "Train":
        return <Train size={size} />;
      case "AlertCircle":
      default:
        return <AlertCircle size={size} />;
    }
  };

  const colorMap = {
    flight: "bg-blue-100 text-blue-800",
    boat: "bg-cyan-100 text-cyan-800",
    bus: "bg-green-100 text-green-800",
    hotel: "bg-yellow-100 text-yellow-800",
    tour: "bg-indigo-100 text-indigo-800",
    deposit: "bg-purple-100 text-purple-800", // ✅ เพิ่มใหม่
    voucher: "bg-teal-100 text-teal-800",
    insurance: "bg-emerald-100 text-emerald-800",
    hotel: "bg-pink-100 text-pink-800",
    train: "bg-violet-100 text-violet-800",
    visa: "bg-amber-100 text-amber-800",
    other: "bg-orange-100 text-orange-800",
    all: "bg-gray-100 text-gray-800",
  };

  // คอมโพเนนต์ Badge สำหรับแสดงประเภทบริการ
  const ServiceTypeBadge = ({ type }) => {
    const service = serviceTypes.find((s) => s.id === type) || {
      name: type,
      icon: "AlertCircle",
    };

    return (
      <span
        className={`px-2 py-1 ${
          colorMap[type] || colorMap.other
        } rounded-full text-xs font-medium flex items-center w-fit`}
      >
        {service.icon && <span className="mr-1">{getIcon(service.icon)}</span>}
        {service.name}
      </span>
    );
  };

  return (
    <div className="px-4 pb-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        สัดส่วนประเภทบริการ
      </h3>
      <div className="flex flex-wrap gap-3">
        {Object.entries(summary)
          .filter(([key]) =>
            serviceTypes.some((s) => s.id === key && key !== "all")
          )
          .filter(([_, value]) => value > 0)
          .map(([type, count]) => (
            <div
              key={type}
              className="flex items-center bg-white px-3 py-2 rounded-md shadow-sm border border-gray-200"
            >
              <ServiceTypeBadge type={type} />
              <span className="ml-2 text-sm font-medium">{count} รายการ</span>
              <span className="ml-1 text-xs text-gray-500">
                ({Math.round((count / summary.total) * 100)}%)
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};

export default ServiceDistribution;
