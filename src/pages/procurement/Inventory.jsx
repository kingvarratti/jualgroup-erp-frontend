import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Plus, AlertTriangle, Package, PackageX, Search,
  Edit, Trash2, Boxes, CheckCircle2, FileText, Download, Upload,
  SlidersHorizontal, History, Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { procurementApi } from '../../api/procurement';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import ConfirmDialog from '../../components/ConfirmDialog';
import StatCard from '../../components/StatCard';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';
import InventoryImportModal from '../../components/InventoryImportModal';
import StockAdjustmentModal from '../../components/StockAdjustmentModal';
import BranchStockModal from '../../components/BranchStockModal';
import ExportMenu from '../../components/ExportMenu';
import ItemMovementsModal from '../../components/ItemMovementsModal';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'ABB', label: 'ABB Products' },
  { value: 'PUMPS', label: 'Pumps' },
  { value: 'VALVES', label: 'Valves' },
  { value: 'INSTRUMENTATION', label: 'Instrumentation' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'MECHANICAL', label: 'Mechanical' },
  { value: 'SPARES', label: 'Spare Parts' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_TABS = [
  { key: '', label: 'All Items', icon: Boxes },
  { key: 'in_stock', label: 'In Stock', icon: CheckCircle2 },
  { key: 'low_stock', label: 'Low Stock', icon: AlertTriangle },
  { key: 'out_of_stock', label: 'Out of Stock', icon: PackageX },
];

export default function Inventory() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [importModal, setImportModal] = useState(false);
  const [adjustItem, setAdjustItem] = useState(null);
  const [branchStockItem, setBranchStockItem] = useState(null);

  const isStores = [ROLES.STORES, ROLES.ADMIN, ROLES.SUPPLY_CHAIN].includes(
    user?.role
  );

  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: '',
    sort: '-created_at',
  });
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data: statsData } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: async () => {
      const res = await fetch(
        'http://localhost:8000/api/procurement/inventory/stats/',
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );
      return res.json();
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', filters],
    queryFn: () =>
      procurementApi.inventory.list({
        search: filters.search,
        category: filters.category,
        ordering: filters.sort,
        page_size: 500,
      }),
    keepPreviousData: true,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const openCreate = () => {
    setEditing(null);
    reset({
      part_number: '',
      description: '',
      manufacturer: 'ABB',
      category: 'ABB',
      uom: 'pcs',
      quantity_on_hand: 0,
      reorder_level: 0,
      safety_stock: 0,
      unit_cost: 0,
      unit_price: 0,
      location: '',
      bin_number: '',
      notes: '',
      is_active: true,
      datasheet: null,
    });
    setModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    reset({
      part_number: item.part_number,
      description: item.description,
      manufacturer: item.manufacturer,
      category: item.category,
      uom: item.uom,
      quantity_on_hand: item.quantity_on_hand,
      reorder_level: item.reorder_level,
      safety_stock: item.safety_stock,
      unit_cost: item.unit_cost,
      unit_price: item.unit_price,
      location: item.location,
      bin_number: item.bin_number,
      notes: item.notes,
      is_active: item.is_active,
      datasheet: null,
    });
    setModal(true);
  };

  const saveMutation = useMutation({
    mutationFn: (values) => {
      // If a file was selected, use FormData
      const hasFile =
        values.datasheet && values.datasheet.length && values.datasheet[0];

      if (hasFile) {
        const fd = new FormData();
        Object.entries(values).forEach(([k, v]) => {
          if (k === 'datasheet') {
            fd.append(k, v[0]);
          } else if (v !== undefined && v !== null) {
            fd.append(k, v);
          }
        });
        return editing
          ? procurementApi.inventory.update(editing.id, fd)
          : procurementApi.inventory.create(fd);
      } else {
        // No file — use JSON (strip out empty datasheet)
        const payload = { ...values };
        delete payload.datasheet;
        return editing
          ? procurementApi.inventory.update(editing.id, payload)
          : procurementApi.inventory.create(payload);
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Item updated' : 'Item added');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-stats'] });
      setModal(false);
      reset();
      setEditing(null);
    },
    onError: (err) => {
      const msg = err.response?.data
        ? Object.values(err.response.data).flat().join(', ')
        : 'Failed to save';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => procurementApi.inventory.remove(id),
    onSuccess: () => {
      toast.success('Item deleted');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-stats'] });
      setConfirmDelete(null);
    },
    onError: () => toast.error('Failed to delete item'),
  });

  let items = data?.results || [];
  if (filters.status === 'in_stock') {
    items = items.filter(
      (i) => Number(i.quantity_on_hand) > Number(i.reorder_level)
    );
  } else if (filters.status === 'low_stock') {
    items = items.filter(
      (i) =>
        Number(i.quantity_on_hand) > 0 &&
        Number(i.quantity_on_hand) <= Number(i.reorder_level)
    );
  } else if (filters.status === 'out_of_stock') {
    items = items.filter((i) => Number(i.quantity_on_hand) <= 0);
  }

    const [movementsItem, setMovementsItem] = useState(null);

  const columns = [
    {
      key: 'part_number',
      label: 'Part Number',
      className: 'min-w-[140px]',
      render: (r) => (
        <div className="flex items-center gap-2">
          {r.datasheet && (
            <a
              href={r.datasheet}
              target="_blank"
              rel="noreferrer"
              className="text-red-500 hover:text-red-600"
              title="Datasheet available"
              onClick={(e) => e.stopPropagation()}
            >
              <FileText className="w-4 h-4" />
            </a>
          )}
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800">{r.part_number}</span>
            {r.manufacturer && (
              <span className="text-xs text-slate-500">{r.manufacturer}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      className: 'min-w-[220px]',
      render: (r) => (
        <span className="text-slate-700 line-clamp-1 max-w-md">
          {r.description}
        </span>
      ),
    },
    {
      key: 'category_display',
      label: 'Category',
      className: 'whitespace-nowrap',
      render: (r) => (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          {r.category_display}
        </span>
      ),
    },
    {
      key: 'quantity_on_hand',
      label: 'On Hand',
      className: 'text-right whitespace-nowrap',
      render: (r) => {
        const qty = Number(r.quantity_on_hand);
        const rop = Number(r.reorder_level);
        let cls = 'text-slate-800 font-semibold';
        if (qty <= 0) cls = 'text-red-600 font-bold';
        else if (qty <= rop) cls = 'text-amber-600 font-semibold';
        return (
          <span className={cls}>
            {qty}
            <span className="ml-1 text-xs text-slate-400 font-normal">
              {r.uom}
            </span>
          </span>
        );
      },
    },
    {
      key: 'reorder_level',
      label: 'Reorder At',
      className: 'text-right whitespace-nowrap',
      render: (r) => (
        <span className="text-slate-500">
          {r.reorder_level}
          <span className="ml-1 text-xs text-slate-400">{r.uom}</span>
        </span>
      ),
    },
    {
      key: 'unit_cost',
      label: 'Unit Cost',
      className: 'text-right whitespace-nowrap',
      render: (r) => (
        <span className="text-slate-700 font-medium">
          {formatCurrency(r.unit_cost)}
        </span>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      className: 'whitespace-nowrap',
      render: (r) =>
        r.location ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs font-mono text-slate-600">
            {r.location}
            {r.bin_number && (
              <span className="text-slate-400">/ {r.bin_number}</span>
            )}
          </span>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        ),
    },

        {
      key: 'branch_stocks',
      label: 'Branches',
      className: 'text-center',
      render: (r) => {
        const count = r.branch_stocks?.length || 0;
        if (count === 0) {
          return <span className="text-xs text-slate-400">—</span>;
        }
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setBranchStockItem(r);
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
            title="View branch breakdown"
          >
            <Building2 className="w-3 h-3" />
            {count} branch{count > 1 ? 'es' : ''}
          </button>
        );
      },
    },

    {
      key: 'stock_status',
      label: 'Status',
      className: 'whitespace-nowrap',
      render: (r) => {
        if (r.stock_status === 'OUT_OF_STOCK') {
          return (
            <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 ring-1 ring-inset ring-red-600/20">
              <PackageX className="w-3 h-3" /> Out of Stock
            </span>
          );
        }
        if (r.stock_status === 'LOW_STOCK') {
          return (
            <span className="badge-pending inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-600/20">
              <AlertTriangle className="w-3 h-3" /> Low Stock
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 ring-1 ring-inset ring-green-600/20">
            <CheckCircle2 className="w-3 h-3" /> In Stock
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Items"
          value={statsData?.total_items ?? '—'}
          icon={Boxes}
          color="brand"
        />
        <StatCard
          label="In Stock"
          value={statsData?.in_stock ?? '—'}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          label="Low Stock"
          value={statsData?.low_stock ?? '—'}
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          label="Out of Stock"
          value={statsData?.out_of_stock ?? '—'}
          icon={PackageX}
          color="red"
        />
      </div>

      {/* Table Card */}
      <div className="card">
        <div className="p-4 space-y-3">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                placeholder="Search part number, description, location..."
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="input pl-9"
              />
            </div>
            <select
              value={filters.category}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value })
              }
              className="input w-48"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
              className="input w-44"
            >
              <option value="-created_at">Newest First</option>
              <option value="part_number">Part No. (A-Z)</option>
              <option value="-part_number">Part No. (Z-A)</option>
              <option value="quantity_on_hand">Lowest Qty</option>
              <option value="-quantity_on_hand">Highest Qty</option>
            </select>

                        <ExportMenu
              columns={columns}
              data={items}
              filename={`inventory-${new Date().toISOString().slice(0, 10)}`}
              title="Inventory Report"
            />

                            {isStores && (
              <>
                <button
                  className="btn-secondary"
                  onClick={() => setImportModal(true)}
                >
                  <Upload className="w-4 h-4" /> Import
                </button>
                <button className="btn-primary" onClick={openCreate}>
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </>
            )}
            
          </div>

          {/* Status tabs */}
          <div className="flex flex-wrap items-center gap-1 border-b border-slate-200">
            {STATUS_TABS.map((tab) => {
              const active = filters.status === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilters({ ...filters, status: tab.key })}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    active
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.key === 'low_stock' && statsData?.low_stock > 0 && (
                    <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {statsData.low_stock}
                    </span>
                  )}
                  {tab.key === 'out_of_stock' && statsData?.out_of_stock > 0 && (
                    <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                      {statsData.out_of_stock}
                    </span>
                  )}
                </button>
              );
            })}
            <div className="flex-1" />
            <span className="text-xs text-slate-500 pb-2">
              {items.length} item{items.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={items}
          loading={isLoading}
          emptyTitle="No inventory items"
          emptyMessage={
            isStores
              ? 'Add your first ABB product, pump, or valve to get started.'
              : 'No items match your filter.'
          }
          emptyIcon={Package}
          emptyAction={
            isStores ? (
              <button className="btn-primary" onClick={openCreate}>
                <Plus className="w-4 h-4" /> Add First Item
              </button>
            ) : null
          }
                             actions={
            (r) => (
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => setMovementsItem(r)}
                  className="btn-ghost !p-2 text-slate-600"
                  title="View Movement History"
                >
                  <History className="w-4 h-4" />
                </button>
                {isStores && (
                  <>
                    <button
                      onClick={() => setAdjustItem(r)}
                      className="btn-ghost !p-2 text-amber-600"
                      title="Adjust Stock"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEdit(r)}
                      className="btn-ghost !p-2 text-blue-600"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(r)}
                      className="btn-ghost !p-2 text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            )
          }
          />
      </div>

      {/* Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? `Edit — ${editing.part_number}` : 'Add Inventory Item'}
        size="lg"
      >
        <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Part Number" required error={errors.part_number}>
              <input
                {...register('part_number', { required: 'Required' })}
                className="input"
                placeholder="e.g. ABB-S201-C32"
              />
            </FormField>
            <FormField label="Manufacturer">
              <input
                {...register('manufacturer')}
                className="input"
                placeholder="e.g. ABB, Grundfos, Danfoss"
              />
            </FormField>
          </div>

          <FormField label="Description" required error={errors.description}>
            <input
              {...register('description', { required: 'Required' })}
              className="input"
              placeholder="e.g. Miniature Circuit Breaker 32A 1P"
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Category" required>
              <select
                {...register('category', { required: true })}
                className="input"
              >
                {CATEGORIES.filter((c) => c.value).map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Unit of Measure" required>
              <input
                {...register('uom', { required: 'Required' })}
                className="input"
                placeholder="pcs / kg / m"
              />
            </FormField>
            <FormField label="Location (Shelf/Rack)">
              <input
                {...register('location')}
                className="input"
                placeholder="A-01"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Quantity On Hand">
              <input
                type="number"
                step="0.01"
                {...register('quantity_on_hand')}
                className="input"
              />
            </FormField>
            <FormField
              label="Reorder Level"
              helper="Alert when stock falls below"
            >
              <input
                type="number"
                step="0.01"
                {...register('reorder_level')}
                className="input"
              />
            </FormField>
            <FormField label="Safety Stock" helper="Minimum buffer">
              <input
                type="number"
                step="0.01"
                {...register('safety_stock')}
                className="input"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Unit Cost (GHS)">
              <input
                type="number"
                step="0.01"
                {...register('unit_cost')}
                className="input"
              />
            </FormField>
            <FormField label="Selling Price (GHS)">
              <input
                type="number"
                step="0.01"
                {...register('unit_price')}
                className="input"
              />
            </FormField>
            <FormField label="Bin Number">
              <input
                {...register('bin_number')}
                className="input"
                placeholder="B-123"
              />
            </FormField>
          </div>

          {/* Datasheet upload */}
          <FormField
            label="Datasheet (PDF, image, or doc)"
            helper="Attach the ABB product datasheet, pump curve, or valve specification"
          >
            <div className="flex items-center gap-3">
              <label className="btn-secondary cursor-pointer">
                <Upload className="w-4 h-4" /> Choose File
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  {...register('datasheet')}
                  className="hidden"
                />
              </label>
              {editing?.datasheet && (
                <a
                  href={editing.datasheet}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-red-600 hover:text-red-700 inline-flex items-center gap-1"
                >
                  <FileText className="w-4 h-4" /> View current datasheet
                </a>
              )}
            </div>
          </FormField>

          <FormField label="Notes">
            <textarea rows={2} {...register('notes')} className="input" />
          </FormField>

          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('is_active')} />
              Active item
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="btn-primary"
            >
              {saveMutation.isPending
                ? 'Saving...'
                : editing
                ? 'Update Item'
                : 'Add Item'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteMutation.mutate(confirmDelete.id)}
        title="Delete Inventory Item?"
        message={`Are you sure you want to delete "${confirmDelete?.part_number} — ${confirmDelete?.description}"? This cannot be undone.`}
        loading={deleteMutation.isPending}
      />
            <InventoryImportModal
        open={importModal}
        onClose={() => setImportModal(false)}
      />

            <StockAdjustmentModal
        item={adjustItem}
        onClose={() => setAdjustItem(null)}
      />

            <ItemMovementsModal
        item={movementsItem}
        onClose={() => setMovementsItem(null)}
      />

            <BranchStockModal
        item={branchStockItem}
        onClose={() => setBranchStockItem(null)}
      />

      
    </div>

    
  );
}