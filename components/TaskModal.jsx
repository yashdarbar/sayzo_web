"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { sendOTP, verifyOTP, addTask, auth } from "@/lib/firebase";

const TaskModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [taskType, setTaskType] = useState("online");
  const [error, setError] = useState("");

  // OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState(null);

  const [form, setForm] = useState({
    customerName: "",
    taskName: "",
    phone: "",
    location: "",
    description: "",
    budgetType: "fixed",
    amount: "",
    duration: "",
    skills: "",
    experience: "",
  });

  const input =
    "w-full bg-[#18181B] text-white placeholder:text-zinc-500 px-4 py-4 my-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-zinc-600";

  // Check if user is already authenticated when modal opens
  useEffect(() => {
    if (isOpen) {
      const currentUser = auth.currentUser;
      if (currentUser) {
        // User already logged in - skip OTP
        setVerifiedUser(currentUser);
        setOtpVerified(true);

        // Pre-fill phone (remove +91 prefix for display)
        const phone = currentUser.phoneNumber?.replace('+91', '') || '';
        setForm(prev => ({ ...prev, phone }));

        // Pre-fill name from localStorage
        const savedName = localStorage.getItem('sayzo_user_name');
        if (savedName) {
          setForm(prev => ({ ...prev, customerName: savedName }));
        }
      }
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "budgetType") {
      setForm((p) => ({ ...p, budgetType: value, amount: "" }));
      return;
    }
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handlePhoneChange = (e) => {
    const v = e.target.value.replace(/\D/g, "");
    if (v.length <= 10) {
      setForm((p) => ({ ...p, phone: v }));
      // Reset OTP states if phone changes
      if (otpSent) {
        setOtpSent(false);
        setOtpVerified(false);
        setOtp("");
        setVerifiedUser(null);
      }
    }
  };

  const handleSendOTP = async () => {
    if (form.phone.length !== 10) {
      setError("Enter valid 10 digit phone number");
      return;
    }

    setError("");
    setOtpLoading(true);

    try {
      await sendOTP(form.phone);
      setOtpSent(true);
    } catch (err) {
      console.error("OTP Error:", err);
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError("Enter 6 digit OTP");
      return;
    }

    setError("");
    setOtpLoading(true);

    try {
      const user = await verifyOTP(otp);
      setVerifiedUser(user);
      setOtpVerified(true);
    } catch (err) {
      console.error("Verify Error:", err);
      setError("Invalid OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const validate = () => {
    if (!form.customerName.trim()) return "Customer name is required";
    if (!form.taskName.trim()) return "Task name is required";
    if (!otpVerified) return "Please verify your phone number";
    if (taskType === "offline" && !form.location.trim())
      return "Location is required for offline tasks";
    if (!form.description.trim()) return "Description is required";
    if (!form.amount.trim()) return "Amount is required";
    if (!form.duration.trim()) return "Duration is required";
    if (!form.skills.trim()) return "Skills are required";
    if (!form.experience) return "Select experience level";
    return "";
  };

  const submitTask = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Use auth.currentUser to ensure we have the authenticated user
      const currentUser = auth.currentUser;

      // Debug logging
      console.log("Current User:", currentUser);
      console.log("User UID:", currentUser?.uid);
      console.log("User Phone:", currentUser?.phoneNumber);

      if (!currentUser) {
        throw new Error("Authentication lost. Please verify OTP again.");
      }

      const taskData = {
        taskType,
        taskName: form.taskName,
        customerName: form.customerName,
        phone: form.phone,
        giverId: currentUser.uid,  // Match Firestore rules - must equal auth.uid
        userId: currentUser.uid,   // Keep for compatibility
        location: taskType === "offline" ? form.location : "Online",
        description: form.description,
        budgetType: form.budgetType,
        amount: form.amount,
        duration: form.duration,
        skills: form.skills,
        experience: form.experience,
      };

      console.log("Task Data being sent:", taskData);

      // Save name to localStorage for future pre-fill
      localStorage.setItem('sayzo_user_name', form.customerName);

      await addTask(taskData);
      setSuccess(true);
    } catch (err) {
      console.error("Submit Error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setSuccess(false);
    setError("");
    setOtp("");

    // Don't reset auth state if user is still logged in
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setOtpSent(false);
      setOtpVerified(false);
      setVerifiedUser(null);
    }

    // Reset form but keep name/phone if logged in
    if (currentUser) {
      const phone = currentUser.phoneNumber?.replace('+91', '') || '';
      const savedName = localStorage.getItem('sayzo_user_name') || '';
      setForm({
        customerName: savedName,
        phone: phone,
        taskName: "",
        location: "",
        description: "",
        budgetType: "fixed",
        amount: "",
        duration: "",
        skills: "",
        experience: "",
      });
    } else {
      setForm({
        customerName: "",
        taskName: "",
        phone: "",
        location: "",
        description: "",
        budgetType: "fixed",
        amount: "",
        duration: "",
        skills: "",
        experience: "",
      });
    }

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur flex items-center justify-center p-4">
          {/* reCAPTCHA container - invisible */}
          <div id="recaptcha-container"></div>

          <motion.div className="w-full max-w-md bg-black border border-zinc-800 rounded-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800">
              <h2 className="text-xl text-white font-semibold">Create a Task</h2>
              <button onClick={resetAndClose}>
                <X className="text-zinc-400 hover:text-white" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-6 py-4 scrollbar-hide">
              {success ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                  <h3 className="text-white text-xl font-semibold">
                    Task Submitted for Approval
                  </h3>
                  <p className="text-zinc-400 mt-2">
                    Your task will be reviewed and approved shortly
                  </p>
                  <button
                    onClick={resetAndClose}
                    className="mt-6 bg-white text-black px-6 py-3 rounded-full font-semibold"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  {/* Task Type Toggle */}
                  <div className="flex gap-2 mb-4">
                    {["online", "offline"].map((type) => (
                      <button
                        key={type}
                        onClick={() => setTaskType(type)}
                        className={`flex-1 py-3 rounded-xl font-semibold ${
                          taskType === type
                            ? "bg-white text-black"
                            : "bg-zinc-900 text-white"
                        }`}
                      >
                        {type === "online" ? "Online Task" : "Offline Task"}
                      </button>
                    ))}
                  </div>

                  {/* Form Fields */}
                  <input
                    className={input}
                    placeholder="Your Name *"
                    name="customerName"
                    value={form.customerName}
                    onChange={handleChange}
                  />
                  <input
                    className={input}
                    placeholder="Task Name *"
                    name="taskName"
                    value={form.taskName}
                    onChange={handleChange}
                  />

                  {/* Phone with OTP */}
                  <div className="relative">
                    <input
                      className={`${input} pr-24`}
                      placeholder="Phone Number *"
                      inputMode="numeric"
                      value={form.phone}
                      onChange={handlePhoneChange}
                      disabled={otpVerified}
                    />
                    {!otpVerified && (
                      <button
                        onClick={handleSendOTP}
                        disabled={form.phone.length !== 10 || otpLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-zinc-700 text-white text-sm px-3 py-2 rounded-lg disabled:opacity-50"
                      >
                        {otpLoading ? (
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
                        placeholder="Enter 6-digit OTP"
                        inputMode="numeric"
                        value={otp}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "");
                          if (v.length <= 6) setOtp(v);
                        }}
                      />
                      <button
                        onClick={handleVerifyOTP}
                        disabled={otp.length !== 6 || otpLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-600 text-white text-sm px-3 py-2 rounded-lg disabled:opacity-50"
                      >
                        {otpLoading ? (
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

                  {taskType === "offline" && (
                    <input
                      className={input}
                      placeholder="Location *"
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                    />
                  )}

                  <textarea
                    className={`${input} h-32`}
                    placeholder="Description *"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <select
                      name="budgetType"
                      className={input}
                      value={form.budgetType}
                      onChange={handleChange}
                    >
                      <option value="fixed">Fixed Price</option>
                      <option value="negotiable">Negotiable</option>
                    </select>
                    <input
                      className={input}
                      placeholder="Amount *"
                      name="amount"
                      value={form.amount}
                      onChange={handleChange}
                    />
                  </div>

                  <input
                    className={input}
                    placeholder="Duration *"
                    name="duration"
                    value={form.duration}
                    onChange={handleChange}
                  />
                  <input
                    className={input}
                    placeholder="Skills (comma separated) *"
                    name="skills"
                    value={form.skills}
                    onChange={handleChange}
                  />

                  <select
                    name="experience"
                    className={input}
                    value={form.experience}
                    onChange={handleChange}
                  >
                    <option value="">Select Experience *</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="expert">Expert</option>
                  </select>

                  {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

                  <button
                    disabled={loading}
                    onClick={submitTask}
                    className="w-full mt-4 bg-white text-black py-4 rounded-full font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      "Post Task"
                    )}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TaskModal;
