import React, { useState } from 'react';
import * as types from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import { PlusIcon, PencilIcon, Trash2Icon, BookOpenIcon, ArrowDownIcon, ArrowUpIcon } from '../constants';
import { createSOP as createSOPRow, updateSOP as updateSOPRow, deleteSOP as deleteSOPRow } from '../services/sops';

interface SOPProps {
    sops: types.SOP[];
    setSops: React.Dispatch<React.SetStateAction<types.SOP[]>>;
    profile: types.Profile;
    showNotification: (message: string) => void;
}

const SOPManagement: React.FC<SOPProps> = ({ sops, setSops, profile, showNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
    const [selectedSop, setSelectedSop] = useState<types.SOP | null>(null);

    const initialFormState = {
        title: '',
        category: profile.sopCategories[0] || '',
        content: '',
    };
    const [formData, setFormData] = useState(initialFormState);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set(profile.sopCategories));

    const handleOpenModal = (mode: 'add' | 'edit' | 'view', sop?: types.SOP) => {
        setModalMode(mode);
        if ((mode === 'edit' || mode === 'view') && sop) {
            setSelectedSop(sop);
            setFormData({
                title: sop.title,
                category: sop.category,
                content: sop.content,
            });
        } else {
            setSelectedSop(null);
            setFormData(initialFormState);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (modalMode === 'add') {
                const payload = {
                    ...formData,
                    lastUpdated: new Date().toISOString(),
                } as Omit<types.SOP, 'id'>;
                const created = await createSOPRow(payload);
                setSops(prev => [...prev, created].sort((a,b) => a.title.localeCompare(b.title)));
                showNotification('SOP baru berhasil ditambahkan.');
            } else if (selectedSop) {
                const patch = {
                    ...formData,
                    lastUpdated: new Date().toISOString(),
                } as Partial<types.SOP>;
                try {
                    const updated = await updateSOPRow(selectedSop.id, patch);
                    setSops(prev => prev.map(s => s.id === selectedSop.id ? updated : s));
                    showNotification('SOP berhasil diperbarui.');
                } catch (err: any) {
                    console.warn('[Supabase][sops.update] gagal, fallback create. Detail:', err);
                    const created = await createSOPRow({ ...formData, lastUpdated: new Date().toISOString() } as any);
                    setSops(prev => prev.map(s => s.id === selectedSop.id ? created : s));
                    showNotification('SOP baru berhasil dibuat (fallback).');
                }
            }
            handleCloseModal();
        } catch (err: any) {
            console.error('[Supabase][sops.save] error:', err);
            alert(`Gagal menyimpan SOP ke database. ${err?.message || 'Coba lagi.'}`);
        }
    };
    
    const handleDelete = async (sopId: string) => {
        if (!window.confirm("Yakin ingin menghapus SOP ini?")) return;
        try {
            await deleteSOPRow(sopId);
            setSops(prev => prev.filter(s => s.id !== sopId));
            showNotification('SOP berhasil dihapus.');
        } catch (err: any) {
            console.error('[Supabase][sops.delete] error:', err);
            alert(`Gagal menghapus SOP di database. ${err?.message || 'Coba lagi.'}`);
        }
    };

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };
    
    const sopsByCategory = sops.reduce((acc, sop) => {
        if (!acc[sop.category]) {
            acc[sop.category] = [];
        }
        acc[sop.category].push(sop);
        return acc;
    }, {} as Record<string, types.SOP[]>);

    return (
        <div className="space-y-6">
            <PageHeader title="Standar Operasional Prosedur (SOP)" subtitle="Kelola panduan kerja untuk menjaga kualitas dan konsistensi tim.">
                <button onClick={() => handleOpenModal('add')} className="button-primary inline-flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" />
                    Tambah SOP Baru
                </button>
            </PageHeader>

            <div className="space-y-4">
                {profile.sopCategories.map(category => (
                    <div key={category} className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                        <button onClick={() => toggleCategory(category)} className="w-full flex justify-between items-center p-4">
                            <h3 className="font-semibold text-lg text-brand-text-light">{category}</h3>
                            {expandedCategories.has(category) ? <ArrowUpIcon className="w-5 h-5 text-brand-text-secondary"/> : <ArrowDownIcon className="w-5 h-5 text-brand-text-secondary"/>}
                        </button>
                        {expandedCategories.has(category) && (
                            <div className="p-4 border-t border-brand-border space-y-3">
                                {(sopsByCategory[category] || []).map(sop => (
                                    <div key={sop.id} onClick={() => handleOpenModal('view', sop)} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center cursor-pointer hover:bg-brand-input">
                                        <div className="flex items-center gap-3">
                                            <BookOpenIcon className="w-5 h-5 text-brand-accent"/>
                                            <div>
                                                <p className="font-semibold text-brand-text-light">{sop.title}</p>
                                                <p className="text-xs text-brand-text-secondary">Diperbarui: {new Date(sop.lastUpdated).toLocaleDateString('id-ID')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); handleOpenModal('edit', sop); }} className="p-2 text-brand-text-secondary hover:text-brand-accent rounded-full"><PencilIcon className="w-5 h-5" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(sop.id); }} className="p-2 text-brand-text-secondary hover:text-brand-danger rounded-full"><Trash2Icon className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                ))}
                                {!sopsByCategory[category] && <p className="text-center text-sm text-brand-text-secondary p-4">Belum ada SOP di kategori ini.</p>}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalMode === 'add' ? 'Tambah SOP' : (modalMode === 'edit' ? 'Edit SOP' : selectedSop?.title || 'Lihat SOP')} size="4xl">
                {modalMode === 'view' && selectedSop ? (
                    <div className="prose prose-sm md:prose-base prose-invert max-w-none max-h-[70vh] overflow-y-auto">
                        <div dangerouslySetInnerHTML={{ __html: selectedSop.content.replace(/\n/g, '<br />') }} />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="input-group">
                                <input type="text" id="title" name="title" value={formData.title} onChange={handleFormChange} className="input-field" placeholder=" " required />
                                <label htmlFor="title" className="input-label">Judul SOP</label>
                            </div>
                            <div className="input-group">
                                <select id="category" name="category" value={formData.category} onChange={handleFormChange} className="input-field" required>
                                    {profile.sopCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                                <label htmlFor="category" className="input-label">Kategori</label>
                            </div>
                        </div>
                        <div className="input-group">
                            <textarea id="content" name="content" value={formData.content} onChange={handleFormChange} className="input-field" placeholder=" " rows={15} required></textarea>
                            <label htmlFor="content" className="input-label">Konten SOP (mendukung Markdown)</label>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
                            <button type="button" onClick={handleCloseModal} className="button-secondary">Batal</button>
                            <button type="submit" className="button-primary">{modalMode === 'add' ? 'Simpan' : 'Update'}</button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default SOPManagement;