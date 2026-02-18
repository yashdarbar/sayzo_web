"use client";

import { useEffect, useMemo, useState } from "react";
import { getTasks, auth, getApplicationsByApplicant } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { jobs as dummyJobs } from "@/public/data/job";

import JobCard from "@/components/Job/JobCard";
import JobDetailPanel from "@/components/Job/JobDetailPanel";
import JobBottomSheet from "@/components/Job/JobBottomSheet";
import SearchWithPagination from "@/components/SearchWithPagination";
import CustomIcons from "@/components/CustomIcons";
import MegaMenu from "./MegaMenu";
import { Loader2 } from "lucide-react";

// Map Firestore task to job card format
const mapTaskToJob = (task) => ({
  id: task.id,
  giverId: task.giverId, // Preserve for ownership check
  type: task.taskType || "online",
  title: task.taskName || "Untitled Task",
  deadline: task.duration || "Flexible",
  price: task.amount || "0",
  work_mode: task.location === "Online" ? "Online" : "Offline",
  skills: task.skills ? task.skills.split(",").map((s) => s.trim()) : [],
  tags: task.skills ? task.skills.split(",").map((s) => s.trim()) : [],
  description: task.description || "",
  company: {
    name: task.customerName || "Anonymous",
    about: "Verified task giver on the platform",
  },
  budget: {
    amount: `₹${task.amount || "0"}`,
    type: task.budgetType === "fixed" ? "Fixed" : "Open to Negotiate",
  },
  duration: task.duration || "Flexible",
});

const UserPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [myApplications, setMyApplications] = useState([]);

  /* ================= FETCH TASKS FROM FIREBASE ================= */
  useEffect(() => {
    // Listen for auth state to fetch tasks only when authenticated
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // User is authenticated, fetch from Firebase and combine with dummy data
        try {
          const [tasks, applications] = await Promise.all([
            getTasks(),
            getApplicationsByApplicant(user.uid)
          ]);
          const mappedJobs = tasks.map(mapTaskToJob);
          // Show real tasks at top + dummy data below
          setJobs([...mappedJobs, ...dummyJobs]);
          setMyApplications(applications);
        } catch (error) {
          console.error("Error fetching tasks:", error);
          setJobs(dummyJobs);
          setMyApplications([]);
        }
      } else {
        // Not authenticated, use dummy data (no error)
        setCurrentUser(null);
        setJobs(dummyJobs);
        setMyApplications([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /* ================= SCREEN SIZE ================= */
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ================= RESET PAGE ON SEARCH ================= */
  useEffect(() => {
    setCurrentPage(1);
    setSelectedJob(null);
  }, [searchQuery]);

  /* ================= PAGINATION ================= */
  const ITEMS_PER_PAGE = useMemo(() => (isMobile ? 10 : 15), [isMobile]);

  /* ================= SEARCH + FILTER ================= */
  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return jobs;

    const query = searchQuery.toLowerCase();

    return jobs.filter((job) => {
      const titleMatch = job.title?.toLowerCase().includes(query);
      const categoryMatch = job.category?.toLowerCase().includes(query);
      const skillsMatch = job.skills?.some((tag) =>
        tag.toLowerCase().includes(query)
      );

      return titleMatch || categoryMatch || skillsMatch;
    });
  }, [searchQuery, jobs]);

  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [currentPage, totalPages]);

  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  /* ================= APPLICATION HELPERS ================= */
  const hasApplied = (taskId) => {
    return myApplications.some((app) => app.taskId === taskId);
  };

  const isOwnTask = (task) => {
    // Return false if user is not authenticated or task has no giverId
    if (!currentUser?.uid || !task?.giverId) return false;
    return task.giverId === currentUser.uid;
  };

  const handleApplicationSuccess = () => {
    if (currentUser) {
      getApplicationsByApplicant(currentUser.uid)
        .then(setMyApplications)
        .catch(console.error);
    }
  };

  /* ================= LOADING STATE ================= */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary-btn mx-auto mb-4" />
          <p className="text-gray-500">Loading tasks...</p>
        </div>
      </div>
    );
  }

  /* ================================================= */
  return (
    <div className="">
      {/* ================= SEARCH ================= */}
      <SearchWithPagination onSearch={setSearchQuery} />

      <MegaMenu />

      {/* ================= DESKTOP ================= */}
      {!isMobile && (
        <>
          {!selectedJob && (
            <section className="max-w-350 mx-auto px-4 py-12 grid grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className="cursor-pointer border-2 border-gray-200 rounded-xl p-4 hover:border-primary-btn transition"
                >
                  <JobCard job={job} />
                </div>
              ))}
            </section>
          )}

          {selectedJob && (
            <section className="max-w-350 mx-auto relative z-10 px-4 py-12 grid grid-cols-[1.2fr_1fr] gap-6">
              <div className="space-y-4 overflow-y-auto max-h-[80vh] pr-2">
                {paginatedJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition
                      ${
                        selectedJob.id === job.id
                          ? "border-primary-btn bg-primary-btn/5"
                          : "border-gray-200 hover:border-primary-btn"
                      }`}
                  >
                    <JobCard job={job} />
                  </div>
                ))}
              </div>

              <JobDetailPanel
                job={selectedJob}
                onClose={() => setSelectedJob(null)}
                currentUser={currentUser}
                hasApplied={hasApplied(selectedJob?.id)}
                isOwnTask={isOwnTask(selectedJob)}
                onApplicationSuccess={handleApplicationSuccess}
              />
            </section>
          )}

          {filteredJobs.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              No tasks match your search
            </div>
          )}

          <CustomIcons
            page={currentPage}
            count={totalPages}
            onChange={setCurrentPage}
          />
        </>
      )}

      {/* ================= MOBILE ================= */}
      {isMobile && (
        <section className="px-4 py-6 space-y-4">
          {paginatedJobs.map((job) => (
            <div
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className="border-2 border-gray-200 rounded-xl p-4"
            >
              <JobCard job={job} />
            </div>
          ))}

          {filteredJobs.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              No tasks match your search
            </div>
          )}

          <CustomIcons
            page={currentPage}
            count={totalPages}
            onChange={setCurrentPage}
          />

          {selectedJob && (
            <JobBottomSheet
              job={selectedJob}
              onClose={() => setSelectedJob(null)}
              currentUser={currentUser}
              hasApplied={hasApplied(selectedJob?.id)}
              isOwnTask={isOwnTask(selectedJob)}
              onApplicationSuccess={handleApplicationSuccess}
            />
          )}
        </section>
      )}
    </div>
  );
};

export default UserPage;
