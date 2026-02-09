import React, { useEffect } from "react";
import PricingTable from "../../common/PricingTable";

const HotelForm = ({ formData, setFormData, pricing, updatePricing }) => {
  // ✅ Initialize form data if empty
  useEffect(() => {
    if (!formData || Object.keys(formData).length === 0) {
      setFormData({
        hotel: "",
        description: "",
        reference: "",
        night: "",
        checkIn: "",
        checkOut: "",
        remark: "",
      });
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value.toUpperCase(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Hotel</label>
            <input
              type="text"
              name="hotel"
              className="w-full border border-gray-400 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 no-uppercase"
              placeholder=""
              value={formData.hotel || ""}
              onChange={handleChange}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <input
              type="text"
              name="description"
              className="w-full border border-gray-400 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 no-uppercase"
              placeholder=""
              value={formData.description || ""}
              onChange={handleChange}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Remark</label>
            <textarea
              name="remark"
              className="w-full border border-gray-400 rounded-md p-2 h-24 focus:ring-blue-500 focus:border-blue-500 no-uppercase"
              value={formData.remark || ""}
              onChange={handleChange}
            ></textarea>
          </div>
        </div>

        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Reference</label>
            <input
              type="text"
              name="reference"
              className="w-full border border-gray-400 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 no-uppercase"
              placeholder=""
              value={formData.reference || ""}
              onChange={handleChange}
            />
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Night</label>
              <input
                type="number"
                name="nights"
                className="w-full border border-gray-400 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 no-uppercase"
                placeholder=""
                value={formData.nights || ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Check In</label>
              <input
                type="text"
                name="checkIn"
                className="w-full border border-gray-400 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 no-uppercase"
                placeholder="02MAR25"
                value={formData.checkIn || ""}
                onChange={handleChange}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Check Out
              </label>
              <input
                type="text"
                name="checkOut"
                className="w-full border border-gray-400 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 no-uppercase"
                placeholder="03MAR25"
                value={formData.checkOut || ""}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelForm;
