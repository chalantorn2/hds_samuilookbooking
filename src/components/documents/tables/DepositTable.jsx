// src/components/documents/tables/DepositTable.jsx
import React from "react";
import {
  formatCurrencyWithDecimal,
  formatCurrency,
  numberToEnglishText,
} from "../services/documentDataMapper";

/**
 * DepositTable - ตารางสำหรับเอกสาร Deposit
 * Format พิเศษ: Description + Other + Remark + Payment Instructions
 */
const DepositTable = ({
  flights,
  passengerTypes,
  extras,
  summary,
  depositInfo,
}) => {
  return (
    <>
      <div className="print-items-table">
        <table className="print-table">
          <thead>
            <tr>
              <th className="print-th-detail">รายละเอียด</th>
              <th className="print-th-amount">จำนวน</th>
            </tr>
          </thead>
          <tbody>
            {/* Description Section - แทน NAME Section */}
            <tr>
              <td className="print-section-header">Description /รายการ</td>
              <td className="print-td-amount"></td>
            </tr>

            {/* Description Section - 7 บรรทัดเสมอ (ฟิกซ์) */}
            {(() => {
              const MAX_DESCRIPTION_ROWS = 7;
              const descriptionRows = [];

              // เตรียม routes สำหรับแสดง (สูงสุด 4 routes) - เปลี่ยนเป็น object
              let routesList = [];
              if (flights?.routes && flights.routes.length > 0) {
                const maxRoutes = 4;
                routesList = flights.routes.slice(0, maxRoutes).map((route) => {
                  return {
                    flight: route.flight_number || route.flight || "",
                    rbd: route.rbd || "",
                    date: route.date || "",
                    path: route.origin && route.destination
                      ? `${route.origin}-${route.destination}`
                      : "",
                    time: route.departure_time && route.arrival_time
                      ? `${route.departure_time}-${route.arrival_time}`
                      : "",
                  };
                });
              } else if (flights?.routeDisplay) {
                routesList = [{
                  flight: flights.routeDisplay,
                  rbd: "",
                  date: "",
                  path: "",
                  time: "",
                }];
              }

              // เติมบรรทัดว่างให้ครบ 4 routes
              while (routesList.length < 4) {
                routesList.push({ flight: "", rbd: "", date: "", path: "", time: "" });
              }

              // บรรทัดที่ 1: Supplier only
              descriptionRows.push(
                <tr key="desc-0">
                  <td className="print-section-item print-airline-row">
                    <span className="print-airline-name">
                      {flights?.supplierName || ""}
                    </span>
                  </td>
                  <td className="print-td-amount"></td>
                </tr>
              );

              const adultPrice = passengerTypes?.find((p) => p.type === "ADULT")?.priceDisplay || "";
              const childPrice = passengerTypes?.find((p) => p.type === "CHILD")?.priceDisplay || "";
              const infantPrice = passengerTypes?.find((p) => p.type === "INFANT")?.priceDisplay || "";

              // บรรทัดที่ 2: Route[0] + ADULT (ซ่อนข้อความถ้าไม่มีราคา)
              descriptionRows.push(
                <tr key="desc-1">
                  <td className="print-section-item print-airline-row">
                    <div className="print-airline-name print-route-grid">
                      <span className="route-flight">{routesList[0]?.flight || ""}</span>
                      <span className="route-rbd">{routesList[0]?.rbd || ""}</span>
                      <span className="route-date">{routesList[0]?.date || ""}</span>
                      <span className="route-path">{routesList[0]?.path || ""}</span>
                      <span className="route-time">{routesList[0]?.time || ""}</span>
                    </div>
                    <span className="print-passenger-type">{adultPrice ? 'ADULT' : ''}</span>
                  </td>
                  <td className="print-td-amount">{adultPrice}</td>
                </tr>
              );

              // บรรทัดที่ 3: Route[1] + CHILD (ซ่อนข้อความถ้าไม่มีราคา)
              descriptionRows.push(
                <tr key="desc-2">
                  <td className="print-section-item print-airline-row">
                    <div className="print-airline-name print-route-grid">
                      <span className="route-flight">{routesList[1]?.flight || ""}</span>
                      <span className="route-rbd">{routesList[1]?.rbd || ""}</span>
                      <span className="route-date">{routesList[1]?.date || ""}</span>
                      <span className="route-path">{routesList[1]?.path || ""}</span>
                      <span className="route-time">{routesList[1]?.time || ""}</span>
                    </div>
                    <span className="print-passenger-type">{childPrice ? 'CHILD' : ''}</span>
                  </td>
                  <td className="print-td-amount">{childPrice}</td>
                </tr>
              );

              // บรรทัดที่ 4: Route[2] + INFANT (ซ่อนข้อความถ้าไม่มีราคา)
              descriptionRows.push(
                <tr key="desc-3">
                  <td className="print-section-item print-airline-row">
                    <div className="print-airline-name print-route-grid">
                      <span className="route-flight">{routesList[2]?.flight || ""}</span>
                      <span className="route-rbd">{routesList[2]?.rbd || ""}</span>
                      <span className="route-date">{routesList[2]?.date || ""}</span>
                      <span className="route-path">{routesList[2]?.path || ""}</span>
                      <span className="route-time">{routesList[2]?.time || ""}</span>
                    </div>
                    <span className="print-passenger-type">{infantPrice ? 'INFANT' : ''}</span>
                  </td>
                  <td className="print-td-amount">{infantPrice}</td>
                </tr>
              );

              // บรรทัดที่ 5: Route[3] (แสดงแค่ route ไม่มีราคา)
              descriptionRows.push(
                <tr key="desc-4">
                  <td className="print-section-item print-airline-row">
                    <div className="print-airline-name print-route-grid">
                      <span className="route-flight">{routesList[3]?.flight || ""}</span>
                      <span className="route-rbd">{routesList[3]?.rbd || ""}</span>
                      <span className="route-date">{routesList[3]?.date || ""}</span>
                      <span className="route-path">{routesList[3]?.path || ""}</span>
                      <span className="route-time">{routesList[3]?.time || ""}</span>
                    </div>
                  </td>
                  <td className="print-td-amount"></td>
                </tr>
              );

              // เติมบรรทัดว่างให้ครบ 7 บรรทัด
              while (descriptionRows.length < MAX_DESCRIPTION_ROWS) {
                descriptionRows.push(
                  <tr key={`empty-desc-${descriptionRows.length}`}>
                    <td className="print-section-item">
                      {"\u00A0"}
                    </td>
                    <td className="print-td-amount">{"\u00A0"}</td>
                  </tr>
                );
              }

              return descriptionRows;
            })()}

            {/* Other Section - 5 บรรทัดเสมอ (ฟิกซ์) */}
            <tr>
              <td className="print-section-header">Other</td>
              <td className="print-td-amount"></td>
            </tr>
            {(() => {
              const MAX_OTHER_ROWS = 5;
              const otherRows = [];
              const displayExtras = (extras || []).slice(0, MAX_OTHER_ROWS);

              // แสดง extras ที่มี
              displayExtras.forEach((extra, index) => {
                otherRows.push(
                  <tr key={`extra-${index}`}>
                    <td className="print-section-item">
                      {extra.description || "\u00A0"}
                    </td>
                    <td className="print-td-amount">
                      {extra.priceDisplay || "\u00A0"}
                    </td>
                  </tr>
                );
              });

              // เติมบรรทัดว่างให้ครบ 5 บรรทัด
              while (otherRows.length < MAX_OTHER_ROWS) {
                otherRows.push(
                  <tr key={`empty-other-${otherRows.length}`}>
                    <td className="print-section-item">{"\u00A0"}</td>
                    <td className="print-td-amount">{"\u00A0"}</td>
                  </tr>
                );
              }

              return otherRows;
            })()}

            {/* Summary Row - Sub-Total */}
            <tr className="print-summary-row">
              <td className="print-td-amount print-summary-label">
                Sub-Total
              </td>
              <td className="print-td-amount print-summary-value">
                {formatCurrencyWithDecimal(summary?.subtotal || 0)} Baht
              </td>
            </tr>

            <tr className="print-summary-row">
              <td className="print-td-amount print-summary-label">
                VAT {Math.floor(summary?.vatPercent || 0)}%
              </td>
              <td className="print-td-amount print-summary-value">
                {formatCurrency(summary?.vat || 0)} Baht
              </td>
            </tr>

            <tr className="print-total-row">
              <td className="print-total-label-cell">
                <span className="print-total-english-text">
                  ({numberToEnglishText(summary?.total || 0)} Baht)
                </span>
                <span className="print-td-amount print-summary-label">
                  Total
                </span>
              </td>
              <td className="print-td-amount print-summary-value">
                {formatCurrencyWithDecimal(summary?.total || 0)} Baht
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment Instructions - ข้อความชำระเงิน 2 บรรทัด */}
      <div className="deposit-payment-instructions">
        <table className="deposit-payment-table">
          <tbody>
            {depositInfo?.depositDueDate && (
              <tr>
                <td className="payment-label">กรุณาชำระเงินมัดจำครั้งที่ 1 ภายในวันที่</td>
                <td className="payment-date">{depositInfo.depositDueDate}</td>
                <td className="payment-amount-label">จำนวน</td>
                <td className="payment-amount">
                  {formatCurrencyWithDecimal(depositInfo.depositAmount || 0)}
                </td>
                <td className="payment-currency">บาท</td>
              </tr>
            )}

            {depositInfo?.secondDepositAmount > 0 && (
              <tr>
                <td className="payment-label">กรุณาชำระเงินมัดจำครั้งที่ 2 ภายในวันที่</td>
                <td className="payment-date">{depositInfo.secondDepositDueDate || '-'}</td>
                <td className="payment-amount-label">จำนวน</td>
                <td className="payment-amount">
                  {formatCurrencyWithDecimal(depositInfo.secondDepositAmount || 0)}
                </td>
                <td className="payment-currency">บาท</td>
              </tr>
            )}

            {depositInfo?.fullPaymentDueDate && (
              <tr>
                <td className="payment-label">กรุณาชำระทั้งหมดภายในวันที่</td>
                <td className="payment-date">
                  {depositInfo.fullPaymentDueDate}
                </td>
                <td className="payment-amount-label">จำนวน</td>
                <td className="payment-amount">
                  {formatCurrencyWithDecimal(
                    (summary?.total || 0) - (depositInfo.depositAmount || 0) - (depositInfo.secondDepositAmount || 0)
                  )}
                </td>
                <td className="payment-currency">บาท</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Passenger Info Due Date - ข้อความใต้กรอบ (ออกมาจากกรอบ) */}
      {depositInfo?.passengerInfoDueDate && (
        <div className="deposit-passenger-info-notice">
          * แจ้งชื่อผู้โดยสารก่อนวันที่{" "}
          {depositInfo.passengerInfoDueDate.replace(/\//g, ".")}
        </div>
      )}
    </>
  );
};

export default DepositTable;
