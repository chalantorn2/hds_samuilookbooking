import React from "react";
import { Save, X } from "lucide-react";
import CustomerForm from "./CustomerForm";
import SupplierForm from "./SupplierForm";
import CityForm from "./CityForm";

const AddEditForm = ({
  selectedCategory,
  newItem,
  handleInputChange,
  handleCancelAdd,
  handleSaveNew,
}) => {
  return (
    <div className="mb-6 bg-blue-50 p-4 rounded-md information-form">
      <h3 className="font-semibold mb-2">เพิ่มข้อมูลใหม่</h3>

      {selectedCategory === "customer" ? (
        <CustomerForm
          item={newItem}
          handleInputChange={(e) => handleInputChange(e, "new")}
        />
      ) : selectedCategory === "city" ? (
        <CityForm
          item={newItem}
          handleInputChange={(e) => handleInputChange(e, "new")}
        />
      ) : (
        <SupplierForm
          item={newItem}
          handleInputChange={(e) => handleInputChange(e, "new")}
        />
      )}

      <div className="flex justify-end mt-3 space-x-2">
        <button
          onClick={handleCancelAdd}
          className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
        >
          <X size={16} className="mr-1 inline" /> ยกเลิก
        </button>
        <button
          onClick={handleSaveNew}
          className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
        >
          <Save size={16} className="mr-1 inline" /> บันทึก
        </button>
      </div>
    </div>
  );
};

export default AddEditForm;
