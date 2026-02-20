'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, ChevronDown, X, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/app/Context/AuthContext';
import { subscribeToJobs, addJob, updateJob, deleteJob, toggleJobPublished, getJobApplicationCount } from '@/lib/firebase';
import { JOB_CATEGORIES } from '@/lib/constants';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminJobCard from '@/components/admin/AdminJobCard';
import JobFormModal from '@/components/admin/JobFormModal';
import JobApplicationsModal from '@/components/admin/JobApplicationsModal';

export default function JobsManagementPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading: authLoading } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [togglingPublishId, setTogglingPublishId] = useState(null);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Applications modal states
  const [showApplicationsModal, setShowApplicationsModal] = useState(false);
  const [selectedJobForApplications, setSelectedJobForApplications] = useState(null);
  const [applicationCounts, setApplicationCounts] = useState({});

  // Subscribe to jobs
  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) {
      router.push('/website-aaadminpanel');
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToJobs(
      (jobsData) => {
        setJobs(jobsData);
        setLoading(false);
      },
      (err) => {
        console.error('Jobs subscription error:', err);
        setError('Failed to load jobs. Please refresh the page.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, isAdmin, authLoading, router]);

  // Fetch application counts when jobs change
  useEffect(() => {
    const fetchCounts = async () => {
      const counts = {};
      for (const job of jobs) {
        try {
          counts[job.id] = await getJobApplicationCount(job.id);
        } catch (error) {
          counts[job.id] = 0;
        }
      }
      setApplicationCounts(counts);
    };

    if (jobs.length > 0) {
      fetchCounts();
    }
  }, [jobs]);

  // Handle view applications
  const handleViewApplications = (job) => {
    setSelectedJobForApplications(job);
    setShowApplicationsModal(true);
  };

  // Filter jobs by category and status
  const filteredJobs = jobs.filter((job) => {
    const categoryMatch = categoryFilter === 'All' || job.category === categoryFilter;
    const statusMatch = statusFilter === 'All' ||
      (statusFilter === 'Published' && job.published) ||
      (statusFilter === 'Drafts' && !job.published);
    return categoryMatch && statusMatch;
  });

  // Handle toggle publish
  const handleTogglePublish = async (jobId, currentStatus) => {
    setTogglingPublishId(jobId);
    try {
      await toggleJobPublished(jobId, currentStatus);
      toast.success(currentStatus ? 'Job unpublished' : 'Job published');
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setTogglingPublishId(null);
    }
  };

  // Handle create job
  const handleCreateJob = async (formData) => {
    setFormLoading(true);
    try {
      await addJob(formData);
      toast.success('Job created successfully!');
      setShowFormModal(false);
    } catch (err) {
      toast.error(err.message || 'Failed to create job');
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  // Handle edit job
  const handleEditJob = async (formData) => {
    if (!editingJob) return;
    setFormLoading(true);
    try {
      await updateJob(editingJob.id, formData);
      toast.success('Job updated successfully!');
      setShowFormModal(false);
      setEditingJob(null);
    } catch (err) {
      toast.error(err.message || 'Failed to update job');
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  // Handle delete job
  const handleDeleteJob = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return;
    }
    setDeletingId(jobId);
    try {
      await deleteJob(jobId);
      toast.success('Job deleted successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to delete job');
    } finally {
      setDeletingId(null);
    }
  };

  // Open edit modal
  const openEditModal = (job) => {
    setEditingJob(job);
    setShowFormModal(true);
  };

  // Open create modal
  const openCreateModal = () => {
    setEditingJob(null);
    setShowFormModal(true);
  };

  const filterOptions = [
    { id: 'All', label: 'All Jobs' },
    ...JOB_CATEGORIES.map((cat) => ({ id: cat, label: cat })),
  ];

  const statusOptions = [
    { id: 'All', label: 'All Status' },
    { id: 'Published', label: 'Published' },
    { id: 'Drafts', label: 'Drafts' },
  ];

  const currentFilterLabel = filterOptions.find((f) => f.id === categoryFilter)?.label || 'Filter';
  const currentStatusLabel = statusOptions.find((s) => s.id === statusFilter)?.label || 'Status';

  return (
    <AdminLayout>
      <div className="min-h-screen bg-white pt-32 lg:pt-0">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Jobs Management</h1>
              <p className="text-sm text-gray-500 mt-1">
                {jobs.length} job{jobs.length !== 1 ? 's' : ''} posted
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Status Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  {currentStatusLabel}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showStatusDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowStatusDropdown(false)}
                    />
                    <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                      {statusOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setStatusFilter(option.id);
                            setShowStatusDropdown(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition ${
                            statusFilter === option.id
                              ? 'text-[#13a884] font-medium'
                              : 'text-gray-700'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Category Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  {currentFilterLabel}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
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
                            setCategoryFilter(option.id);
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition ${
                            categoryFilter === option.id
                              ? 'text-[#13a884] font-medium'
                              : 'text-gray-700'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Add Job Button */}
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-[#13a884] hover:bg-[#0f8c6e] text-white rounded-lg text-sm font-medium transition"
              >
                <Plus className="w-4 h-4" />
                Add Job
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Error Banner */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
                <p className="text-red-700 text-sm">{error}</p>
                <button
                  onClick={() => setError('')}
                  className="text-red-500 hover:text-red-700"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-[#13a884] mx-auto mb-4" />
                  <p className="text-gray-500">Loading jobs...</p>
                </div>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-20">
                <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  {categoryFilter === 'All'
                    ? 'No jobs posted yet'
                    : `No jobs in ${categoryFilter} category`}
                </p>
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#13a884] hover:bg-[#0f8c6e] text-white rounded-lg text-sm font-medium transition"
                >
                  <Plus className="w-4 h-4" />
                  Create your first job
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredJobs.map((job) => (
                  <AdminJobCard
                    key={job.id}
                    job={job}
                    onEdit={openEditModal}
                    onDelete={handleDeleteJob}
                    onTogglePublish={handleTogglePublish}
                    onViewApplications={handleViewApplications}
                    applicationCount={applicationCounts[job.id] || 0}
                    isDeleting={deletingId === job.id}
                    isTogglingPublish={togglingPublishId === job.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Job Form Modal */}
        <JobFormModal
          isOpen={showFormModal}
          onClose={() => {
            setShowFormModal(false);
            setEditingJob(null);
          }}
          onSubmit={editingJob ? handleEditJob : handleCreateJob}
          initialData={editingJob}
          isLoading={formLoading}
        />

        {/* Job Applications Modal */}
        <JobApplicationsModal
          isOpen={showApplicationsModal}
          onClose={() => {
            setShowApplicationsModal(false);
            setSelectedJobForApplications(null);
          }}
          job={selectedJobForApplications}
        />
      </div>
    </AdminLayout>
  );
}
