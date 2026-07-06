import React, { useState, useEffect } from 'react';
import { 
  Plus, Pencil, Trash2, Database, AlertCircle, RefreshCw, CheckCircle, Package, Globe, Tag, Image as ImageIcon, DollarSign, Loader2, X, Search, Filter, Box, Link2, Info, CheckCircle2, ChevronRight, ChevronDown, CheckSquare, Check
} from 'lucide-react';
import { useClientId } from '../../lib/useClientId';
import { ProductCard } from '../../components/ProductCard';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface Product {
  _id?: string;
  title: string;
  description: string;
  price?: number;
  category: string;
  sku: string;
  stock: number;
  availability: 'in_stock' | 'out_of_stock' | 'preorder';
  tags: string[];
  type: 'product' | 'service';
  deliveryFormat?: 'physical' | 'digital' | 'service';
  businessType?: 'ecommerce' | 'service' | 'hybrid';
  externalReferenceId?: string;
  link?: string;
  aiInstructions?: string;
}

export default function ProductManager() {
  const { clientId } = useClientId();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom filter state
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  
  const [dbConfigEnabled, setDbConfigEnabled] = useState(false);
  const [dbTables, setDbTables] = useState<string[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [productTable, setProductTable] = useState('');
  const [serviceTable, setServiceTable] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState<Product>({
    title: '',
    description: '',
    price: undefined,
    category: '',
    sku: '',
    stock: 0,
    availability: 'in_stock',
    tags: [],
    type: 'product',
    deliveryFormat: 'physical',
    link: '',
    aiInstructions: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [newTag, setNewTag] = useState('');
  const [newInstruction, setNewInstruction] = useState('');
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  useEffect(() => {
    if (selectedProducts.length === 0) {
      setIsSelectionMode(false);
    }
  }, [selectedProducts]);

  const toggleProductSelection = (id: string) => {
    setSelectedProducts(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      return [...prev, id];
    });
  };

  const handleLongPress = (id: string) => {
    setIsSelectionMode(true);
    setSelectedProducts([id]);
  };

  const handleCardClick = (product: Product) => {
    if (isSelectionMode) {
      toggleProductSelection(product._id!);
    } else {
      openProductDetails(product);
    }
  };

  const fetchProducts = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await fetch('/v1/products', { headers: { 'x-client-id': clientId } });
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkSettings = async () => {
    if (!clientId) return;
    try {
      const res = await fetch('/v1/settings', { headers: { 'x-client-id': clientId } });
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        setDbConfigEnabled(data.data?.externalDbConfig?.enabled || false);
        setProductTable(data.data?.externalDbConfig?.productTable || '');
        setServiceTable(data.data?.externalDbConfig?.serviceTable || '');
        if (data.data?.externalDbConfig?.enabled) fetchTables(data.data);
      }
    } catch (err) {}
  };

  const fetchTables = async (s: any) => {
    try {
      const res = await fetch('/v1/dashboard/database/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': clientId! },
        body: JSON.stringify({
          dbType: s.externalDbConfig.dbType,
          host: s.externalDbConfig.host,
          port: s.externalDbConfig.port,
          username: s.externalDbConfig.username,
          password: s.externalDbConfig.password,
          databaseName: s.externalDbConfig.database
        })
      });
      const data = await res.json();
      if (data.success) setDbTables(data.data || []);
    } catch (err) {}
  };

  const handleUpdateTableSettings = async () => {
    setSavingSettings(true);
    try {
      const newSettings = {
        ...settings,
        externalDbConfig: { ...settings.externalDbConfig, productTable, serviceTable }
      };
      const res = await fetch('/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-client-id': clientId! },
        body: JSON.stringify(newSettings)
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        showSuccess('Table configuration saved.');
      }
    } catch (err) {} finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    checkSettings();
  }, [clientId]);

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      title: '', description: '', price: undefined, category: '', sku: '',
      stock: 0, availability: 'in_stock', tags: [], type: 'product',
      deliveryFormat: 'physical', link: '', aiInstructions: ''
    });
    setErrorMessage('');
    setSubmitting(false);
    setModalOpen(true);
  };

  const handleOpenEditModal = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProduct(product);
    setFormData({
      ...product,
      tags: product.tags || [],
      link: product.link || '',
      aiInstructions: product.aiInstructions || '',
      deliveryFormat: product.deliveryFormat || (product.type === 'service' ? 'service' : 'physical')
    });
    setErrorMessage('');
    setSubmitting(false);
    setModalOpen(true);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
  };

  const handleAddInstruction = () => {
    if (newInstruction.trim()) {
      const currentSteps = formData.aiInstructions ? formData.aiInstructions.split('\n').filter(line => line.trim() !== '') : [];
      const updatedSteps = [...currentSteps, newInstruction.trim()];
      setFormData(prev => ({ ...prev, aiInstructions: updatedSteps.join('\n') }));
      setNewInstruction('');
    }
  };

  const handleRemoveInstruction = (index: number) => {
    const currentSteps = formData.aiInstructions ? formData.aiInstructions.split('\n').filter(line => line.trim() !== '') : [];
    const updatedSteps = currentSteps.filter((_, idx) => idx !== index);
    setFormData(prev => ({ ...prev, aiInstructions: updatedSteps.join('\n') }));
  };

  const handleDeleteProduct = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/v1/products/${id}`, {
        method: 'DELETE',
        headers: { 'x-client-id': clientId || '' }
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('Item deleted successfully.');
        fetchProducts();
        if (selectedProduct?._id === id) setIsViewModalOpen(false);
      } else {
        console.error(data.error || 'Failed to delete');
      }
    } catch (err) {
      console.error('Network failure deleting item', err);
    }
  };

  const handleBulkDeleteProducts = async () => {
    if (selectedProducts.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedProducts.length} selected products?`)) return;
    try {
      const res = await fetch('/v1/products', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientId || ''
        },
        body: JSON.stringify({ ids: selectedProducts })
      });
      const data = await res.json();
      if (data.success) {
        setProducts(prev => prev.filter(p => !selectedProducts.includes(p._id!)));
        setSelectedProducts([]);
        showSuccess('Items deleted successfully.');
      } else {
        alert(data.error?.message || 'Failed to delete selected products.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { setErrorMessage('Title is required'); return; }
    if (!formData.description.trim()) { setErrorMessage('Description is required'); return; }
    setSubmitting(true);
    setErrorMessage('');
    try {
      const url = editingProduct ? `/v1/products/${editingProduct._id}` : '/v1/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-client-id': clientId || '' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(editingProduct ? 'Product updated successfully.' : 'Product created successfully.');
        setModalOpen(false);
        fetchProducts();
      } else {
        setErrorMessage(typeof data.error === 'object' ? (data.error.message || JSON.stringify(data.error)) : (data.error || 'An error occurred.'));
      }
    } catch (err) {
      setErrorMessage('Network connection failure.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncExternal = async () => {
    setSyncing(true);
    setErrorMessage('');
    try {
      const res = await fetch('/v1/products/sync-external', {
        method: 'POST',
        headers: { 'x-client-id': clientId || '' }
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(data.message || 'Synced successfully!');
        fetchProducts();
      } else {
        setErrorMessage(typeof data.error === 'object' ? (data.error.message || JSON.stringify(data.error)) : (data.error || 'Sync failed.'));
      }
    } catch (err) {
      setErrorMessage('Failed to trigger synchronization.');
    } finally {
      setSyncing(false);
    }
  };

  const openProductDetails = (product: Product) => {
    setSelectedProduct(product);
    setIsViewModalOpen(true);
  };

  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    const matchesFormat = formatFilter === 'all' || p.deliveryFormat === formatFilter;
    const matchesAvailability = availabilityFilter === 'all' || p.availability === availabilityFilter;
    return matchesSearch && matchesType && matchesFormat && matchesAvailability;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Services & Branded Products</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage catalog items, pricing, and external database sync.</p>
        </div>
        <div className="flex items-center gap-3">
          {dbConfigEnabled && (
            <button
              onClick={handleSyncExternal}
              disabled={syncing}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-black rounded-xl hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-indigo-600" />}
              Sync Catalog
            </button>
          )}
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/10 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <p className="text-xs font-bold">{successMessage}</p>
        </div>
      )}

      {/* Main layout */}
      <div className="space-y-6">
        
        {/* Search & Filters Row */}
        <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <button
                onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                className="sm:hidden p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
            
            <div className={cn("flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-center", !showFiltersMobile && "hidden sm:flex")}>
              {/* Type Filter */}
              <select 
                value={typeFilter} 
                onChange={e => setTypeFilter(e.target.value)}
                className="px-3 py-2.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="product">Branded Products</option>
                <option value="service">Services</option>
              </select>

              {/* Format Filter */}
              <select 
                value={formatFilter} 
                onChange={e => setFormatFilter(e.target.value)}
                className="px-3 py-2.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">All Formats</option>
                <option value="physical">Physical</option>
                <option value="digital">Digital</option>
                <option value="service">Service</option>
              </select>

              {/* Availability Filter */}
              <select 
                value={availabilityFilter} 
                onChange={e => setAvailabilityFilter(e.target.value)}
                className="px-3 py-2.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">All Availability</option>
                <option value="in_stock">In Stock</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="preorder">Pre-order</option>
              </select>

              {(typeFilter !== 'all' || formatFilter !== 'all' || availabilityFilter !== 'all') && (
                <button
                  onClick={() => {
                    setTypeFilter('all');
                    setFormatFilter('all');
                    setAvailabilityFilter('all');
                  }}
                  className="px-3 py-2.5 sm:py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* External Database Configuration panel when enabled */}
          {dbConfigEnabled && (
            <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-4 space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-500" /> Catalog Database Sync Tables
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Products Table</span>
                  <select
                    value={productTable}
                    onChange={(e) => setProductTable(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value="">- Select Table -</option>
                    {dbTables.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Services Table</span>
                  <select
                    value={serviceTable}
                    onChange={(e) => setServiceTable(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value="">- Select Table -</option>
                    {dbTables.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={handleUpdateTableSettings}
                    disabled={savingSettings}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                  >
                    {savingSettings ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Product Grid */}
        <div className="w-full space-y-4">
          <AnimatePresence mode="wait">
            {isSelectionMode ? (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-center justify-between bg-indigo-600 p-4 rounded-2xl shadow-lg text-white mb-4"
              >
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSelectedProducts([])}
                    className="p-2 hover:bg-indigo-500 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <span className="font-black text-sm uppercase tracking-wider">
                    {selectedProducts.length} Selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const allIds = filteredProducts.map(p => p._id!);
                      setSelectedProducts(allIds);
                    }}
                    className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    <CheckSquare className="w-4 h-4" />
                    Select All
                  </button>
                  <button
                    onClick={handleBulkDeleteProducts}
                    className="flex items-center gap-2 bg-rose-500 hover:bg-rose-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20 text-slate-400">
               <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-600" />
               <p className="text-sm font-medium">Loading catalog...</p>
             </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white border border-slate-200 border-dashed rounded-[2rem] p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Box className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-sm font-black text-slate-900 mb-1">No Items Found</h3>
              <p className="text-xs text-slate-500 mb-6 max-w-sm">Add new products or check your database synchronization.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product._id}
                  product={product}
                  isSelected={selectedProducts.includes(product._id!)}
                  isSelectionMode={isSelectionMode}
                  onLongPress={handleLongPress}
                  onClick={handleCardClick}
                  handleDeleteProduct={handleDeleteProduct}
                  handleOpenEditModal={handleOpenEditModal}
                  setProductToDelete={setProductToDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* View Product Details Modal */}
      <AnimatePresence>
        {isViewModalOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full max-w-2xl sm:rounded-[2rem] rounded-t-[2rem] shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                    <Package className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900">{selectedProduct.title}</h2>
                    <p className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase line-clamp-1">{selectedProduct.type} &middot; {selectedProduct.sku}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsViewModalOpen(false)} className="p-2 sm:p-2.5 md:p-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl sm:rounded-2xl text-slate-500 transition-colors shrink-0">
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Info */}
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-indigo-500" /> Description
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedProduct.description}</p>
                    </div>

                    {selectedProduct.aiInstructions && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-indigo-500" /> AI Instructions
                        </h4>
                        <div className="space-y-2 mt-2">
                          {selectedProduct.aiInstructions.split('\n').filter(line => line.trim() !== '').map((step, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 text-xs">
                              <span className="shrink-0 inline-flex items-center justify-center w-4 h-4 bg-indigo-100 text-indigo-700 rounded-full text-[9px] font-black">
                                {idx + 1}
                              </span>
                              <p className="flex-1 text-slate-600 leading-relaxed pt-0.5">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="space-y-6">
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-4">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-500 uppercase">Price</span>
                        <span className="text-lg font-black text-slate-900">${selectedProduct.price || 0}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-500 uppercase">Availability</span>
                        <span className={cn(
                          "text-xs font-black uppercase px-2 py-0.5 rounded-md",
                          selectedProduct.availability === 'in_stock' ? "bg-emerald-50 text-emerald-700" :
                          selectedProduct.availability === 'out_of_stock' ? "bg-rose-50 text-rose-700" :
                          "bg-amber-50 text-amber-700"
                        )}>{(selectedProduct.availability || 'in_stock').replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-500 uppercase">Category</span>
                        <span className="text-sm font-medium text-slate-800">{selectedProduct.category || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase">Stock Count</span>
                        <span className="text-sm font-medium text-slate-800">{selectedProduct.stock}</span>
                      </div>
                    </div>

                    {selectedProduct.link && (
                      <a href={selectedProduct.link} target="_blank" rel="noreferrer" className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                        <Link2 className="w-4 h-4" /> External Link
                      </a>
                    )}

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleOpenEditModal(selectedProduct)}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
                      >
                        <Pencil className="w-4 h-4" /> Edit
                      </button>
                      <button 
                        onClick={() => setProductToDelete(selectedProduct)}
                        className="px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create / Edit Form Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
             <motion.div
              initial={{ opacity: 0, y: 100, scale: 1 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 1 }}
              className="bg-white w-full max-w-3xl rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-4 sm:p-6 md:p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 shrink-0">
                <h2 className="text-lg md:text-xl font-black text-slate-900">
                  {editingProduct ? 'Edit Item' : 'Add New Item'}
                </h2>
                <button 
                  onClick={() => setModalOpen(false)}
                  className="p-2 sm:p-2.5 md:p-3 bg-slate-50 hover:bg-slate-100 rounded-xl sm:rounded-2xl text-slate-500 transition-colors"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto">
                {errorMessage && (
                  <div className="mb-6 bg-rose-50 text-rose-600 p-4 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">{errorMessage}</p>
                  </div>
                )}
                
                <form id="productForm" onSubmit={handleFormSubmit} className="space-y-6">
                  {/* Basic Info */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2"><Package className="w-4 h-4" /> Basic Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Title *</label>
                        <input 
                          type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">SKU / Identifier</label>
                        <input 
                          type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Description *</label>
                      <textarea 
                        required rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Price</label>
                        <input 
                          type="number" step="0.01" value={formData.price || ''} onChange={e => setFormData({...formData, price: e.target.value ? Number(e.target.value) : undefined})}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                        <input 
                          type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Stock</label>
                        <input 
                          type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Availability</label>
                        <select 
                          value={formData.availability} onChange={e => setFormData({...formData, availability: e.target.value as any})}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                        >
                          <option value="in_stock">In Stock</option>
                          <option value="out_of_stock">Out of Stock</option>
                          <option value="preorder">Pre-order</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Classification */}
                  <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-200">
                    <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2"><Tag className="w-4 h-4" /> Classification</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                       <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                        <select 
                          value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                        >
                          <option value="product">Product</option>
                          <option value="service">Service</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Format</label>
                        <select 
                          value={formData.deliveryFormat} onChange={e => setFormData({...formData, deliveryFormat: e.target.value as any})}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                        >
                          <option value="physical">Physical</option>
                          <option value="digital">Digital</option>
                          <option value="service">Service</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tags</label>
                      <div className="flex gap-2 mb-2">
                        <input 
                          type="text" value={newTag} onChange={e => setNewTag(e.target.value)}
                          placeholder="Add a tag..."
                          onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                          className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                        />
                        <button type="button" onClick={handleAddTag} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-sm font-bold text-slate-700">Add</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">
                            {tag}
                            <button type="button" onClick={() => handleRemoveTag(tag)} className="text-indigo-400 hover:text-indigo-600"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-2">
                        AI Instructions / Steps <span className="text-[9px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded uppercase tracking-wider">Step-by-Step</span>
                      </label>
                      <p className="text-[10px] text-slate-500 mb-2">Give the AI step-by-step guidelines on how to describe or handle this item.</p>
                      
                      <div className="flex gap-2 mb-3">
                        <input 
                          type="text" 
                          value={newInstruction} 
                          onChange={e => setNewInstruction(e.target.value)}
                          placeholder="Add instruction step... (e.g., Mention the warranty policy)"
                          onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddInstruction(); } }}
                          className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                        />
                        <button 
                          type="button" 
                          onClick={handleAddInstruction} 
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
                        >
                          Add Step
                        </button>
                      </div>

                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {(() => {
                          const steps = formData.aiInstructions ? formData.aiInstructions.split('\n').filter(line => line.trim() !== '') : [];
                          if (steps.length === 0) {
                            return (
                              <div className="text-center py-4 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-xs text-slate-400">
                                No AI steps added yet. The AI will use standard brand guidelines.
                              </div>
                            );
                          }
                          return steps.map((step, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-sm">
                              <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black">
                                {idx + 1}
                              </span>
                              <p className="flex-1 text-xs text-slate-700 font-medium pt-0.5 leading-relaxed">{step}</p>
                              <button 
                                type="button" 
                                onClick={() => handleRemoveInstruction(idx)} 
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 shrink-0 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 sticky bottom-0 z-10">
                <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" form="productForm" disabled={submitting} className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-600/10 disabled:opacity-70 transition-all flex items-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingProduct ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <AlertCircle className="w-6 h-6" />
                <h3 className="text-sm font-black uppercase tracking-wider">Confirm Deletion</h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Are you sure you want to permanently delete <strong>{productToDelete.title}</strong>? This action is irreversible.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDeleteProduct(productToDelete._id!);
                    setProductToDelete(null);
                  }}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
