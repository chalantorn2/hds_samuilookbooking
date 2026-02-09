import React from "react";
import PricingTable from "../common/PricingTable";
import TotalSummary from "../common/TotalSummary";
import SaleStyles, { combineClasses } from "../common/SaleStyles";

const PricingSummarySection = ({
  pricing,
  updatePricing,
  setFormData,
  extras,
  readOnly = false,
  // ✅ เพิ่ม props สำหรับ VAT จากฐานข้อมูล
  actualVatAmount,
  actualVatPercent,
  actualTotal,
}) => {
  return (
    <div className={SaleStyles.section.container}>
      <div className={SaleStyles.section.headerWrapper}>
        <h2 className={SaleStyles.section.headerTitle}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
              clipRule="evenodd"
            />
            <path d="M9 12a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" />
          </svg>
          ตารางราคาและยอดรวม
        </h2>
      </div>
      <div className={SaleStyles.grid.fifteenColumns}>
        <section
          className={combineClasses(
            SaleStyles.subsection.container,
            "col-span-10 self-start"
          )}
        >
          <PricingTable
            pricing={pricing}
            updatePricing={updatePricing}
            readOnly={readOnly}
          />
        </section>
        <section className="col-span-5">
          <TotalSummary
            subtotal={
              Object.values(pricing).reduce(
                (sum, item) => sum + parseFloat(item.total || 0),
                0
              ) +
              extras.reduce(
                (sum, item) => sum + parseFloat(item.total_amount || 0),
                0
              )
            }
            setFormData={setFormData}
            pricing={pricing}
            extras={extras}
            readOnly={readOnly}
            // ✅ ส่ง VAT จากฐานข้อมูลไป TotalSummary
            actualVatAmount={actualVatAmount}
            actualVatPercent={actualVatPercent}
            actualTotal={actualTotal}
          />
        </section>
      </div>
    </div>
  );
};

export default PricingSummarySection;
