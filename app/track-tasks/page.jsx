'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronRight, ChevronDown, ChevronLeft, Loader2, Clock, CheckCircle, XCircle } from 'lucide-react'
import TaskGiverAuthModal from '@/components/TaskGiverAuthModal'
import { auth, getTasksByGiver, getApplicationsByTask, updateApplicationStatus } from '@/lib/firebase'
import { TASK_STATUS, APPLICATION_STATUS } from '@/lib/constants'

export default function TrackTasksPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [activeTab, setActiveTab] = useState('offline')
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [expandedApplicant, setExpandedApplicant] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState([])
  const [applications, setApplications] = useState({})
  const [actionLoading, setActionLoading] = useState(null)

  // Check auth state on mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user)
        setIsAuthenticated(true)
        setShowAuthModal(false)
        fetchTasks(user.uid)
      }
    })
    return () => unsubscribe()
  }, [])

  // Fetch user's tasks
  const fetchTasks = async (userId) => {
    setLoading(true)
    try {
      const userTasks = await getTasksByGiver(userId)
      setTasks(userTasks)
    } catch (err) {
      console.error('Error fetching tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch applications when a task is selected
  useEffect(() => {
    if (selectedTaskId && !applications[selectedTaskId]) {
      fetchApplications(selectedTaskId)
    }
  }, [selectedTaskId])

  const fetchApplications = async (taskId) => {
    try {
      const taskApplications = await getApplicationsByTask(taskId)
      setApplications(prev => ({
        ...prev,
        [taskId]: taskApplications
      }))
    } catch (err) {
      console.error('Error fetching applications:', err)
    }
  }

  // Handle successful authentication
  const handleAuthSuccess = (user) => {
    setCurrentUser(user)
    setIsAuthenticated(true)
    setShowAuthModal(false)
    fetchTasks(user.uid)
  }

  // Filter tasks by type (offline/online)
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => task.taskType === activeTab)
  }, [activeTab, tasks])

  // Get applicants for selected task
  const selectedTask = tasks.find((task) => task.id === selectedTaskId)
  const applicants = applications[selectedTaskId] || []

  // Handle task selection
  const handleTaskClick = (taskId) => {
    setSelectedTaskId(taskId)
    setExpandedApplicant(null)
  }

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSelectedTaskId(null)
    setExpandedApplicant(null)
  }

  // Handle accept/reject applicant
  const handleApplicationAction = async (applicationId, status) => {
    setActionLoading(applicationId)
    try {
      await updateApplicationStatus(applicationId, status)

      // Send email notification to applicant
      const applicant = applicants.find(a => a.id === applicationId)
      if (applicant?.email) {
        try {
          await fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: applicant.email,
              applicantName: applicant.applicantName,
              taskName: selectedTask?.taskName,
              status: status === APPLICATION_STATUS.ACCEPTED ? 'accepted' : 'rejected',
              taskGiverName: selectedTask?.customerName,
              taskGiverPhone: selectedTask?.phone
            })
          })
        } catch (emailErr) {
          console.error('Error sending email notification:', emailErr)
          // Don't fail the whole operation if email fails
        }
      }

      // Refresh applications for this task
      await fetchApplications(selectedTaskId)
    } catch (err) {
      console.error('Error updating application:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // Get status badge for tasks
  const getStatusBadge = (status) => {
    switch (status) {
      case TASK_STATUS.PENDING_APPROVAL:
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        )
      case TASK_STATUS.APPROVED:
      case TASK_STATUS.ACTIVE:
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        )
      case TASK_STATUS.REJECTED:
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-40">
      {/* Auth Modal */}
      <TaskGiverAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />

      <div className="max-w-350 mx-auto px-4">
        {/* Banner */}
        <div className="text-white px-4 py-6 md:px-8 md:py-8 rounded-2xl" style={{ background: 'linear-gradient(to right, #22E200, #02D04D)' }}>
          <h1 className="font-semibold text-center text-pretty text-xl md:text-2xl lg:text-[34px] lg:leading-tight">
            Beta Access: Find verified skills (online & offline) in 10<br className="hidden md:block" />
            minutes. Zero platform fee for Beta users.
          </h1>
        </div>

        {/* Main Content - Full Width (30/70 split) */}
        <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-6 py-6">
          {/* My Tasks Section */}
          <div className={`bg-white rounded-lg p-4 md:p-6 ${selectedTaskId ? 'hidden lg:block' : 'block'}`}>
            <h2 className="font-bold mb-6 text-xl md:text-2xl">My Tasks</h2>

          {/* Tabs */}
          <div className="flex mb-6 bg-gray-100 rounded-lg">
            <button
              onClick={() => handleTabChange('offline')}
              className={`flex-1 py-4 font-semibold text-center transition-colors ${
                activeTab === 'offline'
                  ? 'bg-black text-white rounded-lg'
                  : 'text-gray-500'
              }`}
            >
              Offline
            </button>
            <button
              onClick={() => handleTabChange('online')}
              className={`flex-1 py-4 font-semibold text-center transition-colors ${
                activeTab === 'online'
                  ? 'bg-black text-white rounded-lg'
                  : 'text-gray-500'
              }`}
            >
              Online
            </button>
          </div>

          {/* Task List */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No {activeTab} tasks found
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleTaskClick(task.id)}
                  className={`flex items-center justify-between p-5 rounded-lg cursor-pointer transition-colors ${
                    selectedTaskId === task.id
                      ? 'bg-black text-white'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="truncate block">{task.taskName}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {selectedTaskId !== task.id && (
                      <>
                        {task.status === TASK_STATUS.PENDING_APPROVAL && (
                          <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                            Pending
                          </span>
                        )}
                        {(task.status === TASK_STATUS.APPROVED || task.status === TASK_STATUS.ACTIVE) && (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                            Approved
                          </span>
                        )}
                        {task.status === TASK_STATUS.REJECTED && (
                          <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                            Rejected
                          </span>
                        )}
                        {applications[task.id]?.length > 0 && (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                            {applications[task.id].length} applicant{applications[task.id].length > 1 ? 's' : ''}
                          </span>
                        )}
                      </>
                    )}
                    <ChevronRight className={`w-5 h-5 flex-shrink-0 ${
                      selectedTaskId === task.id ? 'text-white' : 'text-gray-400'
                    }`} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

          {/* Applicants Section */}
          <div className={`bg-white rounded-lg p-4 md:p-6 ${!selectedTaskId ? 'hidden lg:block' : 'block'}`}>
            {/* Mobile Back Button */}
            <button
              onClick={() => setSelectedTaskId(null)}
              className="lg:hidden flex items-center gap-2 mb-4 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
              Back to tasks
            </button>

            <h2 className="font-bold mb-6 text-xl md:text-2xl">
              Applicants
              {selectedTask && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  for: {selectedTask.taskName?.substring(0, 30)}...
                </span>
              )}
            </h2>

          {/* Show rejection reason if task is rejected */}
          {selectedTask?.status === TASK_STATUS.REJECTED && selectedTask?.adminRejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700 text-sm">
                <strong>Task Rejected:</strong> {selectedTask.adminRejectionReason}
              </p>
            </div>
          )}

          {/* Show pending notice */}
          {selectedTask?.status === TASK_STATUS.PENDING_APPROVAL && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-700 text-sm">
                <strong>Pending Approval:</strong> Your task is being reviewed by admin. Once approved, it will be visible to task doers.
              </p>
            </div>
          )}

          {/* Applicants List */}
          <div className="space-y-3">
            {!selectedTaskId ? (
              <div className="text-center py-8 text-gray-400">
                Select a task to view applicants
              </div>
            ) : applicants.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No applicants yet for this task
              </div>
            ) : (
              applicants.map((applicant) => {
                const isExpanded = expandedApplicant === applicant.id
                return (
                  <div
                    key={applicant.id}
                    className={`bg-gray-50 rounded-lg overflow-hidden transition-all duration-300 ${
                      isExpanded ? '' : 'hover:bg-gray-100'
                    }`}
                  >
                    {/* Header - always visible */}
                    <div
                      onClick={() =>
                        setExpandedApplicant(isExpanded ? null : applicant.id)
                      }
                      className="flex items-center justify-between p-5 cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate">
                          {applicant.applicantName} <span className="text-sm text-gray-500 font-normal">• {applicant.applicantRole}</span>
                        </p>
                        {applicant.status !== APPLICATION_STATUS.PENDING && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            applicant.status === APPLICATION_STATUS.ACCEPTED
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {applicant.status === APPLICATION_STATUS.ACCEPTED ? 'Accepted' : 'Rejected'}
                          </span>
                        )}
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        <ChevronDown
                          className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                            isExpanded ? 'rotate-180' : 'rotate-0'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Expanded Details - grows within the same card */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4">
                        {/* Description with rounded border */}
                        <div className="border border-gray-200 rounded-lg p-3">
                          <p className="text-sm text-gray-600 leading-relaxed break-words">
                            {applicant.description}
                          </p>
                        </div>

                        {/* Details - responsive layout */}
                        <div className="space-y-2 text-sm">
                          {/* Line 1: Experience & Can finish */}
                          <div className="flex flex-col md:flex-row md:gap-4">
                            <p>
                              <span className="text-gray-900">Experience: </span>
                              <span className="text-gray-500 capitalize">{applicant.experience}</span>
                            </p>
                            <p>
                              <span className="text-gray-900">Can finish on time? </span>
                              <span className="text-gray-500 capitalize">{applicant.canFinishOnTime}</span>
                            </p>
                          </div>
                          {/* Line 2: Mobile, Email, City - stack on mobile */}
                          <div className="flex flex-col md:flex-row md:gap-4">
                            <p>
                              <span className="text-gray-900">Mobile: </span>
                              <span className="text-gray-500">{applicant.applicantPhone?.replace('+91', '') || 'N/A'}</span>
                            </p>
                            <p>
                              <span className="text-gray-900">Email: </span>
                              <span className="text-gray-500">{applicant.email}</span>
                            </p>
                            <p>
                              <span className="text-gray-900">City: </span>
                              <span className="text-gray-500">{applicant.city}</span>
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons - only show if application is pending */}
                        {applicant.status === APPLICATION_STATUS.PENDING && (
                          <div className="flex gap-3 pt-2">
                            <button
                              onClick={() => handleApplicationAction(applicant.id, APPLICATION_STATUS.ACCEPTED)}
                              disabled={actionLoading === applicant.id}
                              className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {actionLoading === applicant.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                'Accept'
                              )}
                            </button>
                            <button
                              onClick={() => handleApplicationAction(applicant.id, APPLICATION_STATUS.REJECTED)}
                              disabled={actionLoading === applicant.id}
                              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
