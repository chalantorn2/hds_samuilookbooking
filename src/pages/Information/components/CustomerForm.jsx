import React from "react";

const CustomerForm = ({ item, handleInputChange }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
      {/* Row 1: Code and Name */}
      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">รหัสลูกค้า</label>
        <input
          type="text"
          name="code"
          value={item.code || ""}
          onChange={handleInputChange}
          maxLength={5}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200 focus:border-blue-500"
        />
      </div>
      <div className="col-span-3">
        <label className="block text-sm font-medium mb-1">
          ชื่อ <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={item.name || ""}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200 focus:border-blue-500"
        />
      </div>
      <div className="col-span-3">
        <label className="block text-sm font-medium mb-1">อีเมล</label>
        <input
          type="email"
          name="email"
          value={item.email || ""}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200 focus:border-blue-500"
          placeholder="example@email.com"
        />
      </div>

      {/* Row 2: Address Lines */}
      <div className="col-span-7">
        <label className="block text-sm font-medium mb-1">
          ที่อยู่บรรทัดที่ 1 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="address_line1"
          value={item.address_line1 || ""}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200 focus:border-blue-500"
        />
      </div>

      <div className="col-span-7">
        <label className="block text-sm font-medium mb-1">
          ที่อยู่บรรทัดที่ 2
        </label>
        <input
          type="text"
          name="address_line2"
          value={item.address_line2 || ""}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200 focus:border-blue-500"
        />
      </div>

      <div className="col-span-7">
        <label className="block text-sm font-medium mb-1">
          ที่อยู่บรรทัดที่ 3
        </label>
        <input
          type="text"
          name="address_line3"
          value={item.address_line3 || ""}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200 focus:border-blue-500"
        />
      </div>

      {/* Row 3: Other Details */}
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">เบอร์โทรศัพท์</label>
        <input
          type="text"
          name="phone"
          value={item.phone || ""}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200 focus:border-blue-500"
        />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">เลขผู้เสียภาษี</label>
        <input
          type="text"
          name="id_number"
          value={item.id_number || ""}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200 focus:border-blue-500"
        />
      </div>

      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">สาขา</label>
        <select
          name="branch_type"
          value={item.branch_type || "Head Office"}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200 focus:border-blue-500"
        >
          <option value="Head Office">Head Office</option>
          <option value="Branch">Branch</option>
        </select>
        {item.branch_type === "Branch" && (
          <div className="mt-2">
            <label className="block text-sm font-medium mb-1">
              หมายเลขสาขา <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="branch_number"
              value={item.branch_number || ""}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").substring(0, 5);
                handleInputChange({
                  target: { name: "branch_number", value },
                });
              }}
              placeholder="เฉพาะตัวเลข 5 หลัก"
              maxLength={5}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200 focus:border-blue-500"
            />
          </div>
        )}
      </div>

      <div className="col-span-1">
        <label className="block text-sm font-medium mb-1">เครดิต (วัน)</label>
        <input
          type="number"
          name="credit_days"
          value={item.credit_days || 0}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200 focus:border-blue-500"
        />
      </div>
    </div>
  );
};

export default CustomerForm;
