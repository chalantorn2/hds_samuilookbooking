// src/pages/Sales/deposit/DepositDetailsSection.jsx

import React from "react";
import SaleStyles, { combineClasses } from "../common/SaleStyles";

const DepositDetailsSection = ({ formData, setFormData, readOnly = false }) => {
  const handleDescriptionChange = (e) => {
    setFormData({
      ...formData,
      description: e.target.value,
    });
  };

  return (
    <section className="border border-gray-400 h-full rounded-lg self-start overflow-hidden">
      <div className="bg-blue-100 text-blue-600 p-3">
        <h2 className="font-semibold">รายละเอียดรายการ</h2>
      </div>
      <div className="p-4">
        <textarea
          className={combineClasses(
            "w-full border border-gray-400 rounded-md p-2 h-full focus:ring-blue-500 focus:border-blue-500 deposit-input-safe",
            readOnly ? "bg-gray-50 cursor-not-allowed" : ""
          )}
          value={formData.description || ""}
          onChange={handleDescriptionChange}
          placeholder="รายละเอียดการจองและการเดินทาง..."
          readOnly={readOnly}
          rows={8}
        />
      </div>
    </section>
  );
};

export default DepositDetailsSection;
