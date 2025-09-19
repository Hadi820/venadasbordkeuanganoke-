import React, { useState } from 'react';
import { Profile, Transaction, Project, User, ViewType, ProjectStatusConfig, SubStatusConfig, PublicPageConfig, Package } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import { PencilIcon, PlusIcon, Trash2Icon, KeyIcon, UsersIcon, ListIcon, FolderKanbanIcon, Share2Icon, FileTextIcon } from '../constants';
import { NAV_ITEMS } from '../constants';
import { upsertProfile } from '../services/profile';
import { createUser, updateUser, deleteUser } from '../services/users';

// Helper Component for Toggle Switches
const ToggleSwitch: React.FC<{ enabled: boolean; onChange: () => void; id?: string }> = ({ enabled, onChange, id }) => (
    <button
      type="button"
      id={id}
      className={`${enabled ? 'bg-brand-accent' : 'bg-gray-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-brand-surface`}
      onClick={onChange}
    >
      <span
        className={`${enabled ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  );

// Reusable UI component for managing a list of categories
const CategoryManager: React.FC<{
    title: string;
    categories: string[];
    inputValue: string;
    onInputChange: (value: string) => void;
    onAddOrUpdate: () => void;
    onEdit: (value: string) => void;
    onDelete: (value: string) => void;
    editingValue: string | null;
    onCancelEdit: () => void;
    placeholder: string;
}> = ({ title, categories, inputValue, onInputChange, onAddOrUpdate, onEdit, onDelete, editingValue, onCancelEdit, placeholder }) => {
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onAddOrUpdate();
        }
    };

    const renderCategoryItem = (category: string) => (
        <div key={category} className="flex items-center justify-between p-2.5 bg-brand-bg rounded-md">
            <span className="text-sm text-brand-text-primary">{category}</span>
            <div className="flex items-center space-x-2">
                <button type="button" onClick={() => onEdit(category)} className="p-1 text-brand-text-secondary hover:text-brand-accent" title="Edit"><PencilIcon className="w-4 h-4" /></button>
                <button type="button" onClick={() => onDelete(category)} className="p-1 text-brand-text-secondary hover:text-brand-danger" title="Hapus"><Trash2Icon className="w-4 h-4" /></button>
            </div>
        </div>
    );

    return (
        <div>
            <h3 className="text-lg font-semibold text-brand-text-light border-b border-gray-700/50 pb-3 mb-4">{title}</h3>
            <div className="flex gap-2 mb-4">
                 <div className="input-group flex-grow !mt-0">
                    <input
                        type="text"
                        id={`input-${title.replace(/\s/g, '')}`}
                        value={inputValue}
                        onChange={e => onInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder=" "
                        className="input-field"
                    />
                    <label htmlFor={`input-${title.replace(/\s/g, '')}`} className="input-label">{placeholder}</label>
                </div>
                <button onClick={onAddOrUpdate} className="button-primary h-fit mt-2">{editingValue ? 'Update' : 'Tambah'}</button>
                {editingValue && <button onClick={onCancelEdit} className="button-secondary h-fit mt-2">Batal</button>}
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {categories.map(cat => renderCategoryItem(cat))}
            </div>
        </div>
    );
};

// --- Sub-component for Project Status Management ---
const ProjectStatusManager: React.FC<{
    config: ProjectStatusConfig[];
    onConfigChange: (newConfig: ProjectStatusConfig[]) => void;
    projects: Project[];
    profile: Profile;
}> = ({ config, onConfigChange, projects, profile }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedStatus, setSelectedStatus] = useState<ProjectStatusConfig | null>(null);
    
    const initialFormState = {
        name: '',
        color: '#64748b',
        note: '',
        defaultProgress: undefined as number | undefined,
        subStatuses: [] as SubStatusConfig[],
    };
    const [form, setForm] = useState(initialFormState);

    const handleOpenModal = (mode: 'add' | 'edit', status?: ProjectStatusConfig) => {
        setModalMode(mode);
        if (mode === 'edit' && status) {
            setSelectedStatus(status);
            setForm({
                name: status.name,
                color: status.color,
                note: status.note,
                defaultProgress: (status as any).defaultProgress,
                subStatuses: [...status.subStatuses],
            });
        } else {
            setSelectedStatus(null);
            setForm(initialFormState);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'defaultProgress') {
            const num = value === '' ? undefined : Math.max(0, Math.min(100, Math.round(Number(value))));
            setForm(prev => ({ ...prev, [name]: num }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleSubStatusChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newSubStatuses = [...form.subStatuses];
        newSubStatuses[index] = { ...newSubStatuses[index], [name]: value };
        setForm(prev => ({ ...prev, subStatuses: newSubStatuses }));
    };

    const addSubStatus = () => {
        setForm(prev => ({...prev, subStatuses: [...prev.subStatuses, { name: '', note: '' }] }));
    };

    const removeSubStatus = (index: number) => {
        const newSubStatuses = [...form.subStatuses];
        newSubStatuses.splice(index, 1);
        setForm(prev => ({ ...prev, subStatuses: newSubStatuses }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (modalMode === 'add') {
            const newStatus: ProjectStatusConfig = {
                id: crypto.randomUUID(),
                ...form,
                subStatuses: form.subStatuses.filter(s => s.name.trim() !== '')
            };
            const newConfig = [...config, newStatus];
            onConfigChange(newConfig);
            // Save to Supabase
            try {
                await upsertProfile({ id: profile.id, projectStatusConfig: newConfig } as any);
            } catch (err: any) {
                console.error('[Settings] Save project status config failed:', err);
                alert('Gagal menyimpan status proyek: ' + (err?.message || 'Coba lagi.'));
            }
        } else if (selectedStatus) {
            const updatedConfig = config.map(s => 
                s.id === selectedStatus.id ? { ...s, ...form, subStatuses: form.subStatuses.filter(sub => sub.name.trim() !== '') } : s
            );
            onConfigChange(updatedConfig);
            // Save to Supabase
            try {
                await upsertProfile({ id: profile.id, projectStatusConfig: updatedConfig } as any);
            } catch (err: any) {
                console.error('[Settings] Update project status config failed:', err);
                alert('Gagal mengupdate status proyek: ' + (err?.message || 'Coba lagi.'));
            }
        }
        handleCloseModal();
    };

    const handleDelete = async (statusId: string) => {
        const status = config.find(s => s.id === statusId);
        if (!status) return;

        const isUsed = projects.some(p => p.status === status.name);
        if (isUsed) {
            alert(`Status "${status.name}" tidak dapat dihapus karena sedang digunakan oleh proyek.`);
            return;
        }

        if (window.confirm(`Yakin ingin menghapus status "${status.name}"?`)) {
            const newConfig = config.filter(s => s.id !== statusId);
            onConfigChange(newConfig);
            // Save to Supabase
            try {
                await upsertProfile({ id: profile.id, projectStatusConfig: newConfig } as any);
            } catch (err: any) {
                console.error('[Settings] Delete project status config failed:', err);
                alert('Gagal menghapus status proyek: ' + (err?.message || 'Coba lagi.'));
            }
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-brand-text-light">Manajemen Status Proyek</h3>
                <button onClick={() => handleOpenModal('add')} className="button-primary inline-flex items-center gap-2">
                    <PlusIcon className="w-5 h-5"/> Tambah Status
                </button>
            </div>
            <div className="space-y-4">
                {config.map(status => (
                    <div key={status.id} className="p-4 bg-brand-bg rounded-lg">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: status.color }}></span>
                                <span className="font-semibold text-brand-text-light">{status.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleOpenModal('edit', status)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full"><PencilIcon className="w-5 h-5"/></button>
                                <button onClick={() => handleDelete(status.id)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full"><Trash2Icon className="w-5 h-5"/></button>
                            </div>
                        </div>
                        {status.subStatuses.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-brand-border/50 pl-7 space-y-2">
                                {status.subStatuses.map((sub, index) => (
                                    <div key={index}><p className="text-sm font-medium text-brand-text-primary">{sub.name}</p><p className="text-xs text-brand-text-secondary">{sub.note}</p></div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalMode === 'add' ? 'Tambah Status Baru' : `Edit Status: ${selectedStatus?.name}`}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="input-group md:col-span-2"><input type="text" id="name" name="name" value={form.name} onChange={handleFormChange} className="input-field" required placeholder=" "/><label htmlFor="name" className="input-label">Nama Status</label></div>
                        <div className="input-group"><input type="color" id="color" name="color" value={form.color} onChange={handleFormChange} className="input-field !p-1 h-12"/><label htmlFor="color" className="input-label">Warna</label></div>
                        <div className="input-group"><input type="number" min={0} max={100} id="defaultProgress" name="defaultProgress" value={form.defaultProgress ?? ''} onChange={handleFormChange} className="input-field" placeholder=" "/><label htmlFor="defaultProgress" className="input-label">Default Progress (%)</label></div>
                    </div>
                    <div className="input-group"><textarea id="note" name="note" value={form.note} onChange={e => setForm(p => ({...p, note: e.target.value}))} className="input-field" rows={2} placeholder=" "/><label htmlFor="note" className="input-label">Catatan/Deskripsi Status</label></div>
                    
                    <div>
                        <h4 className="text-base font-semibold text-brand-text-light mb-2">Sub-Status</h4>
                        <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                            {form.subStatuses.map((sub, index) => (
                                <div key={index} className="p-3 bg-brand-bg rounded-lg grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                                    <div className="input-group !mt-0"><input type="text" name="name" value={sub.name} onChange={e => handleSubStatusChange(index, e)} placeholder="Nama Sub-Status" className="input-field !p-2 !text-sm"/></div>
                                    <div className="flex items-center gap-2">
                                        <div className="input-group flex-grow !mt-0"><input type="text" name="note" value={sub.note} onChange={e => handleSubStatusChange(index, e)} placeholder="Catatan" className="input-field !p-2 !text-sm"/></div>
                                        <button type="button" onClick={() => removeSubStatus(index)} className="p-2 text-brand-danger hover:bg-brand-danger/10 rounded-full"><Trash2Icon className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addSubStatus} className="text-sm font-semibold text-brand-accent hover:underline mt-2">+ Tambah Sub-Status</button>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-brand-border">
                        <button type="button" onClick={handleCloseModal} className="button-secondary">Batal</button>
                        <button type="submit" className="button-primary">{modalMode === 'add' ? 'Simpan Status' : 'Update Status'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

interface SettingsProps {
    profile: Profile;
    setProfile: React.Dispatch<React.SetStateAction<Profile>>;
    transactions: Transaction[];
    projects: Project[];
    packages: Package[];
    users: User[]; // This will now be pre-filtered by App.tsx
    setUsers: React.Dispatch<React.SetStateAction<User[]>>; // This updates the global user list
    currentUser: User | null;
}

const emptyUserForm = { 
    fullName: '', 
    email: '', 
    password: '', 
    confirmPassword: '', 
    role: 'Member' as User['role'],
    permissions: [] as ViewType[],
};

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

const Settings: React.FC<SettingsProps> = ({ profile, setProfile, transactions, projects, packages, users, setUsers, currentUser }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    // State for category management
    const [incomeCategoryInput, setIncomeCategoryInput] = useState('');
    const [editingIncomeCategory, setEditingIncomeCategory] = useState<string | null>(null);
    const [expenseCategoryInput, setExpenseCategoryInput] = useState('');
    const [editingExpenseCategory, setEditingExpenseCategory] = useState<string | null>(null);
    const [projectTypeInput, setProjectTypeInput] = useState('');
    const [editingProjectType, setEditingProjectType] = useState<string | null>(null);
    const [eventTypeInput, setEventTypeInput] = useState('');
    const [editingEventType, setEditingEventType] = useState<string | null>(null);
    const [sopCategoryInput, setSopCategoryInput] = useState('');
    const [editingSopCategory, setEditingSopCategory] = useState<string | null>(null);
    const [packageCategoryInput, setPackageCategoryInput] = useState('');
    const [editingPackageCategory, setEditingPackageCategory] = useState<string | null>(null);
    
    // State for user management
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [userModalMode, setUserModalMode] = useState<'add' | 'edit'>('add');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userForm, setUserForm] = useState(emptyUserForm);
    const [userFormError, setUserFormError] = useState('');


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };
    
    const handlePublicPageChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({
            ...prev,
            publicPageConfig: {
                ...prev.publicPageConfig,
                [name]: value
            }
        }));
    };
    
    const handleGalleryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files) as File[];
            const base64Promises = files.map((file: File) => toBase64(file));
            const base64Images = await Promise.all(base64Promises);
            setProfile(prev => ({
                ...prev,
                publicPageConfig: {
                    ...prev.publicPageConfig,
                    galleryImages: [...prev.publicPageConfig.galleryImages, ...base64Images]
                }
            }));
        }
    };

    const removeGalleryImage = (index: number) => {
        setProfile(prev => ({
            ...prev,
            publicPageConfig: {
                ...prev.publicPageConfig,
                galleryImages: prev.publicPageConfig.galleryImages.filter((_, i) => i !== index)
            }
        }));
    };


    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                alert("Ukuran file logo tidak boleh melebihi 2MB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfile(prev => ({ ...prev, logoBase64: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleNotificationChange = (key: keyof Profile['notificationSettings']) => {
        setProfile(p => ({
            ...p,
            notificationSettings: {
                ...p.notificationSettings,
                [key]: !p.notificationSettings[key]
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveError('');
        try {
            const updated = await upsertProfile(profile);
            setProfile(updated);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err: any) {
            console.error('[Settings] Save profile failed:', err);
            setSaveError(err?.message || 'Gagal menyimpan profil.');
        } finally {
            setIsSaving(false);
        }
    }
    
    // --- User Management Handlers ---
    const handleOpenUserModal = (mode: 'add' | 'edit', user: User | null = null) => {
        setUserModalMode(mode);
        setSelectedUser(user);
        if (mode === 'edit' && user) {
            setUserForm({
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                password: '',
                confirmPassword: '',
                permissions: user.permissions || [],
            });
        } else {
            setUserForm(emptyUserForm);
        }
        setUserFormError('');
        setIsUserModalOpen(true);
    };

    const handleCloseUserModal = () => {
        setIsUserModalOpen(false);
        setSelectedUser(null);
        setUserForm(emptyUserForm);
        setUserFormError('');
    };

    const handleUserFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setUserForm(prev => ({ ...prev, [name]: value }));
    };
    
    const handlePermissionsChange = (view: ViewType, checked: boolean) => {
        setUserForm(prev => {
            const currentPermissions = new Set(prev.permissions);
            if (checked) {
                currentPermissions.add(view);
            } else {
                currentPermissions.delete(view);
            }
            return { ...prev, permissions: Array.from(currentPermissions) };
        });
    };
    
    const handleUserFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUserFormError('');

        if (userForm.password && userForm.password !== userForm.confirmPassword) {
            setUserFormError('Konfirmasi kata sandi tidak cocok.');
            return;
        }

        try {
            if (userModalMode === 'add') {
                if (!userForm.email || !userForm.password || !userForm.fullName) {
                    setUserFormError('Nama, email, dan kata sandi wajib diisi.');
                    return;
                }
                if (users.some(u => u.email === userForm.email)) {
                    setUserFormError('Email sudah digunakan di dalam vendor ini.');
                    return;
                }
                if (!currentUser) {
                    setUserFormError('Tidak dapat membuat pengguna: sesi tidak valid.');
                    return;
                }
                
                const newUserData = {
                    fullName: userForm.fullName,
                    email: userForm.email,
                    password: userForm.password,
                    role: userForm.role,
                    permissions: userForm.role === 'Member' ? userForm.permissions : undefined,
                };
                const created = await createUser(newUserData);
                setUsers(prev => [...prev, created]);
            } else if (userModalMode === 'edit' && selectedUser) {
                if (users.some(u => u.email === userForm.email && u.id !== selectedUser.id)) {
                    setUserFormError('Email sudah digunakan oleh pengguna lain.');
                    return;
                }
                
                const updateData: any = {
                    fullName: userForm.fullName,
                    email: userForm.email,
                    role: userForm.role,
                    permissions: userForm.role === 'Member' ? userForm.permissions : undefined,
                };
                if (userForm.password) {
                    updateData.password = userForm.password;
                }
                
                const updated = await updateUser(selectedUser.id, updateData);
                setUsers(prev => prev.map(u => u.id === selectedUser.id ? updated : u));
            }
            handleCloseUserModal();
        } catch (err: any) {
            console.error('[Settings] User operation failed:', err);
            setUserFormError(err?.message || 'Gagal menyimpan pengguna.');
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (userId === currentUser?.id) {
            alert("Anda tidak dapat menghapus akun Anda sendiri.");
            return;
        }
        if (window.confirm("Apakah Anda yakin ingin menghapus pengguna ini?")) {
            try {
                await deleteUser(userId);
                setUsers(prev => prev.filter(u => u.id !== userId));
            } catch (err: any) {
                console.error('[Settings] Delete user failed:', err);
                alert('Gagal menghapus pengguna: ' + (err?.message || 'Coba lagi.'));
            }
        }
    };
    
    // --- Category Management Handlers ---
    const handleAddOrUpdateIncomeCategory = async () => {
        if (!incomeCategoryInput.trim()) return;
        const newCategory = incomeCategoryInput.trim();
        const categories = profile.incomeCategories || [];

        let newCategories: string[];
        if (editingIncomeCategory) { // Update
            if (newCategory !== editingIncomeCategory && categories.includes(newCategory)) {
                alert('Kategori ini sudah ada.'); return;
            }
            newCategories = categories.map(c => c === editingIncomeCategory ? newCategory : c).sort();
            setEditingIncomeCategory(null);
        } else { // Add
            if (categories.includes(newCategory)) {
                alert('Kategori ini sudah ada.'); return;
            }
            newCategories = [...categories, newCategory].sort();
        }
        
        try {
            const updated = await upsertProfile({ id: profile.id, incomeCategories: newCategories });
            setProfile(updated);
            setIncomeCategoryInput('');
        } catch (err: any) {
            console.error('[Settings] Save income category failed:', err);
            alert('Gagal menyimpan kategori: ' + (err?.message || 'Coba lagi.'));
        }
    };

    const handleEditIncomeCategory = (category: string) => { setEditingIncomeCategory(category); setIncomeCategoryInput(category); };
    const handleDeleteIncomeCategory = async (category: string) => {
        const isCategoryInUse = transactions.some(t => t.category === category && t.type === 'Pemasukan');
        if (isCategoryInUse) {
            alert(`Kategori "${category}" tidak dapat dihapus karena sedang digunakan dalam transaksi.`); return;
        }
        if (window.confirm(`Yakin ingin menghapus kategori "${category}"?`)) {
            const newCategories = (profile.incomeCategories || []).filter(c => c !== category);
            try {
                const updated = await upsertProfile({ id: profile.id, incomeCategories: newCategories });
                setProfile(updated);
            } catch (err: any) {
                console.error('[Settings] Delete income category failed:', err);
                alert('Gagal menghapus kategori: ' + (err?.message || 'Coba lagi.'));
            }
        }
    };
    
    const handleAddOrUpdateExpenseCategory = async () => {
        if (!expenseCategoryInput.trim()) return;
        const newCategory = expenseCategoryInput.trim();
        const categories = profile.expenseCategories || [];
        
        let newCategories: string[];
        if (editingExpenseCategory) {
            if (newCategory !== editingExpenseCategory && categories.includes(newCategory)) {
                alert('Kategori ini sudah ada.'); return;
            }
            newCategories = categories.map(c => c === editingExpenseCategory ? newCategory : c).sort();
            setEditingExpenseCategory(null);
        } else {
            if (categories.includes(newCategory)) {
                alert('Kategori ini sudah ada.'); return;
            }
            newCategories = [...categories, newCategory].sort();
        }
        
        try {
            const updated = await upsertProfile({ id: profile.id, expenseCategories: newCategories });
            setProfile(updated);
            setExpenseCategoryInput('');
        } catch (err: any) {
            console.error('[Settings] Save expense category failed:', err);
            alert('Gagal menyimpan kategori: ' + (err?.message || 'Coba lagi.'));
        }
    };
    
    const handleEditExpenseCategory = (category: string) => { setEditingExpenseCategory(category); setExpenseCategoryInput(category); };
    const handleDeleteExpenseCategory = async (category: string) => {
        const isCategoryInUse = transactions.some(t => t.category === category && t.type === 'Pengeluaran');
        if (isCategoryInUse) {
            alert(`Kategori "${category}" tidak dapat dihapus karena sedang digunakan dalam transaksi.`); return;
        }
        if (window.confirm(`Yakin ingin menghapus kategori "${category}"?`)) {
            const newCategories = (profile.expenseCategories || []).filter(c => c !== category);
            try {
                const updated = await upsertProfile({ id: profile.id, expenseCategories: newCategories });
                setProfile(updated);
            } catch (err: any) {
                console.error('[Settings] Delete expense category failed:', err);
                alert('Gagal menghapus kategori: ' + (err?.message || 'Coba lagi.'));
            }
        }
    };

    const handleAddOrUpdateProjectType = async () => {
        if (!projectTypeInput.trim()) return;
        const newType = projectTypeInput.trim();
        const types = profile.projectTypes || [];
        let newTypes: string[];
        if (editingProjectType) {
            if (newType !== editingProjectType && types.includes(newType)) { alert('Jenis proyek ini sudah ada.'); return; }
            newTypes = types.map(t => t === editingProjectType ? newType : t).sort();
        } else {
            if (types.includes(newType)) { alert('Jenis proyek ini sudah ada.'); return; }
            newTypes = [...types, newType].sort();
        }
        try {
            const updated = await upsertProfile({ id: profile.id, projectTypes: newTypes } as any);
            setProfile(updated);
            setEditingProjectType(null);
            setProjectTypeInput('');
        } catch (err: any) {
            console.error('[Settings] Save project type failed:', err);
            alert('Gagal menyimpan jenis proyek: ' + (err?.message || 'Coba lagi.'));
        }
    };

    const handleEditProjectType = (type: string) => { setEditingProjectType(type); setProjectTypeInput(type); };
    const handleDeleteProjectType = async (type: string) => {
        const isTypeInUse = projects.some(p => p.projectType === type);
        if (isTypeInUse) { alert(`Jenis proyek "${type}" tidak dapat dihapus karena sedang digunakan.`); return; }
        if (window.confirm(`Yakin ingin menghapus jenis proyek "${type}"?`)) {
            const newTypes = (profile.projectTypes || []).filter(t => t !== type);
            try {
                const updated = await upsertProfile({ id: profile.id, projectTypes: newTypes } as any);
                setProfile(updated);
            } catch (err: any) {
                console.error('[Settings] Delete project type failed:', err);
                alert('Gagal menghapus jenis proyek: ' + (err?.message || 'Coba lagi.'));
            }
        }
    };

    const handleAddOrUpdateEventType = async () => {
        if (!eventTypeInput.trim()) return;
        const newType = eventTypeInput.trim();
        const types = profile.eventTypes || [];
        let newTypes: string[];
        if (editingEventType) {
            if (newType !== editingEventType && types.includes(newType)) { alert('Jenis acara ini sudah ada.'); return; }
            newTypes = types.map(t => t === editingEventType ? newType : t).sort();
        } else {
            if (types.includes(newType)) { alert('Jenis acara ini sudah ada.'); return; }
            newTypes = [...types, newType].sort();
        }
        try {
            const updated = await upsertProfile({ id: profile.id, eventTypes: newTypes } as any);
            setProfile(updated);
            setEditingEventType(null);
            setEventTypeInput('');
        } catch (err: any) {
            console.error('[Settings] Save event type failed:', err);
            alert('Gagal menyimpan jenis acara: ' + (err?.message || 'Coba lagi.'));
        }
    };
    const handleEditEventType = (type: string) => { setEditingEventType(type); setEventTypeInput(type); };
    const handleDeleteEventType = async (type: string) => {
        const isTypeInUse = projects.some(p => p.clientName === 'Acara Internal' && p.projectType === type);
        if (isTypeInUse) { alert(`Jenis acara "${type}" tidak dapat dihapus karena sedang digunakan di kalender.`); return; }
        if (window.confirm(`Yakin ingin menghapus jenis acara "${type}"?`)) {
            const newTypes = (profile.eventTypes || []).filter(t => t !== type);
            try {
                const updated = await upsertProfile({ id: profile.id, eventTypes: newTypes } as any);
                setProfile(updated);
            } catch (err: any) {
                console.error('[Settings] Delete event type failed:', err);
                alert('Gagal menghapus jenis acara: ' + (err?.message || 'Coba lagi.'));
            }
        }
    };

    const handleAddOrUpdateSopCategory = async () => {
        if (!sopCategoryInput.trim()) return;
        const newCat = sopCategoryInput.trim();
        const cats = profile.sopCategories || [];
        let newCats: string[];
        if (editingSopCategory) {
            if (newCat !== editingSopCategory && cats.includes(newCat)) { alert('Kategori ini sudah ada.'); return; }
            newCats = cats.map(c => c === editingSopCategory ? newCat : c).sort();
        } else {
            if (cats.includes(newCat)) { alert('Kategori ini sudah ada.'); return; }
            newCats = [...cats, newCat].sort();
        }
        try {
            const updated = await upsertProfile({ id: profile.id, sopCategories: newCats } as any);
            setProfile(updated);
            setEditingSopCategory(null);
            setSopCategoryInput('');
        } catch (err: any) {
            console.error('[Settings] Save SOP category failed:', err);
            alert('Gagal menyimpan kategori SOP: ' + (err?.message || 'Coba lagi.'));
        }
    };
    const handleEditSopCategory = (cat: string) => { setEditingSopCategory(cat); setSopCategoryInput(cat); };
    const handleDeleteSopCategory = async (cat: string) => {
        // Not checking for usage in SOPs for now to keep it simple.
        if (window.confirm(`Yakin ingin menghapus kategori SOP "${cat}"?`)) {
            const newCats = (profile.sopCategories || []).filter(c => c !== cat);
            try {
                const updated = await upsertProfile({ id: profile.id, sopCategories: newCats } as any);
                setProfile(updated);
            } catch (err: any) {
                console.error('[Settings] Delete SOP category failed:', err);
                alert('Gagal menghapus kategori SOP: ' + (err?.message || 'Coba lagi.'));
            }
        }
    };
    
    const handleAddOrUpdatePackageCategory = async () => {
        if (!packageCategoryInput.trim()) return;
        const newCat = packageCategoryInput.trim();
        const cats = profile.packageCategories || [];
        let newCats: string[];
        if (editingPackageCategory) {
            if (newCat !== editingPackageCategory && cats.includes(newCat)) { alert('Kategori ini sudah ada.'); return; }
            newCats = cats.map(c => c === editingPackageCategory ? newCat : c).sort();
        } else {
            if (cats.includes(newCat)) { alert('Kategori ini sudah ada.'); return; }
            newCats = [...cats, newCat].sort();
        }
        try {
            const updated = await upsertProfile({ id: profile.id, packageCategories: newCats } as any);
            setProfile(updated);
            setEditingPackageCategory(null);
            setPackageCategoryInput('');
        } catch (err: any) {
            console.error('[Settings] Save package category failed:', err);
            alert('Gagal menyimpan kategori paket: ' + (err?.message || 'Coba lagi.'));
        }
    };
    const handleEditPackageCategory = (cat: string) => { setEditingPackageCategory(cat); setPackageCategoryInput(cat); };
    const handleDeletePackageCategory = async (cat: string) => {
        const isUsed = packages.some(p => p.category === cat);
        if (isUsed) { alert(`Kategori "${cat}" tidak dapat dihapus karena sedang digunakan oleh paket.`); return; }
        if (window.confirm(`Yakin ingin menghapus kategori paket "${cat}"?`)) {
            const newCats = (profile.packageCategories || []).filter(c => c !== cat);
            try {
                const updated = await upsertProfile({ id: profile.id, packageCategories: newCats } as any);
                setProfile(updated);
            } catch (err: any) {
                console.error('[Settings] Delete package category failed:', err);
                alert('Gagal menghapus kategori paket: ' + (err?.message || 'Coba lagi.'));
            }
        }
    };
    
    const tabs = [
        { id: 'profile', label: 'Profil Saya', icon: UsersIcon, adminOnly: false },
        { id: 'publicPage', label: 'Halaman Publik', icon: Share2Icon, adminOnly: false },
        { id: 'users', label: 'Pengguna', icon: KeyIcon, adminOnly: true },
        { id: 'categories', label: 'Kustomisasi Kategori', icon: ListIcon, adminOnly: false },
        { id: 'projectStatus', label: 'Status Proyek', icon: FolderKanbanIcon, adminOnly: true },
    ];

    const placeholderDataExample = {
        contractNumber: "VP/CTR/2024/001", signingDate: "1 Januari 2024", vendorCompanyName: "Vena Pictures", clientName1: "Budi Santoso", projectName: "Pernikahan Budi & Sinta", projectDate: "14 Februari 2024", totalCost: "Rp 12.000.000", dpAmount: "Rp 6.000.000",
    };

    const renderTabContent = () => {
        switch(activeTab) {
            case 'profile':
                 return (
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-brand-text-light border-b border-gray-700/50 pb-3">Informasi Publik</h3>
                            <div className="space-y-4 max-w-2xl mx-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <div className="input-group"><input id="fullName" type="text" name="fullName" value={profile.fullName || ''} onChange={handleInputChange} className="input-field" placeholder=" "/><label htmlFor="fullName" className="input-label">Nama Lengkap</label></div>
                                    <div className="input-group"><input id="companyName" type="text" name="companyName" value={profile.companyName || ''} onChange={handleInputChange} className="input-field" placeholder=" "/><label htmlFor="companyName" className="input-label">Nama Perusahaan</label></div>
                                    <div className="input-group"><input id="email" type="email" name="email" value={profile.email || ''} onChange={handleInputChange} className="input-field" placeholder=" "/><label htmlFor="email" className="input-label">Email</label></div>
                                    <div className="input-group"><input id="phone" type="tel" name="phone" value={profile.phone || ''} onChange={handleInputChange} className="input-field" placeholder=" "/><label htmlFor="phone" className="input-label">Telepon</label></div>
                                    <div className="input-group"><input id="website" type="url" name="website" value={profile.website || ''} onChange={handleInputChange} className="input-field" placeholder=" "/><label htmlFor="website" className="input-label">Website</label></div>
                                </div>
                                <div className="input-group"><input id="address" type="text" name="address" value={profile.address || ''} onChange={handleInputChange} className="input-field" placeholder=" "/><label htmlFor="address" className="input-label">Alamat</label></div>
                                <div className="input-group"><input id="bankAccount" type="text" name="bankAccount" value={profile.bankAccount || ''} onChange={handleInputChange} className="input-field" placeholder=" "/><label htmlFor="bankAccount" className="input-label">Rekening Bank</label></div>
                                <div className="input-group"><input id="authorizedSigner" type="text" name="authorizedSigner" value={profile.authorizedSigner} onChange={handleInputChange} className="input-field" placeholder=" "/><label htmlFor="authorizedSigner" className="input-label">Nama Penanggung Jawab Tanda Tangan</label></div>
                                <div className="input-group"><input id="idNumber" type="text" name="idNumber" value={profile.idNumber || ''} onChange={handleInputChange} className="input-field" placeholder=" "/><label htmlFor="idNumber" className="input-label">No. KTP Penanggung Jawab</label></div>
                                <div className="input-group"><textarea id="bio" name="bio" value={profile.bio} onChange={handleInputChange} className="input-field" placeholder=" " rows={3}></textarea><label htmlFor="bio" className="input-label">Bio Perusahaan</label></div>
                                <div className="input-group"><textarea id="briefingTemplate" name="briefingTemplate" value={profile.briefingTemplate} onChange={handleInputChange} className="input-field" placeholder=" " rows={3}></textarea><label htmlFor="briefingTemplate" className="input-label">Template Pesan Briefing Tim</label></div>
                            </div>

                            <h3 className="text-lg font-semibold text-brand-text-light border-b border-gray-700/50 pb-3 mt-8">Branding & Kustomisasi</h3>
                            <div className="space-y-4 max-w-2xl mx-auto">
                                <div>
                                    <label htmlFor="logoUpload" className="text-sm font-medium text-brand-text-secondary">Logo Perusahaan (u/ Invoice)</label>
                                    <div className="mt-2 flex items-center gap-4">
                                        {profile.logoBase64 ? 
                                            <img src={profile.logoBase64} alt="Logo preview" className="h-16 w-16 object-contain rounded-md bg-brand-bg p-1 border border-brand-border" />
                                            : <div className="h-16 w-16 rounded-md bg-brand-bg border border-brand-border flex items-center justify-center text-xs text-brand-text-secondary">No Logo</div>
                                        }
                                        <input 
                                            id="logoUpload" 
                                            type="file" 
                                            name="logoBase64" 
                                            onChange={handleLogoChange} 
                                            className="block w-full text-sm text-brand-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-accent/10 file:text-brand-accent hover:file:bg-brand-accent/20 cursor-pointer" 
                                            accept="image/png, image/jpeg, image/svg+xml" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="brandColor" className="text-sm font-medium text-brand-text-secondary">Warna Aksen Merek</label>
                                    <div className="mt-2 flex items-center gap-4">
                                        <div className="relative">
                                            <input
                                                id="brandColor"
                                                type="color"
                                                name="brandColor"
                                                value={profile.brandColor || '#3b82f6'}
                                                onChange={handleInputChange}
                                                className="w-16 h-10 p-1 bg-brand-bg border border-brand-border rounded-md cursor-pointer"
                                            />
                                        </div>
                                        <p className="text-sm text-brand-text-secondary">Pilih warna yang mewakili merek Anda. Warna ini akan diterapkan di seluruh aplikasi, portal klien, dan dokumen.</p>
                                    </div>
                                </div>
                                <div className="input-group !mt-6"><textarea id="termsAndConditions" name="termsAndConditions" value={profile.termsAndConditions || ''} onChange={handleInputChange} className="input-field" placeholder=" " rows={15}></textarea><label htmlFor="termsAndConditions" className="input-label">Syarat & Ketentuan (u/ Invoice)</label></div>
                                 <div className="input-group !mt-6">
                                    <textarea id="contractTemplate" name="contractTemplate" value={profile.contractTemplate || ''} onChange={handleInputChange} className="input-field" placeholder=" " rows={15}></textarea>
                                    <label htmlFor="contractTemplate" className="input-label">Template Kontrak Kerja</label>
                                    <div>
                                        <p className="text-xs text-brand-text-secondary mt-1">Gunakan placeholder seperti {`{projectName}`} atau {`{clientName1}`} untuk mengisi data secara otomatis.</p>
                                        <div title={`Daftar Placeholder: ${Object.keys(placeholderDataExample).join(', ')}`} className="text-xs text-brand-accent hover:underline cursor-help">
                                            Lihat Placeholder yang Tersedia
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-lg font-semibold text-brand-text-light border-b border-gray-700/50 pb-3 mt-8">Notifikasi</h3>
                            <div className="space-y-4 max-w-2xl mx-auto">
                                <div className="flex justify-between items-center"><label htmlFor="notif-newProject">Proyek Baru Dibuat</label><ToggleSwitch id="notif-newProject" enabled={profile.notificationSettings.newProject} onChange={() => handleNotificationChange('newProject')} /></div>
                                <div className="flex justify-between items-center"><label htmlFor="notif-paymentConfirmation">Konfirmasi Pembayaran Diterima</label><ToggleSwitch id="notif-paymentConfirmation" enabled={profile.notificationSettings.paymentConfirmation} onChange={() => handleNotificationChange('paymentConfirmation')} /></div>
                                <div className="flex justify-between items-center"><label htmlFor="notif-deadlineReminder">Pengingat Deadline Proyek</label><ToggleSwitch id="notif-deadlineReminder" enabled={profile.notificationSettings.deadlineReminder} onChange={() => handleNotificationChange('deadlineReminder')} /></div>
                            </div>

                            <h3 className="text-lg font-semibold text-brand-text-light border-b border-gray-700/50 pb-3 mt-8">Keamanan</h3>
                            <div className="space-y-4 max-w-2xl mx-auto">
                                <div className="flex justify-between items-center"><label htmlFor="security-2fa">Autentikasi Dua Faktor (2FA)</label><ToggleSwitch id="security-2fa" enabled={profile.securitySettings.twoFactorEnabled} onChange={() => setProfile(p => ({ ...p, securitySettings: { ...p.securitySettings, twoFactorEnabled: !p.securitySettings.twoFactorEnabled } }))} /></div>
                            </div>

                            <div className="text-right mt-8 pt-6 border-t border-gray-700/50">
                                <button type="submit" className="button-primary relative">
                                    Simpan Perubahan
                                    {showSuccess && <span className="absolute -right-4 -top-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full animate-fade-in-out">✓</span>}
                                </button>
                            </div>
                        </div>
                    </form>
                );
            case 'publicPage':
                return (
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-brand-text-light border-b border-gray-700/50 pb-3">Desain Halaman Paket Publik</h3>
                            
                            {/* Template Selector */}
                            <div>
                                <label className="text-sm font-medium text-brand-text-secondary">Pilih Template</label>
                                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {(['classic', 'modern', 'gallery'] as const).map(template => (
                                        <div key={template} onClick={() => handlePublicPageChange({ target: { name: 'template', value: template } } as any)} className={`p-2 rounded-lg border-2 cursor-pointer ${profile.publicPageConfig.template === template ? 'border-brand-accent' : 'border-transparent'}`}>
                                            <div className="bg-brand-bg h-24 rounded-md flex items-center justify-center text-xs text-brand-text-secondary capitalize font-semibold border border-brand-border">{template}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Text */}
                            <div className="space-y-4">
                                <div className="input-group"><input type="text" id="publicTitle" name="title" value={profile.publicPageConfig.title} onChange={handlePublicPageChange} className="input-field" placeholder=" "/><label htmlFor="publicTitle" className="input-label">Judul Halaman</label></div>
                                <div className="input-group"><textarea id="publicIntro" name="introduction" value={profile.publicPageConfig.introduction} onChange={handlePublicPageChange} className="input-field" placeholder=" " rows={4}></textarea><label htmlFor="publicIntro" className="input-label">Teks Perkenalan</label></div>
                            </div>
                            
                            {/* Gallery Uploader */}
                            <div>
                                <label className="text-sm font-medium text-brand-text-secondary">Galeri Foto</label>
                                <div className="mt-2 p-4 border border-dashed border-brand-border rounded-lg">
                                    <input type="file" id="galleryUpload" multiple onChange={handleGalleryImageUpload} accept="image/*" className="block w-full text-sm text-brand-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-accent/10 file:text-brand-accent hover:file:bg-brand-accent/20 cursor-pointer"/>
                                    <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                        {profile.publicPageConfig.galleryImages.map((img, index) => (
                                            <div key={index} className="relative group">
                                                <img src={img} alt={`Gallery image ${index + 1}`} className="w-full h-24 object-cover rounded-md" />
                                                <button type="button" onClick={() => removeGalleryImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2Icon className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                             <div className="text-right mt-8 pt-6 border-t border-gray-700/50">
                                <button type="submit" className="button-primary relative">
                                    Simpan Pengaturan Halaman
                                    {showSuccess && <span className="absolute -right-4 -top-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full animate-fade-in-out">✓</span>}
                                </button>
                            </div>
                        </div>
                    </form>
                );
            case 'users':
                if (currentUser?.role !== 'Admin') return <p>Anda tidak memiliki akses ke halaman ini.</p>;
                return (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-brand-text-light">Manajemen Pengguna</h3>
                            <button onClick={() => handleOpenUserModal('add')} className="button-primary inline-flex items-center gap-2"><PlusIcon className="w-5 h-5"/>Tambah Pengguna</button>
                        </div>
                        <div className="space-y-3">
                            {users.map(user => (
                                <div key={user.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-brand-text-light">{user.fullName}</p>
                                        <p className="text-sm text-brand-text-secondary">{user.email} - <span className="font-medium">{user.role}</span></p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleOpenUserModal('edit', user)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Edit"><PencilIcon className="w-5 h-5"/></button>
                                        <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Hapus"><Trash2Icon className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'categories':
                return (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <CategoryManager 
                            title="Kategori Pemasukan"
                            categories={profile.incomeCategories}
                            inputValue={incomeCategoryInput}
                            onInputChange={setIncomeCategoryInput}
                            onAddOrUpdate={handleAddOrUpdateIncomeCategory}
                            onEdit={handleEditIncomeCategory}
                            onDelete={handleDeleteIncomeCategory}
                            editingValue={editingIncomeCategory}
                            onCancelEdit={() => { setEditingIncomeCategory(null); setIncomeCategoryInput(''); }}
                            placeholder="e.g., DP Proyek"
                        />
                         <CategoryManager 
                            title="Kategori Pengeluaran"
                            categories={profile.expenseCategories}
                            inputValue={expenseCategoryInput}
                            onInputChange={setExpenseCategoryInput}
                            onAddOrUpdate={handleAddOrUpdateExpenseCategory}
                            onEdit={handleEditExpenseCategory}
                            onDelete={handleDeleteExpenseCategory}
                            editingValue={editingExpenseCategory}
                            onCancelEdit={() => { setEditingExpenseCategory(null); setExpenseCategoryInput(''); }}
                            placeholder="e.g., Gaji Freelancer"
                        />
                         <CategoryManager 
                            title="Jenis Proyek"
                            categories={profile.projectTypes}
                            inputValue={projectTypeInput}
                            onInputChange={setProjectTypeInput}
                            onAddOrUpdate={handleAddOrUpdateProjectType}
                            onEdit={handleEditProjectType}
                            onDelete={handleDeleteProjectType}
                            editingValue={editingProjectType}
                            onCancelEdit={() => { setEditingProjectType(null); setProjectTypeInput(''); }}
                            placeholder="e.g., Pernikahan"
                        />
                          <CategoryManager 
                            title="Jenis Acara Internal"
                            categories={profile.eventTypes}
                            inputValue={eventTypeInput}
                            onInputChange={setEventTypeInput}
                            onAddOrUpdate={handleAddOrUpdateEventType}
                            onEdit={handleEditEventType}
                            onDelete={handleDeleteEventType}
                            editingValue={editingEventType}
                            onCancelEdit={() => { setEditingEventType(null); setEventTypeInput(''); }}
                            placeholder="e.g., Meeting Klien"
                        />
                        <CategoryManager
                            title="Kategori SOP"
                            categories={profile.sopCategories}
                            inputValue={sopCategoryInput}
                            onInputChange={setSopCategoryInput}
                            onAddOrUpdate={handleAddOrUpdateSopCategory}
                            onEdit={handleEditSopCategory}
                            onDelete={handleDeleteSopCategory}
                            editingValue={editingSopCategory}
                            onCancelEdit={() => { setEditingSopCategory(null); setSopCategoryInput(''); }}
                            placeholder="e.g., Fotografi"
                        />
                        <CategoryManager
                            title="Kategori Paket"
                            categories={profile.packageCategories || []}
                            inputValue={packageCategoryInput}
                            onInputChange={setPackageCategoryInput}
                            onAddOrUpdate={handleAddOrUpdatePackageCategory}
                            onEdit={handleEditPackageCategory}
                            onDelete={handleDeletePackageCategory}
                            editingValue={editingPackageCategory}
                            onCancelEdit={() => { setEditingPackageCategory(null); setPackageCategoryInput(''); }}
                            placeholder="e.g., Pernikahan"
                        />
                    </div>
                );
            case 'projectStatus':
                 if (currentUser?.role !== 'Admin') return <p>Anda tidak memiliki akses ke halaman ini.</p>;
                return (
                    <ProjectStatusManager
                        config={profile.projectStatusConfig}
                        onConfigChange={(newConfig) => setProfile(prev => ({ ...prev, projectStatusConfig: newConfig }))}
                        projects={projects}
                        profile={profile}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Pengaturan" subtitle="Kelola profil, pengguna, dan kustomisasi aplikasi Anda." />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <aside className="lg:col-span-1">
                    <nav className="space-y-1 sticky top-24">
                        {tabs
                            .filter(tab => !(tab.adminOnly && currentUser?.role !== 'Admin'))
                            .map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-200 text-left ${
                                        activeTab === tab.id
                                            ? 'bg-brand-accent text-white'
                                            : 'text-brand-text-secondary hover:bg-brand-input hover:text-brand-text-light'
                                    }`}
                                >
                                    <tab.icon className="w-5 h-5 mr-3" />
                                    {tab.label}
                                </button>
                        ))}
                    </nav>
                </aside>
                <main className="lg:col-span-3 bg-brand-surface p-6 rounded-2xl shadow-lg min-h-[60vh]">
                    {renderTabContent()}
                </main>
            </div>
    
            <Modal isOpen={isUserModalOpen} onClose={handleCloseUserModal} title={userModalMode === 'add' ? 'Tambah Pengguna Baru' : 'Edit Pengguna'}>
                <form onSubmit={handleUserFormSubmit} className="space-y-4">
                    {userFormError && <p className="text-red-500 text-sm bg-red-500/10 p-3 rounded-md">{userFormError}</p>}
                    <div className="input-group"><input type="text" name="fullName" value={userForm.fullName} onChange={handleUserFormChange} className="input-field" placeholder=" " required /><label className="input-label">Nama Lengkap</label></div>
                    <div className="input-group"><input type="email" name="email" value={userForm.email} onChange={handleUserFormChange} className="input-field" placeholder=" " required /><label className="input-label">Email</label></div>
                    <div className="input-group"><input type="password" name="password" value={userForm.password} onChange={handleUserFormChange} className="input-field" placeholder=" " required={userModalMode === 'add'} /><label className="input-label">{userModalMode === 'add' ? 'Kata Sandi' : 'Kata Sandi Baru (kosongkan jika tidak berubah)'}</label></div>
                    <div className="input-group"><input type="password" name="confirmPassword" value={userForm.confirmPassword} onChange={handleUserFormChange} className="input-field" placeholder=" " required={!!userForm.password} /><label className="input-label">Konfirmasi Kata Sandi</label></div>
                    <div className="input-group"><select name="role" value={userForm.role} onChange={handleUserFormChange} className="input-field"><option value="Member">Member</option><option value="Admin">Admin</option></select><label className="input-label">Peran</label></div>
                    
                    {userForm.role === 'Member' && (
                        <div>
                            <h4 className="text-sm font-medium text-brand-text-secondary mb-2">Izin Akses Halaman</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-brand-bg rounded-lg">
                                {NAV_ITEMS.filter(item => item.view !== ViewType.SETTINGS).map(item => (
                                    <label key={item.view} className="flex items-center gap-2 p-2 rounded-md hover:bg-brand-input cursor-pointer">
                                        <input type="checkbox" checked={userForm.permissions.includes(item.view)} onChange={e => handlePermissionsChange(item.view, e.target.checked)} />
                                        <span className="text-sm">{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-6 border-t border-brand-border">
                        <button type="button" onClick={handleCloseUserModal} className="button-secondary">Batal</button>
                        <button type="submit" className="button-primary">{userModalMode === 'add' ? 'Simpan Pengguna' : 'Update Pengguna'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Settings;