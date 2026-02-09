// src/pages/Sales/deposit/DepositTermsSection.jsx

import React from "react";
import SaleStyles, { combineClasses } from "../common/SaleStyles";

const DepositTermsSection = ({ formData, setFormData, readOnly = false }) => {
  const handleDateChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  return (
    <section className="border border-gray-400 h-full rounded-lg self-start overflow-hidden">
      <div className="p-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center pb-2">
            <input
              type="radio"
              id="deposit"
              checked
              onChange={() => {}}
              className="mr-2"
              readOnly={readOnly}
            />
            <label htmlFor="deposit" className="font-medium text-lg">
              Deposit
            </label>
          </div>

          <div className="items-center grid grid-cols-10">
            <div className="col-span-6 text-red-500">
              ชำระเงินมัดจำครั้งที่ 1
            </div>
            <div className="col-span-4">
              <input
                type="date"
                className={combineClasses(
                  "w-full border border-gray-300 rounded-md p-2",
                  readOnly ? "bg-gray-100 cursor-not-allowed" : ""
                )}
                value={formData.depositDueDate || ""}
                onChange={(e) =>
                  handleDateChange("depositDueDate", e.target.value)
                }
                readOnly={readOnly}
              />
            </div>
          </div>

          <div className="items-center grid grid-cols-10">
            <div className="col-span-6 text-red-500">
              ชำระเงินมัดจำครั้งที่ 2
            </div>
            <div className="col-span-4">
              <input
                type="date"
                className={combineClasses(
                  "w-full border border-gray-300 rounded-md p-2",
                  readOnly ? "bg-gray-100 cursor-not-allowed" : ""
                )}
                value={formData.secondDepositDueDate || ""}
                onChange={(e) =>
                  handleDateChange("secondDepositDueDate", e.target.value)
                }
                readOnly={readOnly}
              />
            </div>
          </div>

          <div className="items-center grid grid-cols-10">
            <div className="col-span-6 text-red-500">
              แจ้งชื่อผู้โดยสารก่อนวันที่
            </div>
            <div className="col-span-4">
              <input
                type="date"
                className={combineClasses(
                  "w-full border border-gray-300 rounded-md p-2",
                  readOnly ? "bg-gray-100 cursor-not-allowed" : ""
                )}
                value={formData.passengerInfoDueDate || ""}
                onChange={(e) =>
                  handleDateChange("passengerInfoDueDate", e.target.value)
                }
                readOnly={readOnly}
              />
            </div>
          </div>

          <div className="items-center grid grid-cols-10">
            <div className="col-span-6 text-red-500">
              ชำระทั้งหมดภายในวันที่
            </div>
            <div className="col-span-4">
              <input
                type="date"
                className={combineClasses(
                  "w-full border border-gray-300 rounded-md p-2",
                  readOnly ? "bg-gray-100 cursor-not-allowed" : ""
                )}
                value={formData.fullPaymentDueDate || ""}
                onChange={(e) =>
                  handleDateChange("fullPaymentDueDate", e.target.value)
                }
                readOnly={readOnly}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DepositTermsSection;
