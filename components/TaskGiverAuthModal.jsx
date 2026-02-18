"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { sendOTP, verifyOTP, auth } from "@/lib/firebase";

const TaskGiverAuthModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");

  // Ensure we're on client side for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  const input =
    "w-full bg-[#18181B] text-white placeholder:text-zinc-500 px-4 py-4 my-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-zinc-600";

  const handleMobileChange = (e) => {
    const v = e.target.value.replace(/\D/g, "");
    if (v.length <= 10) {
      setMobile(v);
      // Reset OTP states if mobile changes
      if (otpSent) {
        setOtpSent(false);
        setOtpVerified(false);
        setOtp("");
      }
    }
  };

  const handleSendOTP = async () => {
    if (mobile.length !== 10) {
      setError("Enter valid 10 digit phone number");
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
      setOtpVerified(true);
      // Pass user data to parent
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

  const resetAndClose = () => {
    setError("");
    setOtpSent(false);
    setOtpVerified(false);
    setMobile("");
    setOtp("");
    onClose();
  };

  // Don't render on server
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1001] bg-black/80 backdrop-blur flex items-center justify-center p-4"
        >
          {/* reCAPTCHA container - invisible */}
          <div id="recaptcha-container"></div>

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md bg-black border border-zinc-800 rounded-2xl"
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800">
              <h2 className="text-xl text-white font-semibold">
                Verify your mobile to view results
              </h2>
              <button onClick={resetAndClose}>
                <X className="text-zinc-400 hover:text-white" />
              </button>
            </div>

            <div className="px-6 py-6">
              {/* Mobile Number Input */}
              <div className="relative">
                <input
                  className={`${input} pr-24`}
                  placeholder="Mobile Number *"
                  inputMode="numeric"
                  value={mobile}
                  onChange={handleMobileChange}
                  disabled={otpVerified}
                />
                {!otpVerified && (
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
                )}
                {otpVerified && (
                  <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>

              {/* OTP Input */}
              {otpSent && !otpVerified && (
                <div className="relative">
                  <input
                    className={`${input} pr-24`}
                    placeholder="Enter 6-digit OTP *"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      if (v.length <= 6) setOtp(v);
                    }}
                  />
                  <button
                    onClick={handleVerifyOTP}
                    disabled={otp.length !== 6 || loading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-600 text-white text-sm px-3 py-2 rounded-lg disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Verify"
                    )}
                  </button>
                </div>
              )}

              {otpVerified && (
                <p className="text-green-500 text-sm mb-2">
                  Phone verified successfully
                </p>
              )}

              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

              {/* Verify Button - only show if OTP sent but not yet verified */}
              {otpSent && !otpVerified && (
                <button
                  disabled={loading || otp.length !== 6}
                  onClick={handleVerifyOTP}
                  className="w-full mt-4 bg-white text-black py-4 rounded-full font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Continue"
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default TaskGiverAuthModal;
