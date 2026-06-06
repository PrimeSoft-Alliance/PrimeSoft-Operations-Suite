import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, Trash2, Edit2, AlertCircle, Loader2, CheckCircle2, X, BookOpen, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TrainingItem {
  _id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  status: 'active' | 'archived';
  createdAt: string;
}

interface ModalState {
  show: boolean;
  editId?: string;
  category: string;
  title: string;
  content: string;
  tags: string;
}

export default function AITrainingManager() {
  const [trainingData, setTrainingData] = useState<TrainingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [modal, setModal] = useState<ModalState>({
    show: false,
    category: 'business',
    title: '',
    content: '',
    tags: ''
  });

  const categories = ['business', 'services', 'process', 'faq', 'pricing', 'team'];

  useEffect(() => {
    fetchTrainingData();
  }, []);

  const fetchTrainingData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/v1/public/ai/training/knowledge');
      if (res.ok) {
        const data = await res.json();
        setTrainingData(data?.data || data || []);
        setError('');
      } else {
        setError('Failed to load training data');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Error loading training data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item?: TrainingItem) => {
    if (item) {
      setModal({
        show: true,
        editId: item._id,
        category: item.category,
        title: item.title,
        content: item.content,
        tags: item.tags.join(', ')
      });
    } else {
      setModal({
        show: true,
        category: 'business',
        title: '',
        content: '',
        tags: ''
      });
    }
  };

  const handleCloseModal = () => {
    setModal(prev => ({ ...prev, show: false }));
  };

  const handleSave = async () => {
    if (!modal.title.trim() || !modal.content.trim()) {
      setError('Title and content are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        category: modal.category,
        title: modal.title,
        content: modal.content,
        tags: modal.tags.split(',').map(t => t.trim()).filter(t => t)
      };

      const method = modal.editId ? 'PUT' : 'POST';
      const url = modal.editId 
        ? `/v1/public/ai/training/knowledge/${modal.editId}`
        : '/v1/public/ai/training/knowledge';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchTrainingData();
        handleCloseModal();
        setError('');
      } else {
        const data = await res.json();
        setError(data?.error?.message || 'Save failed');
      }
    } catch (err: any) {
      setError('Error saving: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Archive this training item? It will no longer be used by the AI.')) return;

    try {
      const res = await fetch(`/v1/public/ai/training/knowledge/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchTrainingData();
        setError('');
      } else {
        setError('Delete failed');
      }
    } catch (err) {
      setError('Error deleting');
    }
  };

  const filteredData = filterCategory 
    ? trainingData.filter(item => item.category === filterCategory && item.status === 'active')
    : trainingData.filter(item => item.status === 'active');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 sm:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-indigo-600" />
            <h1 className="text-4xl font-black text-gray-900">AI Training Hub</h1>
          </div>
          <p className="text-gray-500 text-lg leading-relaxed">
            Train your PrimeSoft Alliance AI assistant with company knowledge. This knowledge base powers the landing page AI to answer visitor questions accurately.
          </p>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4"
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">{error}</div>
            <button onClick={() => setError('')} className="ml-auto">
              <X className="w-4 h-4 text-red-400" />
            </button>
          </motion.div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex gap-2">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Knowledge
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        )}

        {/* Training Items Grid */}
        {!loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {filteredData.length === 0 ? (
              <div className="col-span-full text-center py-16 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No training data yet</p>
                <p className="text-sm">Add your first training item to start training the AI</p>
              </div>
            ) : (
              filteredData.map(item => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all"
                >
                  <div className="mb-4">
                    <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold mb-3">
                      {item.category}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-3">{item.content}</p>
                  </div>

                  {item.tags.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {item.tags.map(tag => (
                        <span key={tag} className="text-xs bg-slate-100 text-gray-700 px-2 py-1 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(item)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Archive
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal.show && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={handleCloseModal}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {modal.editId ? 'Edit Training' : 'Add New Training'}
                  </h2>
                  <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                    <select
                      value={modal.category}
                      onChange={e => setModal(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                    <input
                      type="text"
                      placeholder="e.g., Enterprise Solutions Overview"
                      value={modal.title}
                      onChange={e => setModal(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Content</label>
                    <textarea
                      placeholder="Enter the knowledge/training content that the AI should know about..."
                      value={modal.content}
                      onChange={e => setModal(prev => ({ ...prev, content: e.target.value }))}
                      rows={6}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tags (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g., enterprise, solutions, deployment"
                      value={modal.tags}
                      onChange={e => setModal(prev => ({ ...prev, tags: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleCloseModal}
                      className="flex-1 px-4 py-3 border border-slate-200 text-gray-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Training
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
