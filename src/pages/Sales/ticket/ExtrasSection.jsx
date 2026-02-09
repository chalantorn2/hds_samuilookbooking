import React, { useRef } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import SaleStyles, { combineClasses } from "../common/SaleStyles";
import { formatNumber, parseInput } from "../common/FormatNumber";

const ExtrasSection = ({ extras, setExtras, readOnly = false }) => {
  const inputRefs = useRef([]);
  const addExtra = () => {
    if (readOnly) return;
    const newExtraIndex = extras.length;
    setExtras([
      ...extras,
      {
        id: extras.length + 1,
        description: "",
        net_price: "",
        sale_price: "",
        quantity: 1,
        total_amount: "",
      },
    ]);
    setTimeout(() => {
      const descriptionInput =
        inputRefs.current[`description-${newExtraIndex}`];
      if (descriptionInput) {
        descriptionInput.focus();
      }
    }, 100);
  };

  const removeExtra = (id) => {
    if (readOnly || extras.length <= 1) return;
    setExtras(extras.filter((e) => e.id !== id));
  };

  // ฟังก์ชันคำนวณราคารวม (ไม่มีทศนิยม)
  const calculateItemTotal = (price, quantity) => {
    const numPrice = parseFloat(price) || 0;
    const numQuantity = parseInt(quantity) || 0;
    return (numPrice * numQuantity).toFixed(2);
  };

  const handleDescriptionChange = (index, value) => {
    if (readOnly) return;
    const updatedExtras = [...extras];
    updatedExtras[index].description = value;
    setExtras(updatedExtras);
  };

  const handleNetPriceChange = (index, value) => {
    if (readOnly) return;
    const updatedExtras = [...extras];
    updatedExtras[index].net_price = parseInput(value);
    setExtras(updatedExtras);
  };

  const handleSalePriceChange = (index, value) => {
    if (readOnly) return;
    const updatedExtras = [...extras];
    updatedExtras[index].sale_price = parseInput(value);

    // คำนวณยอดรวมใหม่
    const salePrice = parseFloat(updatedExtras[index].sale_price) || 0;
    const quantity = parseInt(updatedExtras[index].quantity);
    updatedExtras[index].total_amount = calculateItemTotal(salePrice, quantity);

    setExtras(updatedExtras);
  };

  const handleQuantityChange = (index, value) => {
    if (readOnly) return;
    const updatedExtras = [...extras];
    updatedExtras[index].quantity = value;

    // คำนวณยอดรวมใหม่
    const salePrice = parseFloat(updatedExtras[index].sale_price) || 0;
    const quantity = parseInt(value);
    updatedExtras[index].total_amount = calculateItemTotal(salePrice, quantity);

    setExtras(updatedExtras);
  };

  return (
    <div className="h-full">
      <section className="border border-gray-400 rounded-lg overflow-hidden h-full">
        <div className="bg-blue-100 text-blue-600 p-3 flex justify-between items-center">
          <h2 className="font-semibold">
            รายการเพิ่มเติม ({extras.length} รายการ)
          </h2>
        </div>
        <div className="p-4">
          <div
            className={combineClasses(
              `grid ${
                readOnly ? "grid-cols-20" : "grid-cols-21"
              } gap-3 text-center font-medium text-sm`,
              SaleStyles.spacing.mb2,
              SaleStyles.spacing.mx2
            )}
          >
            <div
              className={combineClasses("col-span-8", SaleStyles.spacing.ml4)}
            >
              รายละเอียด
            </div>
            <div className="col-span-3">ราคาต้นทุน</div>
            <div className="col-span-3">ราคาขาย</div>
            <div className="col-span-2">จำนวน</div>
            <div className="col-span-4">รวม</div>
            {!readOnly && <div className="col-span-1">จัดการ</div>}
          </div>
          {extras.map((item, index) => (
            <div
              key={item.id}
              className={combineClasses(
                `grid ${readOnly ? "grid-cols-20" : "grid-cols-21"} gap-3`,
                SaleStyles.spacing.mb2
              )}
            >
              <div className="flex col-span-8">
                <div
                  className={combineClasses(
                    "w-[16px] flex items-center justify-center",
                    SaleStyles.spacing.mr2
                  )}
                >
                  <span className="font-medium">{index + 1}</span>
                </div>
                <input
                  type="text"
                  className={SaleStyles.form.input}
                  value={item.description || ""}
                  onChange={(e) =>
                    handleDescriptionChange(index, e.target.value)
                  }
                  ref={(el) => (inputRefs.current[`description-${index}`] = el)}
                  disabled={readOnly}
                />
              </div>
              <div className="col-span-3">
                <input
                  type="text"
                  className={combineClasses(
                    SaleStyles.form.input,
                    "text-end appearance-none"
                  )}
                  placeholder="0"
                  value={formatNumber(item.net_price) || ""}
                  onChange={(e) => handleNetPriceChange(index, e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div className="col-span-3">
                <input
                  type="text"
                  className={combineClasses(SaleStyles.form.input, "text-end")}
                  placeholder="0"
                  value={formatNumber(item.sale_price) || ""}
                  onChange={(e) => handleSalePriceChange(index, e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min="1"
                  className={combineClasses(
                    SaleStyles.form.input,
                    "text-center"
                  )}
                  placeholder="1"
                  value={item.quantity}
                  onChange={(e) => handleQuantityChange(index, e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div className="col-span-4 flex items-center">
                <input
                  type="text"
                  className={combineClasses(
                    SaleStyles.form.inputDisabled,
                    "text-end"
                  )}
                  placeholder="0"
                  value={formatNumber(item.total_amount) || "0"}
                  disabled
                />
              </div>
              {!readOnly && (
                <div className="col-span-1 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => removeExtra(item.id)}
                    className={SaleStyles.button.actionButton}
                    disabled={extras.length === 1}
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {!readOnly && (
            <button
              type="button"
              onClick={addExtra}
              className={combineClasses(
                SaleStyles.button.primary,
                SaleStyles.spacing.mt2,
                SaleStyles.spacing.ml4
              )}
            >
              <FiPlus className={SaleStyles.button.icon} /> เพิ่มรายการ
            </button>
          )}
        </div>
      </section>
    </div>
  );
};

export default ExtrasSection;
