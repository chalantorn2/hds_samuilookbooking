// src/contexts/AlertDialogContext.js
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from "react";

// Create context
const AlertDialogContext = createContext(null);

// Custom hook to use the alert dialog context
export const useAlertDialogContext = () => {
  return useContext(AlertDialogContext);
};

// AlertDialog Provider component
export const AlertDialogProvider = ({ children }) => {
  const [state, setState] = useState({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "ยืนยัน",
    cancelText: "ยกเลิก",
    actionVariant: "primary",
  });
  const resolveRef = useRef(null);

  const showAlert = useCallback((config) => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        title: config.title || "ยืนยันการดำเนินการ",
        description: config.description || "คุณต้องการดำเนินการนี้ใช่หรือไม่?",
        confirmText: config.confirmText || "ยืนยัน",
        cancelText: config.cancelText || "ยกเลิก",
        actionVariant: config.actionVariant || "primary",
      });
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
  }, []);

  return (
    <AlertDialogContext.Provider value={showAlert}>
      {children}

      {/* Alert Dialog Component */}
      {state.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 flex items-center justify-center">
            <div
              className="fixed inset-0 bg-black opacity-30"
              onClick={handleCancel}
            ></div>

            <div className="bg-white rounded-lg max-w-md w-full mx-auto shadow-lg z-50">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  {state.title}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {state.description}
                </p>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-md"
                    onClick={handleCancel}
                  >
                    {state.cancelText}
                  </button>

                  <button
                    type="button"
                    className={`px-4 py-2 text-white text-sm font-medium rounded-md ${
                      state.actionVariant === "destructive"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                    onClick={handleConfirm}
                  >
                    {state.confirmText}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AlertDialogContext.Provider>
  );
};
