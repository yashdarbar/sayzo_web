'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronRight, ChevronDown, ChevronLeft, Loader2, Clock, CheckCircle, XCircle, MapPin, Globe, DollarSign, Briefcase } from 'lucide-react'
import TaskDoerAuthModal from '@/components/TaskDoerAuthModal'
import ApplicationModal from '@/components/ApplicationModal'
import { auth, getApprovedTasks, getApplicationsByApplicant, getTaskById } from '@/lib/firebase'
import { APPLICATION_STATUS } from '@/lib/constants'

export default function LiveTasksPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [activeTab, setActiveTab] = useState('offline')
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState([])
  const [myApplications, setMyApplications] = useState([])
  const [applicationTasks, setApplicationTasks] = useState({})
  const [showApplicationModal, setShowApplicationModal] = useState(false)

  // Check auth state on mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user)
        setIsAuthenticated(true)
        setShowAuthModal(false)
        fetchData(user.uid)
      }
    })
    return () => unsubscribe()
  }, [])

  // Fetch tasks and applications
  const fetchData = async (userId) => {
    setLoading(true)
    try {
      const [approvedTasks, userApplications] = await Promise.all([
        getApprovedTasks(),
        getApplicationsByApplicant(userId)
      ])
      setTasks(approvedTasks)
      setMyApplications(userApplications)

      // Fetch task details for each application
      const taskDetails = {}
      for (const app of userApplications) {
        if (app.taskId && !taskDetails[app.taskId]) {
          const task = await getTaskById(app.taskId)
          if (task) taskDetails[app.taskId] = task
        }
      }
      setApplicationTasks(taskDetails)
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle successful authentication
  const handleAuthSuccess = (user) => {
    setCurrentUser(user)
    setIsAuthenticated(true)
    setShowAuthModal(false)
    fetchData(user.uid)
  }

  // Filter tasks by type (offline/online)
  const filteredTasks = useMemo(() => {
    if (activeTab === 'my-applications') return []
    return tasks.filter((task) => task.taskType === activeTab)
  }, [activeTab, tasks])

  // Get selected item details
  const selectedTask = activeTab !== 'my-applications'
    ? tasks.find((task) => task.id === selectedItemId)
    : null

  const selectedApplication = activeTab === 'my-applications'
    ? myApplications.find((app) => app.id === selectedItemId)
    : null

  // Check if user already applied to a task
  const hasApplied = (taskId) => {
    return myApplications.some(app => app.taskId === taskId)
  }

  // Handle item selection
  const handleItemClick = (itemId) => {
    setSelectedItemId(itemId)
  }

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSelectedItemId(null)
  }

  // Handle apply button click
  const handleApplyClick = () => {
    setShowApplicationModal(true)
  }

  // Handle application success
  const handleApplicationSuccess = () => {
    setShowApplicationModal(false)
    if (currentUser) {
      fetchData(currentUser.uid)
    }
  }

  // Get status badge for applications
  const getApplicationStatusBadge = (status) => {
    switch (status) {
      case APPLICATION_STATUS.PENDING:
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        )
      case APPLICATION_STATUS.ACCEPTED:
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            Accepted
          </span>
        )
      case APPLICATION_STATUS.REJECTED:
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

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-40">
      {/* Auth Modal */}
      <TaskDoerAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Application Modal */}
      <ApplicationModal
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        task={selectedTask}
        onSuccess={handleApplicationSuccess}
      />

      <div className="max-w-350 mx-auto px-4">
        {/* Banner */}
        <div className="text-white px-4 py-6 md:px-8 md:py-8 rounded-2xl" style={{ background: 'linear-gradient(to right, #22E200, #02D04D)' }}>
          <h1 className="font-semibold text-center text-pretty text-xl md:text-2xl lg:text-[34px] lg:leading-tight">
            Find Tasks That Match Your Skills. Apply Now and Start Earning!
          </h1>
        </div>

        {/* Main Content - Full Width (30/70 split) */}
        <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-6 py-6">
          {/* Tasks/Applications List Section */}
          <div className={`bg-white rounded-lg p-4 md:p-6 ${selectedItemId ? 'hidden lg:block' : 'block'}`}>
            <h2 className="font-bold mb-6 text-xl md:text-2xl">
              {activeTab === 'my-applications' ? 'My Applications' : 'Available Tasks'}
            </h2>

          {/* Tabs */}
          <div className="space-y-3 mb-6">
            {/* Row 1: Offline/Online - matches track-task exactly */}
            <div className="flex bg-gray-100 rounded-lg">
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

            {/* Row 2: My Applications */}
            <button
              onClick={() => handleTabChange('my-applications')}
              className={`w-full py-4 font-semibold text-center transition-colors rounded-lg ${
                activeTab === 'my-applications'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              My Applications
              {myApplications.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                  {myApplications.length}
                </span>
              )}
            </button>
          </div>

          {/* List */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : activeTab === 'my-applications' ? (
              // My Applications List
              myApplications.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  You haven't applied to any tasks yet
                </div>
              ) : (
                myApplications.map((application) => {
                  const task = applicationTasks[application.taskId]
                  return (
                    <div
                      key={application.id}
                      onClick={() => handleItemClick(application.id)}
                      className={`flex items-center justify-between p-5 rounded-lg cursor-pointer transition-colors ${
                        selectedItemId === application.id
                          ? 'bg-black text-white'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="truncate block font-medium">
                          {task?.taskName || 'Loading...'}
                        </span>
                        <div className="mt-1 flex items-center gap-2">
                          {selectedItemId !== application.id && getApplicationStatusBadge(application.status)}
                          <span className={`text-xs ${selectedItemId === application.id ? 'text-gray-300' : 'text-gray-400'}`}>
                            Applied {formatDate(application.createdAt)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 flex-shrink-0 ${
                        selectedItemId === application.id ? 'text-white' : 'text-gray-400'
                      }`} />
                    </div>
                  )
                })
              )
            ) : (
              // Tasks List
              filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No {activeTab} tasks available
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const applied = hasApplied(task.id)
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleItemClick(task.id)}
                      className={`flex items-center justify-between p-5 rounded-lg cursor-pointer transition-colors ${
                        selectedItemId === task.id
                          ? 'bg-black text-white'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="truncate block">{task.taskName}</span>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`text-xs ${selectedItemId === task.id ? 'text-gray-300' : 'text-gray-500'}`}>
                            {task.amount}
                          </span>
                          {applied && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              selectedItemId === task.id
                                ? 'bg-white/20 text-white'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              Applied
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 flex-shrink-0 ${
                        selectedItemId === task.id ? 'text-white' : 'text-gray-400'
                      }`} />
                    </div>
                  )
                })
              )
            )}
          </div>
        </div>

          {/* Details Section */}
          <div className={`bg-white rounded-lg p-4 md:p-6 ${!selectedItemId ? 'hidden lg:block' : 'block'}`}>
            {/* Mobile Back Button */}
            <button
              onClick={() => setSelectedItemId(null)}
              className="lg:hidden flex items-center gap-2 mb-4 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
              Back to {activeTab === 'my-applications' ? 'applications' : 'tasks'}
            </button>

            <h2 className="font-bold mb-6 text-xl md:text-2xl">
              {activeTab === 'my-applications' ? 'Application Details' : 'Task Details'}
            </h2>

          {activeTab === 'my-applications' ? (
            // Application Details
            !selectedApplication ? (
              <div className="text-center py-8 text-gray-400">
                Select an application to view details
              </div>
            ) : (
              <div className="space-y-6">
                {/* Application Status */}
                <div className="flex items-center gap-3">
                  {getApplicationStatusBadge(selectedApplication.status)}
                  <span className="text-sm text-gray-500">
                    Applied on {formatDate(selectedApplication.createdAt)}
                  </span>
                </div>

                {/* Task Info */}
                {applicationTasks[selectedApplication.taskId] && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Applied for:</p>
                    <p className="font-semibold text-lg">
                      {applicationTasks[selectedApplication.taskId].taskName}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        {applicationTasks[selectedApplication.taskId].amount}
                      </span>
                      <span className="flex items-center gap-1">
                        {applicationTasks[selectedApplication.taskId].taskType === 'online' ? (
                          <Globe className="w-4 h-4 text-blue-500" />
                        ) : (
                          <MapPin className="w-4 h-4 text-orange-500" />
                        )}
                        {applicationTasks[selectedApplication.taskId].taskType}
                      </span>
                    </div>
                  </div>
                )}

                {/* Your Application */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Your Application</h3>
                  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="text-gray-900">{selectedApplication.applicantName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Role</p>
                      <p className="text-gray-900">{selectedApplication.applicantRole}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Why you should be selected</p>
                      <p className="text-gray-900">{selectedApplication.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-gray-500">Experience</p>
                        <p className="text-gray-900 capitalize">{selectedApplication.experience}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Can finish on time?</p>
                        <p className="text-gray-900 capitalize">{selectedApplication.canFinishOnTime}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Messages */}
                {selectedApplication.status === APPLICATION_STATUS.ACCEPTED && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-700">
                      <strong>Congratulations!</strong> Your application has been accepted. The task giver will contact you soon.
                    </p>
                  </div>
                )}
                {selectedApplication.status === APPLICATION_STATUS.REJECTED && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">
                      Unfortunately, your application was not selected for this task. Keep applying to other tasks!
                    </p>
                  </div>
                )}
              </div>
            )
          ) : (
            // Task Details
            !selectedTask ? (
              <div className="text-center py-8 text-gray-400">
                Select a task to view details
              </div>
            ) : (
              <div className="space-y-6">
                {/* Task Header */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      selectedTask.taskType === 'online'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {selectedTask.taskType === 'online' ? (
                        <Globe className="w-3 h-3" />
                      ) : (
                        <MapPin className="w-3 h-3" />
                      )}
                      {selectedTask.taskType}
                    </span>
                    <span className="text-xs text-gray-400">
                      Posted {formatDate(selectedTask.createdAt)}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedTask.taskName}</h3>
                </div>

                {/* Task Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      Budget
                    </div>
                    <p className="font-semibold">{selectedTask.amount}</p>
                    <p className="text-xs text-gray-400 capitalize">{selectedTask.budgetType}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                      <Clock className="w-4 h-4 text-blue-500" />
                      Duration
                    </div>
                    <p className="font-semibold">{selectedTask.duration}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                      <Briefcase className="w-4 h-4 text-purple-500" />
                      Experience
                    </div>
                    <p className="font-semibold capitalize">{selectedTask.experience}</p>
                  </div>
                  {selectedTask.taskType === 'offline' && selectedTask.location && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                        <MapPin className="w-4 h-4 text-orange-500" />
                        Location
                      </div>
                      <p className="font-semibold">{selectedTask.location}</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedTask.description}</p>
                  </div>
                </div>

                {/* Skills */}
                {selectedTask.skills && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Required Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTask.skills.split(',').map((skill, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                          {skill.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Apply Button */}
                <div className="pt-4 border-t border-gray-100">
                  {hasApplied(selectedTask.id) ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <CheckCircle className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                      <p className="text-blue-700 font-medium">You've already applied to this task</p>
                      <p className="text-blue-600 text-sm mt-1">
                        Check "My Applications" tab to see your application status
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleApplyClick}
                      className="w-full bg-green-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-600 transition-colors"
                    >
                      Apply Now
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
