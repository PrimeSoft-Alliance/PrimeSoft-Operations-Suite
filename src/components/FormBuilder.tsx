import React, { useState } from 'react';
import { Plus, Trash2, Copy, Eye, EyeOff } from 'lucide-react';

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'phone' | 'date';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  theme?: {
    primaryColor: string;
    buttonText: string;
  };
}

interface FormBuilderProps {
  template?: FormTemplate;
  onSave: (template: FormTemplate) => Promise<void>;
  isLoading?: boolean;
}

const FIELD_TYPES = [
  { id: 'text', label: 'Text Input', icon: '📝' },
  { id: 'email', label: 'Email', icon: '✉️' },
  { id: 'phone', label: 'Phone', icon: '📱' },
  { id: 'textarea', label: 'Text Area', icon: '📄' },
  { id: 'select', label: 'Dropdown', icon: '▼' },
  { id: 'checkbox', label: 'Checkbox', icon: '☑️' },
  { id: 'radio', label: 'Radio', icon: '⭕' },
  { id: 'date', label: 'Date', icon: '📅' }
];

export function FormBuilder({ template, onSave, isLoading = false }: FormBuilderProps) {
  const [formData, setFormData] = useState<FormTemplate>(
    template || {
      id: Date.now().toString(),
      name: 'New Form',
      description: 'Form description',
      fields: [],
      theme: {
        primaryColor: '#3b82f6',
        buttonText: 'Submit'
      }
    }
  );

  const [preview, setPreview] = useState(false);
  const [draggedFieldType, setDraggedFieldType] = useState<string | null>(null);

  const addField = (type: string) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: type as FormField['type'],
      label: `Field ${formData.fields.length + 1}`,
      placeholder: '',
      required: false,
      options: type === 'select' ? ['Option 1', 'Option 2'] : undefined
    };
    setFormData({
      ...formData,
      fields: [...formData.fields, newField]
    });
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormData({
      ...formData,
      fields: formData.fields.map(f =>
        f.id === fieldId ? { ...f, ...updates } : f
      )
    });
  };

  const removeField = (fieldId: string) => {
    setFormData({
      ...formData,
      fields: formData.fields.filter(f => f.id !== fieldId)
    });
  };

  const duplicateField = (fieldId: string) => {
    const fieldToDuplicate = formData.fields.find(f => f.id === fieldId);
    if (fieldToDuplicate) {
      const newField = {
        ...fieldToDuplicate,
        id: `field_${Date.now()}`
      };
      setFormData({
        ...formData,
        fields: [...formData.fields, newField]
      });
    }
  };

  const renderFieldPreview = (field: FormField) => {
    const baseClasses = 'w-full px-4 py-2 rounded border border-slate-300 bg-white text-slate-900';

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'date':
        return <input type={field.type} placeholder={field.placeholder || field.label} className={baseClasses} disabled />;
      case 'textarea':
        return <textarea placeholder={field.placeholder || field.label} className={baseClasses} rows={3} disabled />;
      case 'select':
        return (
          <select className={baseClasses} disabled>
            {field.options?.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'checkbox':
        return (
          <label className="flex items-center gap-2">
            <input type="checkbox" disabled />
            <span className="text-slate-900">{field.label}</span>
          </label>
        );
      case 'radio':
        return (
          <label className="flex items-center gap-2">
            <input type="radio" disabled />
            <span className="text-slate-900">{field.label}</span>
          </label>
        );
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Builder Panel */}
      <div className="lg:col-span-2 space-y-6">
        {/* Form Settings */}
        <div className="rounded-lg bg-slate-700/20 border border-slate-700/50 p-6">
          <h3 className="font-semibold text-slate-100 mb-4">Form Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Form Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded text-slate-100 text-sm focus:outline-none focus:border-blue-500/50"
                placeholder="Enter form name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded text-slate-100 text-sm focus:outline-none focus:border-blue-500/50"
                placeholder="Short description"
              />
            </div>
          </div>
        </div>

        {/* Field Templates */}
        <div className="rounded-lg bg-slate-700/20 border border-slate-700/50 p-6">
          <h3 className="font-semibold text-slate-100 mb-4">Add Fields</h3>
          <div className="grid grid-cols-2 gap-2">
            {FIELD_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => addField(type.id)}
                className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:border-blue-500/50 text-slate-300 hover:text-blue-400 transition-colors text-sm font-medium"
              >
                <span className="mr-2">{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Fields */}
        <div className="rounded-lg bg-slate-700/20 border border-slate-700/50 p-6">
          <h3 className="font-semibold text-slate-100 mb-4">Form Fields ({formData.fields.length})</h3>
          {formData.fields.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No fields added yet. Add fields from above.</p>
          ) : (
            <div className="space-y-4">
              {formData.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-semibold">
                          {field.type}
                        </span>
                        <span className="text-xs text-slate-400">#{index + 1}</span>
                      </div>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded text-slate-100 text-sm focus:outline-none focus:border-blue-500/50 mb-2"
                        placeholder="Field label"
                      />
                      {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                        <input
                          type="text"
                          value={field.options?.join(', ') || ''}
                          onChange={(e) => updateField(field.id, { options: e.target.value.split(',').map(o => o.trim()) })}
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded text-slate-100 text-xs focus:outline-none focus:border-blue-500/50"
                          placeholder="Option 1, Option 2, Option 3"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => duplicateField(field.id)}
                        className="p-2 hover:bg-slate-700/50 rounded transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4 text-slate-400 hover:text-blue-400" />
                      </button>
                      <button
                        onClick={() => removeField(field.id)}
                        className="p-2 hover:bg-slate-700/50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(field.id, { required: e.target.checked })}
                      className="rounded"
                    />
                    Required field
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={() => onSave(formData)}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-all duration-300"
        >
          {isLoading ? 'Saving...' : 'Save Form'}
        </button>
      </div>

      {/* Preview Panel */}
      <div className="rounded-lg bg-slate-700/20 border border-slate-700/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-100">Preview</h3>
          <button
            onClick={() => setPreview(!preview)}
            className="p-2 hover:bg-slate-700/50 rounded transition-colors"
          >
            {preview ? (
              <EyeOff className="w-4 h-4 text-slate-400" />
            ) : (
              <Eye className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>

        {!preview ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            Click the eye icon to see form preview
          </div>
        ) : (
          <div className="bg-white rounded-lg p-6 space-y-6">
            <div>
              <h4 className="font-bold text-slate-900 mb-1">{formData.name}</h4>
              <p className="text-sm text-slate-600">{formData.description}</p>
            </div>

            {formData.fields.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No fields to preview</p>
            ) : (
              <form className="space-y-4">
                {formData.fields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-slate-900 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {renderFieldPreview(field)}
                  </div>
                ))}
                <button
                  type="button"
                  style={{ backgroundColor: formData.theme?.primaryColor }}
                  className="w-full py-2 text-white font-semibold rounded-lg"
                >
                  {formData.theme?.buttonText || 'Submit'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
