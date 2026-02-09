import React, { useEffect } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import SaleStyles, { combineClasses } from "../common/SaleStyles";

const VoucherPassengerSection = ({
  passengers,
  setPassengers,
  updatePricing,
  pricing,
  formData,
  setFormData,
  readOnly = false,
}) => {
  // ประเภทผู้โดยสาร
  const passengerTypes = [
    { value: "ADT", label: "ผู้ใหญ่ (ADT)", priceField: "adult" },
    { value: "CHD", label: "เด็ก (CHD)", priceField: "child" },
    { value: "INF", label: "ทารก (INF)", priceField: "infant" },
  ];

  // Service type to voucher number prefix mapping
  const serviceTypePrefixes = {
    bus: "BS",
    boat: "BT",
    tour: "TR",
  };

  // Generate voucher number based on service type
  const generateVoucherNumber = (serviceType) => {
    const prefix = serviceTypePrefixes[serviceType] || "VC";
    const year = new Date().getFullYear().toString().slice(-2);
    const randomPart = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${year}-${randomPart}`;
  };

  const updatePassengerCount = (passengersList) => {
    const adultCount = passengersList.filter((p) => p.type === "ADT").length;
    const childCount = passengersList.filter((p) => p.type === "CHD").length;
    const infantCount = passengersList.filter((p) => p.type === "INF").length;

    console.log("VoucherPassengerSection: Updating counts:", {
      adultCount,
      childCount,
      infantCount,
    });

    const adultSale = pricing?.adult?.sale || 0;
    const childSale = pricing?.child?.sale || 0;
    const infantSale = pricing?.infant?.sale || 0;

    const adultTotal = adultCount * parseFloat(adultSale);
    const childTotal = childCount * parseFloat(childSale);
    const infantTotal = infantCount * parseFloat(infantSale);

    if (updatePricing) {
      updatePricing("adult", "pax", adultCount, adultTotal);
      updatePricing("child", "pax", childCount, childTotal);
      updatePricing("infant", "pax", infantCount, infantTotal);
    }
  };

  useEffect(() => {
    updatePassengerCount(passengers);
  }, []);

  useEffect(() => {
    console.log("Pricing changed:", pricing);
    if (pricing) {
      updatePassengerCount(passengers);
    }
  }, [pricing.adult?.sale, pricing.child?.sale, pricing.infant?.sale]);

  // Update voucher numbers when service type changes
  useEffect(() => {
    if (formData.serviceType && passengers.length > 0) {
      const newVoucherNumber = generateVoucherNumber(formData.serviceType);

      const updatedPassengers = passengers.map((passenger) => ({
        ...passenger,
        voucherNumber: newVoucherNumber,
      }));
      setPassengers(updatedPassengers);
    }
  }, [formData.serviceType]);

  const addPassenger = () => {
    if (readOnly) return;

    const voucherNumber = formData.serviceType
      ? generateVoucherNumber(formData.serviceType)
      : "VC-25-001";

    const newPassenger = {
      id: passengers.length + 1,
      name: "",
      type: "ADT",
      voucherNumber: voucherNumber,
    };

    const updatedPassengers = [...passengers, newPassenger];
    setPassengers(updatedPassengers);
    updatePassengerCount(updatedPassengers);

    // Focus on new passenger name field
    setTimeout(() => {
      const newPassengerIndex = updatedPassengers.length - 1;
      const nameInput = document.querySelector(
        `input[data-passenger-name="${newPassengerIndex}"]`
      );
      if (nameInput) {
        nameInput.focus();
      }
    }, 100);
  };

  const removePassenger = (id) => {
    if (readOnly || passengers.length <= 1) return;

    const updatedPassengers = passengers.filter((p) => p.id !== id);
    setPassengers(updatedPassengers);
    updatePassengerCount(updatedPassengers);
  };

  const handleTypeChange = (index, newType) => {
    if (readOnly) return;

    const updatedPassengers = [...passengers];
    updatedPassengers[index].type = newType;
    setPassengers(updatedPassengers);

    setTimeout(() => {
      updatePassengerCount(updatedPassengers);
    }, 0);
  };

  const handleNameChange = (index, newName) => {
    if (readOnly) return;

    const updatedPassengers = [...passengers];
    updatedPassengers[index].name = newName;
    setPassengers(updatedPassengers);
  };

  // Handle voucher number change (for first passenger only)
  const handleVoucherNumberChange = (value) => {
    if (readOnly) return;

    // Update all passengers with the same voucher number
    const updatedPassengers = passengers.map((passenger) => ({
      ...passenger,
      voucherNumber: value,
    }));
    setPassengers(updatedPassengers);
  };

  // ✅ คำนวณ Total Pax จาก pricing แทน passengers.length
  const calculateTotalPax = () => {
    const adultPax = parseInt(pricing?.adult?.pax || 0);
    const childPax = parseInt(pricing?.child?.pax || 0);
    const infantPax = parseInt(pricing?.infant?.pax || 0);
    return adultPax + childPax + infantPax;
  };

  const totalPax = calculateTotalPax();

  return (
    <div className="col-span-10">
      <section className={SaleStyles.subsection.container}>
        <div className={SaleStyles.subsection.header}>
          <h2 className={SaleStyles.subsection.title}>
            ข้อมูลผู้โดยสาร (ทั้งหมด {totalPax} คน)
          </h2>
        </div>
        <div className={SaleStyles.subsection.content}>
          <div
            className={combineClasses(
              "grid grid-cols-17 gap-2 font-medium text-sm",
              SaleStyles.spacing.mb2,
              SaleStyles.spacing.mx2
            )}
          >
            <div
              className={combineClasses("col-span-13", SaleStyles.spacing.ml4)}
            >
              ชื่อผู้โดยสาร
            </div>
            <div className="col-span-3 text-center">ประเภท</div>
            {!readOnly && <div className="col-span-1 text-center"></div>}
          </div>

          {passengers.map((passenger, index) => (
            <div
              key={passenger.id}
              className={combineClasses(
                "grid grid-cols-17 gap-2",
                SaleStyles.spacing.mb2
              )}
            >
              {/* Passenger Name */}
              <div className="flex col-span-13">
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
                  value={passenger.name || ""}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  data-passenger-name={index}
                  placeholder="ชื่อผู้โดยสาร"
                  disabled={readOnly}
                />
              </div>

              {/* Passenger Type */}
              <div className="col-span-3">
                <select
                  className={combineClasses(
                    SaleStyles.form.select,
                    "text-center w-full px-0 passenger-type-select"
                  )}
                  value={passenger.type || "ADT"}
                  onChange={(e) => handleTypeChange(index, e.target.value)}
                  disabled={readOnly}
                >
                  {passengerTypes.map((type) => (
                    <option
                      key={type.value}
                      value={type.value}
                      className="text-center"
                    >
                      {type.value}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Button */}
              {!readOnly && (
                <div className="col-span-1 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => removePassenger(passenger.id)}
                    className={SaleStyles.button.actionButton}
                    disabled={passengers.length === 1}
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Add Passenger Button */}
          {!readOnly && (
            <button
              type="button"
              onClick={addPassenger}
              className={combineClasses(
                SaleStyles.button.primary,
                SaleStyles.spacing.mt2,
                SaleStyles.spacing.ml4
              )}
            >
              <FiPlus className={SaleStyles.button.icon} /> เพิ่มผู้โดยสาร
            </button>
          )}
        </div>
      </section>
    </div>
  );
};

export default VoucherPassengerSection;
