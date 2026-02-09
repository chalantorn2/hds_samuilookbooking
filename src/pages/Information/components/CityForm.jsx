import React from "react";

const CityForm = ({ item, handleInputChange }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* รหัสเมือง */}
      <div>
        <label className="block text-sm font-medium mb-1">
          รหัสเมือง <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="city_code"
          value={item.city_code || ""}
          onChange={handleInputChange}
          maxLength={3}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200 focus:border-blue-500 uppercase"
          placeholder="เช่น BKK, SMI (3 ตัวอักษร)"
        />
        <p className="text-xs text-gray-500 mt-1">กรอก 3 ตัวอักษรเท่านั้น</p>
      </div>

      {/* ชื่อเมือง */}
      <div>
        <label className="block text-sm font-medium mb-1">
          ชื่อเมือง <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="city_name"
          value={item.city_name || ""}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200 focus:border-blue-500"
          placeholder="เช่น กรุงเทพมหานคร, เกาะสมุย"
        />
      </div>
    </div>
  );
};

export default CityForm;
