import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, ChevronRight, ChevronDown, Edit2, Trash2, FolderTree } from 'lucide-react';
import toast from 'react-hot-toast';
import { procurementApi } from '../../api/procurement';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';

export default function ItemCategories() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | 'new' | category object
  const [expanded, setExpanded] = useState(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['item-categories'],
    queryFn: () => procurementApi.categories.list({ page_size: 500 }),
  });

  const categories = data?.results || [];
  const roots = categories.filter((c) => !c.parent);
  const childrenOf = (id) => categories.filter((c) => c.parent === id);

  const remove = useMutation({
    mutationFn: (id) => procurementApi.categories.remove(id),
    onSuccess: () => {
      toast.success('Category deleted');
      qc.invalidateQueries({ queryKey: ['item-categories'] });
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Delete failed'),
  });

  const toggle = (id) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  const renderNode = (cat, depth = 0) => {
    const kids = childrenOf(cat.id);
    const isOpen = expanded.has(cat.id);

    return (
      <div key={cat.id}>
        <div
          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 border-b border-slate-100"
          style={{ paddingLeft: `${12 + depth * 24}px` }}
        >
          <button
            onClick={() => toggle(cat.id)}
            className="w-4 h-4 flex items-center justify-center text-slate-500"
            disabled={!kids.length}
          >
            {kids.length > 0 ? (
              isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : (
              <span className="w-4" />
            )}
          </button>
          <span className="font-mono text-xs text-slate-500 w-24">{cat.code}</span>
          <span className="flex-1 text-sm text-slate-800">{cat.name}</span>
          <span className="text-xs text-slate-400 mr-2">L{cat.level}</span>
          <button
            onClick={() => setModal(cat)}
            className="p-1 text-slate-500 hover:text-blue-600"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete "${cat.name}"?`)) remove.mutate(cat.id);
            }}
            className="p-1 text-slate-500 hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        {isOpen && kids.map((k) => renderNode(k, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setModal('new')}>
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading…</div>
        ) : roots.length === 0 ? (
          <div className="p-12 text-center">
            <FolderTree className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">No categories yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Create your first category to organize inventory items.
            </p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            {roots.map((r) => renderNode(r))}
          </div>
        )}
      </div>

      <CategoryModal
        open={!!modal}
        initial={modal === 'new' ? null : modal}
        categories={categories}
        onClose={() => setModal(null)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['item-categories'] });
          setModal(null);
        }}
      />
    </div>
  );
}

function CategoryModal({ open, initial, categories, onClose, onSuccess }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: initial || { code: '', name: '', parent: '', description: '', is_active: true },
  });
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);

  const submit = async (values) => {
    setSaving(true);
    try {
      const payload = {
        code: values.code.trim(),
        name: values.name.trim(),
        parent: values.parent || null,
        description: values.description || '',
        is_active: values.is_active !== false,
      };
      if (isEdit) {
        await procurementApi.categories.update(initial.id, payload);
        toast.success('Category updated');
      } else {
        await procurementApi.categories.create(payload);
        toast.success('Category created');
      }
      reset();
      onSuccess();
    } catch (e) {
      const d = e.response?.data;
      let msg = 'Save failed';
      if (typeof d === 'string') msg = d;
      else if (d?.code) msg = `Code: ${d.code}`;
      else if (d?.detail) msg = d.detail;
      toast.error(msg, { duration: 6000 });
    } finally {
      setSaving(false);
    }
  };

  // Build parent options (exclude self and descendants to avoid cycles)
  const descendants = new Set();
  const walk = (id) => {
    categories.filter((c) => c.parent === id).forEach((c) => {
      descendants.add(c.id);
      walk(c.id);
    });
  };
  if (isEdit) walk(initial.id);
  const parentOptions = categories.filter((c) => !isEdit || c.id !== initial.id);
  const validParentOptions = parentOptions.filter((c) => !descendants.has(c.id));

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Category' : 'New Category'}>
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Code" required error={errors.code}>
            <input
              {...register('code', { required: 'Required' })}
              className="input"
              placeholder="e.g. ABB-DRV"
              disabled={isEdit}
            />
          </FormField>
          <FormField label="Name" required error={errors.name}>
            <input
              {...register('name', { required: 'Required' })}
              className="input"
              placeholder="e.g. Drives"
            />
          </FormField>
        </div>

        <FormField label="Parent Category">
          <select {...register('parent')} className="input">
            <option value="">— Top level —</option>
            {validParentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {'  '.repeat(Math.max(0, (c.level || 1) - 1))}{c.code} — {c.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Description">
          <textarea {...register('description')} rows={2} className="input" />
        </FormField>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register('is_active')} className="rounded" />
          Active
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}