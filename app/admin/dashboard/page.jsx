"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  LogOut,
  CheckCircle,
  XCircle,
  X,
  MapPin,
  Globe,
  User,
  Phone,
  Calendar,
  Trash2,
  ChevronDown
} from "lucide-react";
import { auth, getPendingTasks, getTasksByStatus, updateTaskStatus, deleteTask } from "@/lib/firebase";
import { isAdminPhone } from "@/lib/adminConfig";
import { TASK_STATUS } from "@/lib/constants";

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedTask, setSelectedTask] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Check admin auth on mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user || !isAdminPhone(user.phoneNumber)) {
        router.push("/admin");
      } else {
        fetchTasks();
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Handle screen resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch tasks when filter changes
  useEffect(() => {
    if (auth.currentUser) {
      fetchTasks();
    }
  }, [statusFilter]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let data;
      if (statusFilter === "pending") {
        data = await getPendingTasks();
      } else if (statusFilter === "all") {
        const pending = await getTasksByStatus(TASK_STATUS.PENDING_APPROVAL);
        const approved = await getTasksByStatus(TASK_STATUS.APPROVED);
        const rejected = await getTasksByStatus(TASK_STATUS.REJECTED);
        data = [...pending, ...approved, ...rejected];
      } else {
        data = await getTasksByStatus(statusFilter);
      }
      setTasks(data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (taskId) => {
    setActionLoading(taskId);
    try {
      await updateTaskStatus(taskId, TASK_STATUS.APPROVED);
      await fetchTasks();
      setSelectedTask(null);
    } catch (err) {
      console.error("Error approving task:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim() || !selectedTask) return;

    setActionLoading(selectedTask.id);
    try {
      await updateTaskStatus(selectedTask.id, TASK_STATUS.REJECTED, rejectReason);
      setShowRejectModal(false);
      setRejectReason("");
      await fetchTasks();
      setSelectedTask(null);
    } catch (err) {
      console.error("Error rejecting task:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (taskId) => {
    if (!confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
      return;
    }
    setActionLoading(taskId);
    try {
      await deleteTask(taskId);
      await fetchTasks();
      setSelectedTask(null);
    } catch (err) {
      console.error("Error deleting task:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/admin");
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      [TASK_STATUS.PENDING_APPROVAL]: "bg-yellow-100 text-yellow-700",
      [TASK_STATUS.APPROVED]: "bg-green-100 text-green-700",
      [TASK_STATUS.REJECTED]: "bg-red-100 text-red-700"
    };
    return styles[status] || "bg-gray-100 text-gray-700";
  };

  const filterOptions = [
    { id: "pending", label: "Pending" },
    { id: TASK_STATUS.APPROVED, label: "Approved" },
    { id: TASK_STATUS.REJECTED, label: "Rejected" },
    { id: "all", label: "All Tasks" }
  ];

  const currentFilterLabel = filterOptions.find(f => f.id === statusFilter)?.label || "Filter";

  // Task Card Component
  const TaskCard = ({ task, isSelected, onClick }) => (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl border-2 p-4 transition ${
        isSelected
          ? "border-primary-btn bg-primary-btn/5"
          : "border-gray-200 hover:border-primary-btn"
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start gap-2 mb-2">
        <h3 className="text-sm md:text-base font-semibold leading-6 text-gray-800">
          {task.taskName}
        </h3>
        <span
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
            task.taskType === "online"
              ? "bg-blue-100 text-blue-700"
              : "bg-orange-100 text-orange-700"
          }`}
        >
          {task.taskType === "online" ? (
            <Globe className="w-3 h-3" />
          ) : (
            <MapPin className="w-3 h-3" />
          )}
          {task.taskType}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3">
        {task.description}
      </p>

      {/* Skills */}
      {task.skills && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {task.skills.split(",").slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium"
            >
              {skill.trim()}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex gap-4 text-sm text-gray-600">
          <span className="font-medium">₹{task.amount}</span>
          <span>{task.duration}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadge(task.status)}`}>
          {task.status?.replace("_", " ")}
        </span>
      </div>
    </div>
  );

  // Detail Panel Component
  const TaskDetailPanel = ({ task, onClose }) => {
    if (!task) {
      return (
        <div className="h-full flex items-center justify-center text-gray-400">
          Select a task to see details
        </div>
      );
    }

    const isPending = task.status === TASK_STATUS.PENDING_APPROVAL;

    return (
      <div className="relative bg-white rounded-xl shadow-2xl p-8 sticky top-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-black transition"
        >
          <X size={18} />
        </button>

        {/* Status Badge */}
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${getStatusBadge(task.status)}`}>
          {task.status?.replace("_", " ").toUpperCase()}
        </span>

        {/* Title */}
        <h2 className="text-2xl font-medium text-gray-800 leading-snug">
          {task.taskName}
        </h2>

        {/* Task Type */}
        <div className="flex items-center gap-2 mt-3">
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm ${
            task.taskType === "online"
              ? "bg-blue-50 text-blue-700"
              : "bg-orange-50 text-orange-700"
          }`}>
            {task.taskType === "online" ? <Globe className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
            {task.taskType === "online" ? "Online Task" : "Offline Task"}
          </span>
        </div>

        {/* Description */}
        <div className="mt-6">
          <p className="text-sm text-gray-400 mb-1">Description</p>
          <p className="text-sm text-gray-700 leading-relaxed">{task.description}</p>
        </div>

        {/* Customer Info */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-400 mb-1">Posted by</p>
            <p className="text-sm text-gray-700 flex items-center gap-1.5">
              <User className="w-4 h-4 text-gray-400" />
              {task.customerName}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Phone</p>
            <p className="text-sm text-gray-700 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-gray-400" />
              {task.phone}
            </p>
          </div>
        </div>

        {/* Budget & Duration */}
        <div className="mt-6">
          <p className="text-sm text-gray-400">Budget</p>
          <p className="text-2xl font-semibold text-gray-800">₹{task.amount}</p>
          <p className="text-sm text-gray-500 mt-1">{task.budgetType}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <p className="text-sm text-gray-400">Duration</p>
            <p className="text-sm font-semibold text-gray-700">{task.duration}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Experience</p>
            <p className="text-sm font-semibold text-gray-700 capitalize">{task.experience}</p>
          </div>
        </div>

        {/* Location (for offline) */}
        {task.taskType === "offline" && task.location && (
          <div className="mt-6">
            <p className="text-sm text-gray-400">Location</p>
            <p className="text-sm font-semibold text-gray-700">{task.location}</p>
          </div>
        )}

        {/* Skills */}
        {task.skills && (
          <div className="mt-6">
            <p className="text-sm text-gray-400 mb-2">Skills Required</p>
            <div className="flex flex-wrap gap-2">
              {task.skills.split(",").map((skill) => (
                <span
                  key={skill}
                  className="text-sm px-3 py-1 rounded-md bg-gray-100 text-gray-700 font-medium"
                >
                  {skill.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Created Date */}
        <div className="mt-6">
          <p className="text-sm text-gray-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Created {formatDate(task.createdAt)}
          </p>
        </div>

        {/* Rejection Reason */}
        {task.status === TASK_STATUS.REJECTED && task.adminRejectionReason && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">
              <strong>Rejection Reason:</strong> {task.adminRejectionReason}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
          {isPending && (
            <>
              <button
                onClick={() => handleApprove(task.id)}
                disabled={actionLoading === task.id}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium disabled:opacity-50 transition"
              >
                {actionLoading === task.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                Approve
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading === task.id}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium disabled:opacity-50 transition"
              >
                <XCircle className="w-5 h-5" />
                Reject
              </button>
            </>
          )}
          <button
            onClick={() => handleDelete(task.id)}
            disabled={actionLoading === task.id}
            className={`flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-medium disabled:opacity-50 transition ${
              isPending ? "px-4" : "flex-1"
            }`}
          >
            <Trash2 className="w-5 h-5" />
            Delete
          </button>
        </div>
      </div>
    );
  };

  // Mobile Bottom Sheet
  const MobileBottomSheet = ({ task, onClose }) => {
    if (!task) return null;

    const isPending = task.status === TASK_STATUS.PENDING_APPROVAL;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 z-50"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[85vh] overflow-y-auto"
        >
          {/* Handle */}
          <div className="sticky top-0 bg-white pt-3 pb-2 px-6">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto" />
          </div>

          <div className="px-6 pb-8">
            {/* Status Badge */}
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${getStatusBadge(task.status)}`}>
              {task.status?.replace("_", " ").toUpperCase()}
            </span>

            {/* Title */}
            <h2 className="text-xl font-semibold text-gray-800">{task.taskName}</h2>

            {/* Task Type */}
            <div className="flex items-center gap-2 mt-2">
              <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                task.taskType === "online"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-orange-100 text-orange-700"
              }`}>
                {task.taskType === "online" ? <Globe className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                {task.taskType}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 mt-4 leading-relaxed">{task.description}</p>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
              <div>
                <p className="text-gray-400">Posted by</p>
                <p className="text-gray-700 font-medium">{task.customerName}</p>
              </div>
              <div>
                <p className="text-gray-400">Phone</p>
                <p className="text-gray-700 font-medium">{task.phone}</p>
              </div>
              <div>
                <p className="text-gray-400">Budget</p>
                <p className="text-gray-700 font-semibold">₹{task.amount}</p>
              </div>
              <div>
                <p className="text-gray-400">Duration</p>
                <p className="text-gray-700 font-medium">{task.duration}</p>
              </div>
            </div>

            {/* Skills */}
            {task.skills && (
              <div className="mt-6">
                <p className="text-sm text-gray-400 mb-2">Skills Required</p>
                <div className="flex flex-wrap gap-2">
                  {task.skills.split(",").map((skill) => (
                    <span
                      key={skill}
                      className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-700"
                    >
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Rejection Reason */}
            {task.status === TASK_STATUS.REJECTED && task.adminRejectionReason && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">
                  <strong>Rejection Reason:</strong> {task.adminRejectionReason}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
              {isPending && (
                <>
                  <button
                    onClick={() => handleApprove(task.id)}
                    disabled={actionLoading === task.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-medium disabled:opacity-50"
                  >
                    {actionLoading === task.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-5 h-5" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading === task.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-lg font-medium disabled:opacity-50"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject
                  </button>
                </>
              )}
              <button
                onClick={() => handleDelete(task.id)}
                disabled={actionLoading === task.id}
                className={`flex items-center justify-center gap-2 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium disabled:opacity-50 ${
                  isPending ? "px-4" : "flex-1"
                }`}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="min-h-screen bg-white pt-32">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="max-w-350 mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>

          <div className="flex items-center gap-4">
            {/* Status Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                {currentFilterLabel}
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilterDropdown ? "rotate-180" : ""}`} />
              </button>

              {showFilterDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowFilterDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                    {filterOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setStatusFilter(option.id);
                          setShowFilterDropdown(false);
                          setSelectedTask(null);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition ${
                          statusFilter === option.id
                            ? "text-primary-btn font-medium"
                            : "text-gray-700"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-350 mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary-btn mx-auto mb-4" />
              <p className="text-gray-500">Loading tasks...</p>
            </div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400">No tasks found</p>
          </div>
        ) : (
          <>
            {/* Desktop Layout */}
            {!isMobile && (
              <>
                {!selectedTask ? (
                  // Grid View (no selection)
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isSelected={false}
                        onClick={() => setSelectedTask(task)}
                      />
                    ))}
                  </div>
                ) : (
                  // Split View (with selection)
                  <div className="grid grid-cols-[1.2fr_1fr] gap-6">
                    <div className="space-y-4 overflow-y-auto max-h-[80vh] pr-2">
                      {tasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          isSelected={selectedTask?.id === task.id}
                          onClick={() => setSelectedTask(task)}
                        />
                      ))}
                    </div>
                    <TaskDetailPanel
                      task={selectedTask}
                      onClose={() => setSelectedTask(null)}
                    />
                  </div>
                )}
              </>
            )}

            {/* Mobile Layout */}
            {isMobile && (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isSelected={false}
                    onClick={() => setSelectedTask(task)}
                  />
                ))}

                {selectedTask && (
                  <MobileBottomSheet
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Reject Task
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Please provide a reason for rejecting this task. This will be visible to the task giver.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full bg-gray-50 text-gray-800 placeholder:text-gray-400 px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-primary-btn focus:ring-1 focus:ring-primary-btn resize-none h-24"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Reject Task"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
