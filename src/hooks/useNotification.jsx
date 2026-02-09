import { useState, useEffect, useCallback } from "react";

/**
 * Custom hook สำหรับแสดงข้อความแจ้งเตือนแบบ popup หรือ toast
 * @returns {Object} ฟังก์ชันสำหรับแสดงข้อความแจ้งเตือนประเภทต่างๆ
 */
export const useNotification = () => {
  const [notifications, setNotifications] = useState([]);

  // สร้าง ID สำหรับแต่ละข้อความแจ้งเตือน
  const generateId = () =>
    `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // ลบข้อความแจ้งเตือนตาม ID
  const removeNotification = useCallback((id) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  }, []);

  // ฟังก์ชันสำหรับแสดงข้อความแจ้งเตือนทั่วไป
  const showNotification = useCallback(
    (message, type = "info", duration = 5000) => {
      const id = generateId();
      const notification = { id, message, type, duration };

      setNotifications((prev) => [...prev, notification]);

      // ลบข้อความแจ้งเตือนอัตโนมัติหลังจากเวลาที่กำหนด
      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }

      return id;
    },
    [removeNotification]
  );

  // ฟังก์ชันสำหรับแสดงข้อความแจ้งเตือนสำเร็จ
  const showSuccess = useCallback(
    (message, duration = 5000) => {
      return showNotification(message, "success", duration);
    },
    [showNotification]
  );

  // ฟังก์ชันสำหรับแสดงข้อความแจ้งเตือนข้อผิดพลาด
  const showError = useCallback(
    (message, duration = 5000) => {
      return showNotification(message, "error", duration);
    },
    [showNotification]
  );

  // ฟังก์ชันสำหรับแสดงข้อความแจ้งเตือนคำเตือน
  const showWarning = useCallback(
    (message, duration = 5000) => {
      return showNotification(message, "warning", duration);
    },
    [showNotification]
  );

  // ฟังก์ชันสำหรับแสดงข้อความแจ้งเตือนข้อมูล
  const showInfo = useCallback(
    (message, duration = 5000) => {
      return showNotification(message, "info", duration);
    },
    [showNotification]
  );

  // คอมโพเนนต์สำหรับแสดงข้อความแจ้งเตือนทั้งหมด
  const NotificationContainer = useCallback(() => {
    if (notifications.length === 0) return null;

    return (
      <div className="fixed top-4 right-4 z-[9999] flex flex-col space-y-2">
        {notifications.map((notification) => {
          // กำหนดสีของข้อความแจ้งเตือนตามประเภท
          const baseClasses =
            "px-4 py-2 rounded-md shadow-md max-w-xs flex items-center";
          let colorClasses;

          switch (notification.type) {
            case "success":
              colorClasses = "bg-green-500 text-white";
              break;
            case "error":
              colorClasses = "bg-red-500 text-white";
              break;
            case "warning":
              colorClasses = "bg-yellow-500 text-white";
              break;
            case "info":
            default:
              colorClasses = "bg-blue-500 text-white";
              break;
          }

          return (
            <div
              key={notification.id}
              className={`${baseClasses} ${colorClasses}`}
              onClick={() => removeNotification(notification.id)}
            >
              {/* แก้ไขตรงนี้ - เปลี่ยนจาก <span className="flex-1"> */}
              <div className="flex-1">
                {typeof notification.message === "object" ? (
                  <div>
                    <div className="font-medium">
                      {notification.message.title}
                    </div>
                    <div className="text-sm">
                      {notification.message.details}
                    </div>
                    <div className="text-xs">{notification.message.time}</div>
                  </div>
                ) : (
                  <span>{notification.message}</span>
                )}
              </div>
              <button className="ml-2 focus:outline-none">×</button>
            </div>
          );
        })}
      </div>
    );
  }, [notifications, removeNotification]);

  return {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification,
    NotificationContainer,
    notifications,
  };
};
