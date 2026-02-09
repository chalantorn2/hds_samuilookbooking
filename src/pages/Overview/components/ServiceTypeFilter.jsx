import React from "react";
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
import { serviceTypes } from "../hooks/useOverviewData";

/**
 * คอมโพเนนต์สำหรับกรองตามประเภทบริการ
 * @param {Object} props - คุณสมบัติของคอมโพเนนต์
 * @param {string} props.serviceTypeFilter - ประเภทบริการที่เลือก
 * @param {Function} props.setServiceTypeFilter - ฟังก์ชันตั้งค่าตัวกรองประเภทบริการ
 */
const ServiceTypeFilter = ({ serviceTypeFilter, setServiceTypeFilter }) => {
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

  return (
    <div className="bg-gray-50 p-4 mb-4 border-t border-b border-gray-200">
      <div className="flex flex-wrap gap-2">
        {serviceTypes.map((service) => (
          <button
            key={service.id}
            onClick={() => setServiceTypeFilter(service.id)}
            className={`flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              serviceTypeFilter === service.id
                ? "bg-blue-100 text-blue-800 border border-blue-300"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            <span className="mr-1">{getIcon(service.icon)}</span>
            <span>{service.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ServiceTypeFilter;
