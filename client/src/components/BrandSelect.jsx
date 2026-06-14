import { useState, useRef, useEffect } from 'react';

export default function BrandSelect({ value, onChange, customBrands, onAdd, onEdit, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) closeDropdown();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const closeDropdown = () => {
    setIsOpen(false);
    setAddingNew(false);
    setNewBrandName('');
    setEditingId(null);
    setConfirmDeleteId(null);
  };

  const select = (name) => {
    if (processingId) return;
    onChange(name);
    closeDropdown();
  };

  const startEdit = (e, brand) => {
    e.stopPropagation();
    if (processingId) return;
    setEditingId(brand.id);
    setEditValue(brand.name);
    setConfirmDeleteId(null);
  };

  const cancelEdit = (e) => {
    e?.stopPropagation();
    setEditingId(null);
  };

  const commitEdit = async (e, brand) => {
    e?.stopPropagation();
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === brand.name) { cancelEdit(); return; }
    setProcessingId(brand.id);
    await onEdit(brand.id, trimmed);
    setProcessingId(null);
    setEditingId(null);
  };

  const startDelete = (e, brand) => {
    e.stopPropagation();
    if (processingId) return;
    setConfirmDeleteId(brand.id);
    setEditingId(null);
  };

  const cancelDelete = (e) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  const commitDelete = async (e, brand) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
    setProcessingId(brand.id);
    await onDelete(brand.id);
    setProcessingId(null);
  };

  const handleAdd = async () => {
    const trimmed = newBrandName.trim();
    if (!trimmed) return;
    setProcessingId('new');
    await onAdd(trimmed);
    setProcessingId(null);
    setNewBrandName('');
    setAddingNew(false);
  };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-surface-dim text-sm text-left transition-colors focus:outline-none focus:border-primary"
      >
        <span className={value ? 'text-text-primary' : 'text-text-muted'}>
          {value || '-- เลือกยี่ห้อ --'}
        </span>
        <span className="material-symbols-outlined text-base text-text-muted">
          {isOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
        </span>
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-border shadow-xl overflow-hidden flex flex-col max-h-72">
          <div className="overflow-y-auto flex-1">
            {customBrands.length === 0 && !addingNew ? (
              <div className="px-4 py-6 text-center">
                <span className="material-symbols-outlined text-2xl text-text-muted block mb-1">sell</span>
                <p className="text-xs text-text-muted">ยังไม่มียี่ห้อ กด + เพื่อเพิ่ม</p>
              </div>
            ) : (
              customBrands.map(brand => (
                <div key={brand.id} className="group flex items-center gap-1 px-3 py-1.5 hover:bg-surface-dim transition-colors">
                  {editingId === brand.id ? (
                    <div className="flex items-center gap-1.5 flex-1" onClick={e => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); commitEdit(e, brand); }
                          if (e.key === 'Escape') cancelEdit(e);
                        }}
                        className="flex-1 min-w-0 px-2 py-1 text-sm border border-primary rounded-lg outline-none bg-white"
                      />
                      {processingId === brand.id ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                      ) : (
                        <>
                          <button type="button" onClick={e => commitEdit(e, brand)} className="p-1 rounded text-primary hover:bg-primary/10 transition-colors shrink-0">
                            <span className="material-symbols-outlined text-[18px]">check</span>
                          </button>
                          <button type="button" onClick={cancelEdit} className="p-1 rounded text-text-muted hover:bg-surface-dim transition-colors shrink-0">
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        </>
                      )}
                    </div>
                  ) : confirmDeleteId === brand.id ? (
                    <div className="flex items-center gap-2 flex-1 bg-red-50 rounded-lg px-2 py-1 -mx-1" onClick={e => e.stopPropagation()}>
                      <span className="material-symbols-outlined text-base text-red-400 shrink-0">warning</span>
                      <span className="flex-1 text-sm text-red-700 font-medium truncate">{brand.name}</span>
                      <button type="button" onClick={e => commitDelete(e, brand)} className="px-2.5 py-1 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg shrink-0 transition-colors">
                        ลบ
                      </button>
                      <button type="button" onClick={cancelDelete} className="p-1 rounded text-text-muted hover:bg-white transition-colors shrink-0">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ) : processingId === brand.id ? (
                    <div className="flex items-center gap-2 flex-1 opacity-40 py-0.5">
                      <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                      <span className="flex-1 text-sm truncate">{brand.name}</span>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => select(brand.name)}
                        className={`flex-1 text-sm text-left py-0.5 truncate ${value === brand.name ? 'text-primary font-semibold' : 'text-text-primary'}`}
                      >
                        {brand.name}
                      </button>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button type="button" onClick={e => startEdit(e, brand)} className="p-1 rounded text-text-muted hover:text-primary hover:bg-primary/10 transition-colors">
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button type="button" onClick={e => startDelete(e, brand)} className="p-1 rounded text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors">
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                      {value === brand.name && (
                        <span className="material-symbols-outlined text-sm text-primary ml-1 shrink-0">check</span>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add new — pinned to bottom */}
          <div className="border-t border-border-light shrink-0">
            {addingNew ? (
              <div className="flex items-center gap-2 px-3 py-2" onClick={e => e.stopPropagation()}>
                <input
                  autoFocus
                  value={newBrandName}
                  onChange={e => setNewBrandName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
                    if (e.key === 'Escape') { setAddingNew(false); setNewBrandName(''); }
                  }}
                  placeholder="ชื่อยี่ห้อใหม่..."
                  className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-primary rounded-lg outline-none bg-white"
                />
                {processingId === 'new' ? (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <>
                    <button type="button" onClick={handleAdd} className="px-3 py-1.5 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors shrink-0">
                      เพิ่ม
                    </button>
                    <button type="button" onClick={() => { setAddingNew(false); setNewBrandName(''); }} className="p-1 rounded text-text-muted hover:bg-surface-dim transition-colors shrink-0">
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setAddingNew(true); setEditingId(null); setConfirmDeleteId(null); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-dim transition-colors"
              >
                <span className="material-symbols-outlined text-base" style={{ color: '#F97316' }}>add_circle</span>
                <span>เพิ่มยี่ห้อใหม่...</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
