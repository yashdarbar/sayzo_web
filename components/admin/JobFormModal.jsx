'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Plus } from 'lucide-react';
import { JOB_CATEGORIES } from '@/lib/constants';

const JobFormModal = ({ isOpen, onClose, onSubmit, initialData = null, isLoading = false }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    tags: [],
    description: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');

  const isEditing = !!initialData;

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        category: initialData.category || '',
        tags: initialData.tags || [],
        description: initialData.description || '',
      });
    } else {
      setFormData({
        title: '',
        category: '',
        tags: [],
        description: '',
      });
    }
    setError('');
    setTagInput('');
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      setError('Job title is required');
      return;
    }
    if (!formData.category) {
      setError('Category is required');
      return;
    }
    if (formData.tags.length === 0) {
      setError('At least one tag is required (e.g., Remote, Full-time)');
      return;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    }
  };

  if (!isOpen) return null;

  const suggestedTags = ['Remote', 'Hybrid', 'Full-time', 'Part-time', 'Tartu', 'Tallinn'];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
      <div className="w-full max-w-lg bg-black border border-zinc-800 rounded-2xl">
        <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800">
          <h2 className="text-xl text-white font-semibold">
            {isEditing ? 'Edit Job' : 'Create Job'}
          </h2>
          <button onClick={onClose} disabled={isLoading}>
            <X className="text-zinc-400 hover:text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto px-6 py-4 scrollbar-hide">
          {/* Title */}
          <div className="mb-4">
            <label className="block text-sm text-zinc-400 mb-1">Job Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Full-Stack Developer"
              className="w-full bg-[#18181B] text-white placeholder:text-zinc-500 px-4 py-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-zinc-600"
            />
          </div>

          {/* Category */}
          <div className="mb-4">
            <label className="block text-sm text-zinc-400 mb-1">Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full bg-[#18181B] text-white px-4 py-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-zinc-600"
            >
              <option value="">Select a category</option>
              {JOB_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="mb-4">
            <label className="block text-sm text-zinc-400 mb-1">Tags *</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., Remote, Full-time"
                className="flex-1 bg-[#18181B] text-white placeholder:text-zinc-500 px-4 py-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-zinc-600"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Suggested Tags */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {suggestedTags
                .filter((tag) => !formData.tags.includes(tag))
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }))}
                    className="text-xs px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition"
                  >
                    + {tag}
                  </button>
                ))}
            </div>

            {/* Selected Tags */}
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#13a884]/20 text-[#13a884] text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm text-zinc-400 mb-1">Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the role, responsibilities, and requirements..."
              rows={5}
              className="w-full bg-[#18181B] text-white placeholder:text-zinc-500 px-4 py-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-zinc-600 resize-none"
            />
          </div>

          {/* Error Message */}
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-full font-semibold transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-[#13a884] hover:bg-[#0f8c6e] text-white py-4 rounded-full font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isEditing ? 'Saving...' : 'Creating...'}
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Job'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobFormModal;
