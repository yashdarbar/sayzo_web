'use client'
import { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Career/Sidebar';
import JobCard from '@/components/Career/JobCard';
import Pagination from '@/components/Career/Pagination';
import { MOCK_JOBS } from '@/public/data/MockJob';
import { getPublishedJobs } from '@/lib/firebase';

const JOBS_PER_PAGE = 5;

const CareersClient = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [firebaseJobs, setFirebaseJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch published jobs from Firebase
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const jobs = await getPublishedJobs();
        setFirebaseJobs(jobs);
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  // Combine mock jobs with Firebase jobs
  const allJobs = useMemo(() => {
    return [...MOCK_JOBS, ...firebaseJobs];
  }, [firebaseJobs]);

  // Calculate category stats dynamically (array format for Sidebar)
  const categoryStats = useMemo(() => {
    const counts = {};
    allJobs.forEach((job) => {
      if (job.category) {
        counts[job.category] = (counts[job.category] || 0) + 1;
      }
    });
    return [
      { name: 'All', count: allJobs.length },
      { name: 'Engineering', count: counts['Engineering'] || 0 },
      { name: 'Product', count: counts['Product'] || 0 },
      { name: 'Design', count: counts['Design'] || 0 },
      { name: 'Operation', count: counts['Operation'] || 0 },
      { name: 'Marketing', count: counts['Marketing'] || 0 },
    ];
  }, [allJobs]);

  const filteredJobs = useMemo(() => {
    if (activeCategory === 'All') {
      return allJobs;
    }
    return allJobs.filter(job => job.category === activeCategory);
  }, [activeCategory, allJobs]);

  const totalPages = Math.ceil(filteredJobs.length / JOBS_PER_PAGE);

  const currentJobs = useMemo(() => {
    const start = (currentPage - 1) * JOBS_PER_PAGE;
    return filteredJobs.slice(start, start + JOBS_PER_PAGE);
  }, [filteredJobs, currentPage]);

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  return (
    <div className="mt-20 bg-[#f8fafc] py-16 px-4 md:px-8">
      <div className="max-w-300 mx-auto">
        <header className="mb-20 mt-30 text-center">
          <h1 className="text-[40px] md:text-6xl font-medium text-[#111827]">
            We have <span className="text-[#111827]">{loading ? '...' : allJobs.length}</span> open position{allJobs.length !== 1 ? 's' : ''} now!
          </h1>
        </header>

        <div className="flex flex-col lg:flex-row gap-12">
          <Sidebar
            categories={categoryStats}
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange}
          />
          <main className="flex-1">
            <div className="flex flex-col">
              {currentJobs.length > 0 ? (
                <>
                  {currentJobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                  {totalPages > 1 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 bg-transparent border-2 border-dashed border-[#e5e7eb] rounded-lg">
                  <p className="text-[#9ca3af] text-[15px]">
                    No positions found for this category.
                  </p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default CareersClient;
