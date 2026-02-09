import React from "react";
import SaleStyles from "../common/SaleStyles";

const DepositPaymentSection = ({ formData, setFormData }) => {
  // ฟังก์ชันสำหรับจัดการการเปลี่ยนแปลงข้อมูลการชำระเงินของบริษัท
  const handleCompanyPaymentChange = (index, field, value) => {
    const updatedPayments = [
      ...(formData.companyPayments ||
        Array.from({ length: 5 }, () => ({ amount: "", date: "", by: "" }))),
    ];

    // ถ้าเป็น amount ให้จัดการคอมม่า
    if (field === "amount") {
      // ลบคอมม่าออกก่อนเก็บค่า
      const numericValue = value.replace(/,/g, "");
      // ตรวจสอบว่าเป็นตัวเลขหรือไม่
      if (numericValue === "" || /^\d+(\.\d{0,2})?$/.test(numericValue)) {
        updatedPayments[index] = {
          ...updatedPayments[index],
          [field]: numericValue,
        };
      }
    } else {
      updatedPayments[index] = {
        ...updatedPayments[index],
        [field]: value,
      };
    }

    setFormData({
      ...formData,
      companyPayments: updatedPayments,
    });
  };

  // ฟังก์ชันสำหรับจัดการการเปลี่ยนแปลงข้อมูลการชำระเงินของลูกค้า
  const handleCustomerPaymentChange = (index, field, value) => {
    const updatedPayments = [
      ...(formData.customerPayments ||
        Array.from({ length: 5 }, () => ({ amount: "", date: "", by: "" }))),
    ];

    // ถ้าเป็น amount ให้จัดการคอมม่า
    if (field === "amount") {
      // ลบคอมม่าออกก่อนเก็บค่า
      const numericValue = value.replace(/,/g, "");
      // ตรวจสอบว่าเป็นตัวเลขหรือไม่
      if (numericValue === "" || /^\d+(\.\d{0,2})?$/.test(numericValue)) {
        updatedPayments[index] = {
          ...updatedPayments[index],
          [field]: numericValue,
        };
      }
    } else {
      updatedPayments[index] = {
        ...updatedPayments[index],
        [field]: value,
      };
    }

    setFormData({
      ...formData,
      customerPayments: updatedPayments,
    });
  };

  // ฟังก์ชันสำหรับแสดงจำนวนเงินพร้อมคอมม่า
  const formatAmount = (amount) => {
    if (!amount) return "";
    return parseFloat(amount).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const companyPayments =
    formData.companyPayments ||
    Array.from({ length: 5 }, () => ({ amount: "", date: "", by: "" }));
  const customerPayments =
    formData.customerPayments ||
    Array.from({ length: 5 }, () => ({ amount: "", date: "", by: "" }));

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* การชำระเงินของบริษัท */}
      <div className="bg-gray-50 p-4 rounded-md border border-gray-300">
        <h3 className="font-semibold mb-3 text-blue-600 text-lg">
          การชำระเงินของบริษัท
        </h3>
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={`company-${index}`} className="flex gap-2 items-center">
              {/* ชำระครั้งที่ */}
              <div className="w-24">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  ชำระครั้งที่ {index + 1}
                </label>
              </div>
              {/* จำนวนเงิน */}
              <div className="w-35">
                <input
                  type="text"
                  placeholder="จำนวนเงิน"
                  value={formatAmount(companyPayments[index]?.amount || "")}
                  onChange={(e) =>
                    handleCompanyPaymentChange(index, "amount", e.target.value)
                  }
                  className={`${SaleStyles.form.input} text-right`}
                />
              </div>
              {/* วันที่ */}
              <div className="w-38">
                <input
                  type="date"
                  value={companyPayments[index]?.date || ""}
                  onChange={(e) =>
                    handleCompanyPaymentChange(index, "date", e.target.value)
                  }
                  className={SaleStyles.form.input}
                />
              </div>
              {/* By */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="By"
                  value={companyPayments[index]?.by || ""}
                  onChange={(e) =>
                    handleCompanyPaymentChange(index, "by", e.target.value)
                  }
                  className={SaleStyles.form.input}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* การชำระเงินของลูกค้า */}
      <div className="bg-gray-50 p-4 rounded-md border border-gray-300">
        <h3 className="font-semibold mb-3 text-blue-600 text-lg">
          การชำระเงินของลูกค้า
        </h3>
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={`customer-${index}`} className="flex gap-2 items-center">
              {/* ชำระครั้งที่ */}
              <div className="w-24">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  ชำระครั้งที่ {index + 1}
                </label>
              </div>
              {/* จำนวนเงิน */}
              <div className="w-35">
                <input
                  type="text"
                  placeholder="จำนวนเงิน"
                  value={formatAmount(customerPayments[index]?.amount || "")}
                  onChange={(e) =>
                    handleCustomerPaymentChange(index, "amount", e.target.value)
                  }
                  className={`${SaleStyles.form.input} text-right`}
                />
              </div>
              {/* วันที่ */}
              <div className="w-38">
                <input
                  type="date"
                  value={customerPayments[index]?.date || ""}
                  onChange={(e) =>
                    handleCustomerPaymentChange(index, "date", e.target.value)
                  }
                  className={SaleStyles.form.input}
                />
              </div>
              {/* By */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="By"
                  value={customerPayments[index]?.by || ""}
                  onChange={(e) =>
                    handleCustomerPaymentChange(index, "by", e.target.value)
                  }
                  className={SaleStyles.form.input}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DepositPaymentSection;
