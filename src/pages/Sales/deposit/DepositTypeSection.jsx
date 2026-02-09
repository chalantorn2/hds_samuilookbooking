// src/pages/Sales/deposit/DepositTypeSection.jsx

import React, { useState } from "react";
import SaleStyles, { combineClasses } from "../common/SaleStyles";

const DepositTypeSection = ({ formData, setFormData, readOnly = false }) => {
  const [isOtherSelected, setIsOtherSelected] = useState(
    formData.depositType === "other"
  );

  const handleRadioChange = (e) => {
    const value = e.target.value;
    setIsOtherSelected(value === "other");

    setFormData({
      ...formData,
      depositType: value,
      otherTypeDescription:
        value !== "other" ? "" : formData.otherTypeDescription,
    });
  };

  const handleGroupNameChange = (e) => {
    setFormData({
      ...formData,
      groupName: e.target.value,
    });
  };

  const handleOtherDescriptionChange = (e) => {
    setFormData({
      ...formData,
      otherTypeDescription: e.target.value,
    });
  };

  return (
    <div className="flex justify-center space-x-8 relative">
      <div className="flex items-center">
        <input
          type="radio"
          id="airTicket"
          name="depositType"
          value="airTicket"
          checked={formData.depositType === "airTicket"}
          onChange={handleRadioChange}
          className={combineClasses(
            "mr-2 ",
            readOnly ? "bg-gray-50 cursor-not-allowed" : ""
          )}
          readOnly={readOnly}
        />
        <label htmlFor="airTicket">AIR TICKET</label>
      </div>

      <div className="flex items-center">
        <input
          type="radio"
          id="package"
          name="depositType"
          value="package"
          checked={formData.depositType === "package"}
          onChange={handleRadioChange}
          className="mr-2"
          readOnly={readOnly}
        />
        <label htmlFor="package">PACKAGE</label>
      </div>

      <div className="flex items-center">
        <input
          type="radio"
          id="land"
          name="depositType"
          value="land"
          checked={formData.depositType === "land"}
          onChange={handleRadioChange}
          className="mr-2"
          readOnly={readOnly}
        />
        <label htmlFor="land">LAND</label>
      </div>

      <div className="flex items-center relative">
        <input
          type="radio"
          id="other"
          name="depositType"
          value="other"
          checked={formData.depositType === "other"}
          onChange={handleRadioChange}
          className="mr-2"
          readOnly={readOnly}
        />
        <label htmlFor="other">OTHER</label>
        {isOtherSelected && (
          <input
            type="text"
            placeholder=""
            className="absolute left-full ml-2 border border-gray-400 rounded px-2 py-1 w-40"
            value={formData.otherTypeDescription || ""}
            onChange={handleOtherDescriptionChange}
            readOnly={readOnly}
          />
        )}
      </div>
    </div>
  );
};

export default DepositTypeSection;
