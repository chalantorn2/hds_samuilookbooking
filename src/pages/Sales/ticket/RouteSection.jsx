import React, { useRef } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import SaleStyles, { combineClasses } from "../common/SaleStyles";

const RouteSection = ({
  routes,
  setRoutes,
  supplierCode,
  readOnly = false,
}) => {
  // สร้าง ref สำหรับแต่ละ input เพื่อควบคุม focus
  const inputRefs = useRef([]);

  const addRoute = () => {
    if (readOnly) return;
    const newRouteIndex = routes.length;
    setRoutes([
      ...routes,
      {
        id: routes.length + 1,
        date: "",
        flight: "",
        rbd: "",
        origin: "",
        destination: "",
        departure: "",
        arrival: "",
      },
    ]);
    setTimeout(() => {
      const flightInput = inputRefs.current[`${newRouteIndex}-flight`];
      if (flightInput) {
        flightInput.focus();
      }
    }, 100);
  };

  const removeRoute = (id) => {
    if (readOnly || routes.length <= 1) return;
    setRoutes(routes.filter((r) => r.id !== id));
  };

  const formatTime = (value) => {
    if (!value) return "";
    let cleanValue = value.replace(/[^0-9]/g, "").slice(0, 4);
    if (cleanValue.length === 4) {
      return `${cleanValue.slice(0, 2)}.${cleanValue.slice(2)}`;
    }
    return cleanValue;
  };

  // ฟังก์ชันสำหรับจัดการการย้าย focus
  const handleInputChange = (e, index, field, maxLength, nextField) => {
    if (readOnly) return;

    const value = e.target.value;
    const updatedRoutes = [...routes];

    // อัปเดตค่าใน state
    if (field === "flight") {
      // ลบการเชื่อมโยงกับ supplierCode - ให้เป็น flight number ที่ user พิมพ์เท่านั้น
      updatedRoutes[index].flight = value.toUpperCase();
    } else if (field === "rbd") {
      updatedRoutes[index].rbd = value.toUpperCase().substring(0, 1);
    } else if (field === "departure" || field === "arrival") {
      updatedRoutes[index][field] = formatTime(value);
    } else {
      updatedRoutes[index][field] = value.toUpperCase();
    }
    setRoutes(updatedRoutes);

    // ตรวจสอบ maxLength และย้าย focus (เฉพาะเมื่อไม่ readOnly)
    if (!readOnly && value.length >= maxLength && nextField) {
      const nextInput = inputRefs.current[`${index}-${nextField}`];
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  return (
    <section
      className={combineClasses(SaleStyles.subsection.container, "col-span-7")}
    >
      <div className={SaleStyles.subsection.header}>
        <h2 className={SaleStyles.subsection.title}>
          เส้นทางการเดินทาง (ทั้งหมด {routes.length} เส้นทาง)
        </h2>
      </div>
      <div className={SaleStyles.subsection.content}>
        {routes.map((route, index) => (
          <div
            key={route.id}
            className={combineClasses(
              "mb-2 border border-gray-400 rounded-md p-3 bg-gray-50"
            )}
          >
            <div
              className={combineClasses(
                SaleStyles.grid.spaceBetween,
                SaleStyles.spacing.mb2
              )}
            >
              <h3 className="font-medium text-sm">เส้นทางที่ {index + 1}</h3>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeRoute(route.id)}
                  className={SaleStyles.button.actionButton}
                  disabled={routes.length === 1}
                >
                  <FiTrash2 size={18} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-28 gap-3">
              {/* เที่ยวบิน */}
              <div className="col-span-6">
                <label className="text-xs text-center block mb-1">
                  เที่ยวบิน
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-400 rounded-md p-2 text-center focus:ring-blue-500 focus:border-blue-500 text-transform uppercase"
                  value={route.flight || ""}
                  onChange={(e) =>
                    handleInputChange(e, index, "flight", 6, "rbd")
                  }
                  maxLength={6}
                  ref={(el) => (inputRefs.current[`${index}-flight`] = el)}
                  disabled={readOnly}
                />
              </div>

              {/* RBD */}
              <div className="col-span-2">
                <label className="text-xs text-center block mb-1">RBD</label>
                <input
                  type="text"
                  className="w-full border border-gray-400 rounded-md p-2 text-center focus:ring-blue-500 focus:border-blue-500 text-transform uppercase"
                  value={route.rbd || ""}
                  onChange={(e) =>
                    handleInputChange(e, index, "rbd", 1, "date")
                  }
                  maxLength={1}
                  ref={(el) => (inputRefs.current[`${index}-rbd`] = el)}
                  disabled={readOnly}
                />
              </div>

              {/* วันที่ */}
              <div className="col-span-4">
                <label className="text-xs text-center block mb-1">วันที่</label>
                <input
                  type="text"
                  className="w-full border border-gray-400 rounded-md p-2 text-center focus:ring-blue-500 focus:border-blue-500 text-transform uppercase"
                  value={route.date || ""}
                  onChange={(e) =>
                    handleInputChange(e, index, "date", 5, "origin")
                  }
                  maxLength={5}
                  ref={(el) => (inputRefs.current[`${index}-date`] = el)}
                  disabled={readOnly}
                />
              </div>

              {/* ต้นทาง */}
              <div className="col-span-4">
                <label className="text-xs text-center block mb-1">ต้นทาง</label>
                <input
                  type="text"
                  className="w-full border border-gray-400 rounded-md p-2 text-center focus:ring-blue-500 focus:border-blue-500 text-transform uppercase"
                  value={route.origin || ""}
                  onChange={(e) =>
                    handleInputChange(e, index, "origin", 3, "destination")
                  }
                  maxLength={3}
                  ref={(el) => (inputRefs.current[`${index}-origin`] = el)}
                  disabled={readOnly}
                />
              </div>

              {/* ปลายทาง */}
              <div className="col-span-4">
                <label className="text-xs text-center block mb-1">
                  ปลายทาง
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-400 rounded-md p-2 text-center focus:ring-blue-500 focus:border-blue-500 text-transform uppercase"
                  value={route.destination || ""}
                  onChange={(e) =>
                    handleInputChange(e, index, "destination", 3, "departure")
                  }
                  maxLength={3}
                  ref={(el) => (inputRefs.current[`${index}-destination`] = el)}
                  disabled={readOnly}
                />
              </div>

              {/* เวลาออก */}
              <div className="col-span-4">
                <label className="text-xs text-center block mb-1">
                  เวลาออก
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-400 rounded-md p-2 text-center focus:ring-blue-500 focus:border-blue-500"
                  value={route.departure || ""}
                  onChange={(e) =>
                    handleInputChange(e, index, "departure", 4, "arrival")
                  }
                  pattern="^([0-1]?[0-9]|2[0-3])\.[0-5][0-9]$"
                  ref={(el) => (inputRefs.current[`${index}-departure`] = el)}
                  disabled={readOnly}
                />
              </div>

              {/* เวลาถึง */}
              <div className="col-span-4">
                <label className="text-xs text-center block mb-1">
                  เวลาถึง
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-400 rounded-md p-2 text-center focus:ring-blue-500 focus:border-blue-500"
                  value={route.arrival || ""}
                  onChange={(e) =>
                    handleInputChange(e, index, "arrival", 4, null)
                  }
                  pattern="^([0-1]?[0-9]|2[0-3])\.[0-5][0-9]$"
                  ref={(el) => (inputRefs.current[`${index}-arrival`] = el)}
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>
        ))}
        {!readOnly && (
          <button
            type="button"
            onClick={addRoute}
            className={combineClasses(
              SaleStyles.button.primary,
              SaleStyles.spacing.mt1
            )}
          >
            <FiPlus className={SaleStyles.button.icon} /> เพิ่มเส้นทาง
          </button>
        )}
      </div>
    </section>
  );
};

export default RouteSection;
