"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { sendOTP, verifyOTP, auth } from "@/lib/firebase";
import { isAdminPhone } from "@/lib/adminConfig";

const AdminAuthModal = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");

  const input =
    "w-full bg-[#18181B] text-white placeholder:text-zinc-500 px-4 py-4 my-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-zinc-600";

  const handleMobileChange = (e) => {
    const v = e.target.value.replace(/\D/g, "");
    if (v.length <= 10) {
      setMobile(v);
      if (otpSent) {
        setOtpSent(false);
        setOtp("");
      }
    }
  };

  const handleSendOTP = async () => {
    if (mobile.length !== 10) {
      setError("Enter valid 10 digit phone number");
      return;
    }

    // Check if this is admin phone before sending OTP
    if (!isAdminPhone(mobile)) {
      setError("This phone number is not authorized for admin access");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await sendOTP(mobile);
      setOtpSent(true);
    } catch (err) {
      console.error("OTP Error:", err);
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError("Enter 6 digit OTP");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const user = await verifyOTP(otp);

      // Double-check admin phone after verification
      if (!isAdminPhone(user.phoneNumber || mobile)) {
        await auth.signOut();
        setError("Unauthorized: Not an admin phone number");
        return;
      }

      onSuccess({
        uid: user.uid,
        phone: user.phoneNumber,
        mobile: mobile
      });
    } catch (err) {
      console.error("Verify Error:", err);
      setError("Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 pt-32">
      {/* reCAPTCHA container */}
      <div id="recaptcha-container"></div>

      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl text-white font-bold">Admin Login</h1>
          <p className="text-zinc-400 text-sm mt-2">
            Enter your admin phone number to continue
          </p>
        </div>

        {/* Mobile Number Input */}
        <div className="relative">
          <input
            className={`${input} pr-24`}
            placeholder="Admin Mobile Number *"
            inputMode="numeric"
            value={mobile}
            onChange={handleMobileChange}
          />
          <button
            onClick={handleSendOTP}
            disabled={mobile.length !== 10 || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-zinc-700 text-white text-sm px-3 py-2 rounded-lg disabled:opacity-50"
          >
            {loading && !otpSent ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : otpSent ? (
              "Resend"
            ) : (
              "Send OTP"
            )}
          </button>
        </div>

        {/* OTP Input */}
        {otpSent && (
          <input
            className={input}
            placeholder="Enter 6-digit OTP *"
            inputMode="numeric"
            value={otp}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              if (v.length <= 6) setOtp(v);
            }}
          />
        )}

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

        {/* Login Button */}
        {otpSent && (
          <button
            disabled={loading || otp.length !== 6}
            onClick={handleVerifyOTP}
            className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-4 rounded-full font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                Access Admin Panel
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminAuthModal;
