import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * คอมโพเนนต์สำหรับควบคุมการแบ่งหน้า
 * @param {Object} props - คุณสมบัติของคอมโพเนนต์
 * @param {number} props.currentPage - หน้าปัจจุบัน
 * @param {number} props.totalPages - จำนวนหน้าทั้งหมด
 * @param {Function} props.setCurrentPage - ฟังก์ชันตั้งค่าหน้าปัจจุบัน
 * @param {number} props.indexOfFirstItem - ดัชนีของรายการแรกในหน้าปัจจุบัน
 * @param {number} props.indexOfLastItem - ดัชนีของรายการสุดท้ายในหน้าปัจจุบัน
 * @param {Array} props.filteredData - ข้อมูลหลังจากผ่านการกรองแล้ว
 */
const Pagination = ({
  currentPage,
  totalPages,
  setCurrentPage,
  indexOfFirstItem,
  indexOfLastItem,
  filteredData,
}) => {
  return (
    <div className="px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              แสดง <span className="font-medium">{indexOfFirstItem + 1}</span>{" "}
              ถึง{" "}
              <span className="font-medium">
                {Math.min(indexOfLastItem, filteredData.length)}
              </span>{" "}
              จากทั้งหมด{" "}
              <span className="font-medium">{filteredData.length}</span> รายการ
            </p>
          </div>
          <div>
            <nav
              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
              aria-label="Pagination"
            >
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }).map((_, index) => {
                // แสดงเฉพาะหน้าที่อยู่ใกล้หน้าปัจจุบัน
                if (
                  index + 1 === 1 ||
                  index + 1 === totalPages ||
                  (index + 1 >= currentPage - 1 && index + 1 <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={index}
                      onClick={() => setCurrentPage(index + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === index + 1
                          ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                } else if (
                  index + 1 === currentPage - 2 ||
                  index + 1 === currentPage + 2
                ) {
                  return (
                    <span
                      key={index}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                    >
                      ...
                    </span>
                  );
                }
                return null;
              })}

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Next</span>
                <ChevronRight size={16} />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
