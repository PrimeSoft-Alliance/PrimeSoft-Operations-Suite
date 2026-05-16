import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Link, Save, Check } from 'lucide-react';
import { useClientId } from '../../lib/useClientId';

export default function FormsManager() {
  const { clientId } = useClientId();
  const [forms, setForms] = useState<any[]>([]);
  const [editingForm, setEditingForm] = useState<any | null>(null);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const res = await fetch('/v1/forms', {
        headers: { 'x-client-id': clientId }
      });
      const data = await res.json();
      if (data && data.success) setForms(data.data || []);
    } catch (err) {}
  };

  const generateDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt) return;
    setIsLoading(true);
    try {
      const res = await fetch('/v1/forms/generate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
        body: JSON.stringify({ description: aiPrompt })
      });
      const data = await res.json();
      if (data.result) {
        setEditingForm({ ...editingForm, theme: data.result });
      }
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  const saveForm = async () => {
    if (!editingForm.name) return;
    try {
      if (editingForm._id) {
        await fetch(`/v1/forms/${editingForm._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
          body: JSON.stringify(editingForm)
        });
      } else {
        await fetch('/v1/forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
          body: JSON.stringify(editingForm)
        });
      }
      setEditingForm(null);
      fetchForms();
    } catch (err) {
      console.error(err);
    }
  };

  const addField = () => {
    setEditingForm({
      ...editingForm,
      fields: [...(editingForm.fields || []), { name: '', label: '', type: 'text', required: false, options: [] }]
    });
  };

  const updateField = (index: number, updates: any) => {
    const newFields = [...(editingForm.fields || [])];
    newFields[index] = { ...newFields[index], ...updates };
    setEditingForm({ ...editingForm, fields: newFields });
  };

  const removeField = (index: number) => {
    const newFields = [...(editingForm.fields || [])];
    newFields.splice(index, 1);
    setEditingForm({ ...editingForm, fields: newFields });
  };

  const deleteForm = async (id: string) => {
    if (!window.confirm('Delete this form?')) return;
    try {
      await fetch(`/v1/forms/${id}`, {
        method: 'DELETE',
        headers: { 'x-client-id': clientId }
      });
      fetchForms();
    } catch (err) {}
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Custom Forms</h1>
        {!editingForm && (
          <button
            onClick={() => setEditingForm({ name: '', description: '', fields: [], theme: {} })}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Form
          </button>
        )}
      </div>

      {editingForm ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-8">
          <div className="flex justify-between items-center border-b pb-4">
            <h2 className="text-xl font-semibold">Form Builder</h2>
            <div className="flex gap-4">
              <button onClick={() => setEditingForm(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={saveForm} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save Form</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Info</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Form Name</label>
                <input
                  type="text"
                  value={editingForm.name || ''}
                  onChange={e => setEditingForm({...editingForm, name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g. Sales Inquiry"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editingForm.description || ''}
                  onChange={e => setEditingForm({...editingForm, description: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires At (Optional)</label>
                <input
                  type="date"
                  value={editingForm.expiresAt ? new Date(editingForm.expiresAt).toISOString().split('T')[0] : ''}
                  onChange={e => setEditingForm({...editingForm, expiresAt: e.target.value || null})}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">AI Form Designer</h3>
              <form onSubmit={generateDesign} className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="e.g. A job application form with a modern theme"
                  className="w-full px-4 py-2 border rounded-lg text-sm"
                />
                <button disabled={isLoading} type="submit" className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg whitespace-nowrap">
                  {isLoading ? 'Generating...' : 'Auto Build'}
                </button>
              </form>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Primary Color</label>
                  <div className="flex gap-2">
                     <input type="color" value={editingForm.theme?.primaryColor || '#6366f1'} onChange={e => setEditingForm({...editingForm, theme: {...editingForm.theme, primaryColor: e.target.value}})} />
                     <input type="text" value={editingForm.theme?.primaryColor || '#6366f1'} onChange={e => setEditingForm({...editingForm, theme: {...editingForm.theme, primaryColor: e.target.value}})} className="border text-xs px-2 w-full"/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Bg Color</label>
                  <div className="flex gap-2">
                     <input type="color" value={editingForm.theme?.backgroundColor || '#ffffff'} onChange={e => setEditingForm({...editingForm, theme: {...editingForm.theme, backgroundColor: e.target.value}})} />
                     <input type="text" value={editingForm.theme?.backgroundColor || '#ffffff'} onChange={e => setEditingForm({...editingForm, theme: {...editingForm.theme, backgroundColor: e.target.value}})} className="border text-xs px-2 w-full"/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Button Style</label>
                  <select value={editingForm.theme?.buttonStyle || 'rounded'} onChange={e => setEditingForm({...editingForm, theme: {...editingForm.theme, buttonStyle: e.target.value}})} className="w-full px-2 py-1 text-sm border rounded">
                    <option value="square">Square</option>
                    <option value="rounded">Rounded</option>
                    <option value="pill">Pill</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Fields & Content</h3>
              <button type="button" onClick={addField} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-sm font-medium rounded-lg hover:bg-indigo-100 flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add Space/Field
              </button>
            </div>
            
            <div className="space-y-3">
              {(editingForm.fields || []).map((field: any, idx: number) => (
                <div key={idx} className="flex flex-col gap-2 p-4 bg-gray-50 border rounded-lg">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Label / Title</label>
                      <input type="text" value={field.label} onChange={e => updateField(idx, { label: e.target.value, name: e.target.value.toLowerCase().replace(/\W+/g, '_') })} className="w-full px-3 py-1 border rounded text-sm"/>
                    </div>
                    { !field.type.startsWith('content-') && field.type !== 'page-break' && (
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Internal Name</label>
                        <input type="text" value={field.name} onChange={e => updateField(idx, { name: e.target.value })} className="w-full px-3 py-1 border rounded bg-gray-100 text-sm" readOnly/>
                      </div>
                    )}
                    <div className="w-40">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                      <select value={field.type} onChange={e => updateField(idx, { type: e.target.value })} className="w-full px-3 py-1.5 border rounded text-sm font-medium text-indigo-700">
                        <optgroup label="Inputs">
                          <option value="text">Text</option>
                          <option value="email">Email</option>
                          <option value="phone">Phone</option>
                          <option value="number">Number</option>
                          <option value="textarea">Textarea</option>
                          <option value="select">Dropdown</option>
                        </optgroup>
                        <optgroup label="Content (Read-only)">
                          <option value="content-text">Text Block</option>
                          <option value="content-image">Image Embed</option>
                          <option value="content-video">Video/Audio Embed</option>
                        </optgroup>
                        <optgroup label="Structure">
                          <option value="page-break">Page Break / Next</option>
                        </optgroup>
                      </select>
                    </div>
                    { !field.type.startsWith('content-') && field.type !== 'page-break' && (
                      <div className="flex items-center gap-2 mb-2">
                        <input type="checkbox" checked={field.required} onChange={e => updateField(idx, { required: e.target.checked })} id={`req-${idx}`} />
                        <label htmlFor={`req-${idx}`} className="text-sm">Required</label>
                      </div>
                    )}
                    <button onClick={() => removeField(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  { field.type === 'content-text' && (
                    <div className="w-full mt-2">
                       <label className="block text-xs font-medium text-gray-500 mb-1">Content Text (Markdown supported)</label>
                       <textarea value={field.contentData || ''} onChange={e => updateField(idx, { contentData: e.target.value })} className="w-full px-3 py-2 border rounded text-sm" rows={2}></textarea>
                    </div>
                  )}

                  { (field.type === 'content-image' || field.type === 'content-video') && (
                    <div className="w-full mt-2">
                       <label className="block text-xs font-medium text-gray-500 mb-1">Media URL (e.g. YouTube embed link or Image link)</label>
                       <input type="url" value={field.contentData || ''} onChange={e => updateField(idx, { contentData: e.target.value })} className="w-full px-3 py-1.5 border rounded text-sm" placeholder="https://" />
                    </div>
                  )}

                  { field.type === 'select' && (
                    <div className="w-full mt-2">
                       <label className="block text-xs font-medium text-gray-500 mb-1">Options (comma separated)</label>
                       <input type="text" value={(field.options || []).join(', ')} onChange={e => updateField(idx, { options: e.target.value.split(',').map(s => s.trim()) })} className="w-full px-3 py-1.5 border rounded text-sm" placeholder="Option 1, Option 2" />
                    </div>
                  )}
                </div>
              ))}
              {(!editingForm.fields || editingForm.fields.length === 0) && (
                <div className="text-sm text-gray-500 italic p-4 text-center border-2 border-dashed rounded-lg">No fields added yet. Need at least one.</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map(form => (
            <div key={form._id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
              <h3 className="font-semibold text-lg text-gray-900 mb-1">{form.name}</h3>
              <p className="text-gray-500 text-sm mb-4 flex-1">{form.description}</p>
              <div className="text-xs text-gray-400 mb-4">{form.fields.length} fields</div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <button
                  onClick={() => {
                     navigator.clipboard.writeText(`<div class="psa-form-embed" data-form-id="${form._id}"></div>`);
                     alert('Embed snippet copied to clipboard');
                  }}
                  className="text-gray-500 hover:text-indigo-600 flex items-center gap-1 text-sm font-medium"
                >
                  <Link className="w-4 h-4" /> Embed
                </button>
                <div className="flex gap-2">
                  <button onClick={() => setEditingForm(form)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteForm(form._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {forms.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl text-gray-500">
              No forms created yet. Get started by creating your first custom form.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
