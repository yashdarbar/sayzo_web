"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { addApplication, auth } from "@/lib/firebase";

const ApplicationModal = ({ isOpen, onClose, task, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Ensure we're on client side for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  const [form, setForm] = useState({
    applicantName: "",
    applicantRole: "",
    description: "",
    experience: "",
    canFinishOnTime: "",
    email: "",
    city: "",
  });

  const input =
    "w-full bg-[#18181B] text-white placeholder:text-zinc-500 px-4 py-4 my-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-zinc-600";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!form.applicantName.trim()) return "Your name is required";
    if (!form.applicantRole.trim()) return "Your role/profession is required";
    if (!form.description.trim()) return "Description is required";
    if (!form.experience) return "Select your experience level";
    if (!form.canFinishOnTime) return "Please indicate if you can finish on time";
    if (!form.email.trim()) return "Email is required";
    if (!form.city.trim()) return "City is required";
    return "";
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Safety check: Prevent self-application
    if (task?.giverId === auth.currentUser?.uid) {
      setError("You cannot apply to your own task");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await addApplication({
        taskId: task.id,
        ...form,
      });
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Application Error:", err);
      setError("Failed to submit application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setError("");
    setSuccess(false);
    setForm({
      applicantName: "",
      applicantRole: "",
      description: "",
      experience: "",
      canFinishOnTime: "",
      email: "",
      city: "",
    });
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
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md bg-black border border-zinc-800 rounded-2xl"
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800">
              <h2 className="text-xl text-white font-semibold">
                Apply for Task
              </h2>
              <button onClick={resetAndClose}>
                <X className="text-zinc-400 hover:text-white" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-6 py-4 scrollbar-hide">
              {success ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                  <h3 className="text-white text-xl font-semibold">
                    Application Submitted!
                  </h3>
                  <p className="text-zinc-400 mt-2">
                    The task giver will review your application
                  </p>
                </div>
              ) : (
                <>
                  {/* Task Info */}
                  <div className="bg-zinc-900 rounded-lg p-4 mb-4">
                    <p className="text-zinc-400 text-xs mb-1">Applying for:</p>
                    <p className="text-white font-medium">{task?.taskName}</p>
                    <p className="text-zinc-500 text-sm mt-1">
                      Budget: {task?.amount} ({task?.budgetType})
                    </p>
                  </div>

                  {/* Form */}
                  <input
                    className={input}
                    placeholder="Your Name *"
                    name="applicantName"
                    value={form.applicantName}
                    onChange={handleChange}
                  />

                  <input
                    className={input}
                    placeholder="Your Role/Profession *"
                    name="applicantRole"
                    value={form.applicantRole}
                    onChange={handleChange}
                  />

                  <textarea
                    className={`${input} h-24 resize-none`}
                    placeholder="Why should you be selected? Describe your experience... *"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                  />

                  <select
                    name="experience"
                    className={input}
                    value={form.experience}
                    onChange={handleChange}
                  >
                    <option value="">Select Experience Level *</option>
                    <option value="beginner">Beginner (0-2 years)</option>
                    <option value="intermediate">Intermediate (2-5 years)</option>
                    <option value="expert">Expert (5+ years)</option>
                  </select>

                  <select
                    name="canFinishOnTime"
                    className={input}
                    value={form.canFinishOnTime}
                    onChange={handleChange}
                  >
                    <option value="">Can you finish within {task?.duration}? *</option>
                    <option value="yes">Yes, definitely</option>
                    <option value="maybe">Maybe, depends on scope</option>
                    <option value="no">No, I need more time</option>
                  </select>

                  <input
                    className={input}
                    placeholder="Email *"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                  />

                  <input
                    className={input}
                    placeholder="City *"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                  />

                  {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

                  <button
                    disabled={loading}
                    onClick={handleSubmit}
                    className="w-full mt-4 bg-white text-black py-4 rounded-full font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Application"
                    )}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ApplicationModal;
