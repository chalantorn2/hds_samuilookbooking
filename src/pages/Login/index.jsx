import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { User, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import logoImage from "../../assets/Logo.png";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ดึงเส้นทางที่ผู้ใช้ต้องการเข้าถึงก่อนถูกส่งมาที่หน้า login
  const from = location.state?.from || "/";

  // ถ้ามีผู้ใช้อยู่แล้ว ให้ไปที่หน้าที่ต้องการเข้าถึงหรือหน้าหลัก
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  // ตรวจสอบว่ามีข้อมูลการ Remember ไว้หรือไม่
  useEffect(() => {
    const savedUsername = localStorage.getItem("rememberedUsername");
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ตรวจสอบข้อมูล
    if (!username.trim() || !password) {
      setError("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }

    try {
      setError("");
      setLoading(true);
      const result = await login(username, password, rememberMe);

      if (!result.success) {
        setError(result.error || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
        return;
      }

      // บันทึกหรือลบ username จาก localStorage ตามสถานะ rememberMe
      if (rememberMe) {
        localStorage.setItem("rememberedUsername", username);
      } else {
        localStorage.removeItem("rememberedUsername");
      }

      // เข้าสู่ระบบสำเร็จ นำทางไปยังเส้นทางที่ต้องการเข้าถึงก่อนหน้า หรือหน้าหลัก
      navigate(from, { replace: true });
    } catch (error) {
      console.error("Login error:", error);
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-blue-600 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 w-full max-w-md mx-4">
        <div className="flex flex-col items-center mb-6">
          <img src={logoImage} alt="SamuiLookBooking" className="h-20 mb-4" />
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            ล็อคอินเข้าสู่ระบบ
          </h2>
          <p className="text-sm text-gray-600 text-center">
            กรุณากรอก Username และ Password เพื่อเข้าสู่ระบบ
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              className="block text-sm font-medium text-gray-700 mb-1"
              htmlFor="username"
            >
              ชื่อผู้ใช้
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-gray-500" />
              </div>
              <input
                type="text"
                className="pl-10 w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="mb-4 relative">
            <label
              className="block text-sm font-medium text-gray-700 mb-1"
              htmlFor="password"
            >
              รหัสผ่าน
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-500" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                className="pl-10 pr-10 w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={toggleShowPassword}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex justify-between mb-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
              />
              <label htmlFor="rememberMe" className="text-sm text-gray-600">
                จดจำการเข้าสู่ระบบ
              </label>
            </div>

            <div>
              <a href="#" className="text-sm text-blue-600 hover:underline">
                ลืมรหัสผ่าน?
              </a>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition duration-200 font-medium flex items-center justify-center"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>กำลังเข้าสู่ระบบ...</span>
              </div>
            ) : (
              <>
                <LogIn size={18} className="mr-2" /> เข้าสู่ระบบ
              </>
            )}
          </button>
        </form>

        <div className="mt-10 text-center text-sm text-gray-600">
          SamuiLookBooking
        </div>
      </div>
    </div>
  );
};

export default Login;
