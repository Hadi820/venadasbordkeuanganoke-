import React, { useState, useMemo } from 'react';
import { SocialMediaPost, PostStatus, PostType, Project } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import StatCard from './StatCard';
import { PlusIcon, CalendarIcon, CheckSquareIcon, Share2Icon, PencilIcon, ChevronLeftIcon, ChevronRightIcon, LayoutGridIcon, SparkleIcon } from '../constants';
import { GoogleGenAI, Type } from "@google/genai";
import { createSocialPost, updateSocialPost, deleteSocialPost } from '../services/socialPosts';

const formatShortDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

const isUuid = (v?: string) => !!v && /^[0-9a-fA-F-]{36}$/.test(v);

const getStatusColorClass = (status: PostStatus) => {
    switch(status) {
        case PostStatus.DRAFT: return 'border-gray-500';
        case PostStatus.SCHEDULED: return 'border-blue-500';
        case PostStatus.POSTED: return 'border-green-500';
        case PostStatus.CANCELED: return 'border-red-500';
        default: return 'border-gray-500';
    }
}

const getPlatformIcon = (platform: 'Instagram' | 'TikTok' | 'Website') => {
    if (platform === 'Instagram') return '📷';
    if (platform === 'TikTok') return '🎵';
    if (platform === 'Website') return '🌐';
    return '🔗';
};

const initialFormState: Omit<SocialMediaPost, 'id' | 'clientName' | 'platform'> = {
    projectId: '',
    postType: PostType.INSTAGRAM_FEED,
    scheduledDate: new Date().toISOString().split('T')[0],
    caption: '',
    mediaUrl: '',
    status: PostStatus.DRAFT,
    notes: '',
};

// --- New Calendar View Component ---
const PostCalendarView: React.FC<{
    posts: SocialMediaPost[];
    onPostClick: (post: SocialMediaPost) => void;
    onDayClick: (date: Date) => void;
}> = ({ posts, onPostClick, onDayClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const daysInMonth = useMemo(() => {
        const days = [];
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        const endDate = new Date(lastDayOfMonth);
        endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

        let date = startDate;
        while (date <= endDate) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    }, [currentDate]);

    const postsByDate = useMemo(() => {
        const map = new Map<string, SocialMediaPost[]>();
        posts.forEach(post => {
            if (post.status === PostStatus.SCHEDULED || post.status === PostStatus.POSTED) {
                const dateKey = new Date(post.scheduledDate).toDateString();
                if (!map.has(dateKey)) {
                    map.set(dateKey, []);
                }
                map.get(dateKey)!.push(post);
            }
        });
        return map;
    }, [posts]);

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const handleToday = () => setCurrentDate(new Date());
    
    const weekdays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    return (
        <div className="bg-brand-surface p-4 rounded-2xl shadow-lg border border-brand-border">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-brand-input"><ChevronLeftIcon className="w-5 h-5"/></button>
                    <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-brand-input"><ChevronRightIcon className="w-5 h-5"/></button>
                    <h2 className="text-lg font-semibold text-brand-text-light ml-2">{currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h2>
                </div>
                <button onClick={handleToday} className="button-secondary px-3 py-1.5 text-sm">Hari Ini</button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
                {weekdays.map(day => <div key={day} className="text-center py-2 text-xs font-bold text-brand-text-secondary border-b border-l border-brand-border">{day}</div>)}
                {daysInMonth.map((day, i) => {
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isToday = day.toDateString() === new Date().toDateString();
                    const events = postsByDate.get(day.toDateString()) || [];
                    return (
                        <div key={i} onClick={() => onDayClick(day)} className={`relative border-t border-l border-brand-border p-1.5 flex flex-col min-h-[120px] ${isCurrentMonth ? 'bg-brand-surface' : 'bg-brand-bg'} cursor-pointer hover:bg-brand-input transition-colors`}>
                            <span className={`text-xs font-semibold self-start mb-1 ${isCurrentMonth ? 'text-brand-text-light' : 'text-brand-text-secondary/50'} ${isToday ? 'bg-brand-accent text-white rounded-full w-5 h-5 flex items-center justify-center' : ''}`}>{day.getDate()}</span>
                            <div className="flex-grow space-y-1 overflow-hidden">
                                {events.slice(0, 3).map(event => (
                                    <div key={event.id} onClick={(e) => { e.stopPropagation(); onPostClick(event); }} className="text-xs p-1 rounded text-white truncate cursor-pointer" style={{ backgroundColor: event.status === PostStatus.POSTED ? '#16a34a' : '#3b82f6' }}>
                                        <p className="font-semibold truncate">{event.clientName}</p>
                                    </div>
                                ))}
                                {events.length > 3 && (
                                    <p className="text-xs text-brand-text-secondary text-center mt-1">+{events.length - 3} lagi</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

interface SocialPlannerProps {
    posts: SocialMediaPost[];
    setPosts: React.Dispatch<React.SetStateAction<SocialMediaPost[]>>;
    projects: Project[];
    showNotification: (message: string) => void;
}

export const SocialPlanner: React.FC<SocialPlannerProps> = ({ posts, setPosts, projects, showNotification }) => {
    const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedPost, setSelectedPost] = useState<SocialMediaPost | null>(null);
    const [formData, setFormData] = useState(initialFormState);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiCaptions, setAiCaptions] = useState<string[]>([]);
    const [isCaptionModalOpen, setIsCaptionModalOpen] = useState(false);

    const [viewMode, setViewMode] = useState<'kanban' | 'calendar'>('kanban');
    const [activeFilter, setActiveFilter] = useState<PostStatus | 'all'>('all');

    const stats = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const scheduledThisMonth = posts.filter(p => {
            const scheduledDate = new Date(p.scheduledDate);
            return p.status === PostStatus.SCHEDULED && scheduledDate >= startOfMonth && scheduledDate <= endOfMonth;
        }).length;
        
        const inDraft = posts.filter(p => p.status === PostStatus.DRAFT).length;
        const postedTotal = posts.filter(p => p.status === PostStatus.POSTED).length;

        return { scheduledThisMonth, inDraft, postedTotal };
    }, [posts]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, postId: string) => {
        e.dataTransfer.setData("postId", postId);
        setDraggedPostId(postId);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, newStatus: PostStatus) => {
        e.preventDefault();
        const postId = e.dataTransfer.getData("postId");
        const post = posts.find(p => p.id === postId);
        if (post) {
            try {
                if (isUuid(postId)) {
                    const updated = await updateSocialPost(postId, { status: newStatus });
                    setPosts(prev => prev.map(p => p.id === postId ? updated : p));
                } else {
                    // local-only item: update state saja
                    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: newStatus } : p));
                }
            } catch (err: any) {
                console.error('[Supabase][socialPosts.updateStatus] error:', err);
                alert(`Gagal memperbarui status postingan. ${err?.message || 'Coba lagi.'}`);
            }
        }
        setDraggedPostId(null);
        setActiveFilter('all'); // Reset filter after dropping
        if (post) showNotification(`Post untuk "${post.clientName}" dipindahkan ke "${newStatus}".`);
    };

    const handleOpenModal = (mode: 'add' | 'edit', post?: SocialMediaPost) => {
        setModalMode(mode);
        if (mode === 'edit' && post) {
            setSelectedPost(post);
            const { clientName, platform, ...rest } = post;
            setFormData(rest);
        } else {
            setSelectedPost(null);
            setFormData(initialFormState);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.projectId) {
            alert('Harap pilih proyek terlebih dahulu.');
            return;
        }

        const project = projects.find(p => p.id === formData.projectId);
        if (!project) {
            alert('Proyek tidak valid.');
            return;
        }

        let platform: SocialMediaPost['platform'] = 'Instagram';
        if (formData.postType === PostType.TIKTOK) platform = 'TikTok';
        if (formData.postType === PostType.BLOG) platform = 'Website';

        const postData: Omit<SocialMediaPost, 'id'> = {
            ...formData,
            clientName: project.clientName,
            platform,
        };
        // Jangan kirim projectId non-UUID ke Supabase
        if (!isUuid(postData.projectId)) {
            (postData as any).projectId = undefined;
        }

        try {
            if (modalMode === 'add') {
                const created = await createSocialPost(postData);
                setPosts(prev => [...prev, created]);
                showNotification('Postingan baru berhasil ditambahkan ke draf.');
            } else if (selectedPost) {
                try {
                    if (isUuid(selectedPost.id)) {
                        const updated = await updateSocialPost(selectedPost.id, postData);
                        setPosts(prev => prev.map(p => p.id === selectedPost.id ? updated : p));
                    } else {
                        // local-only: buat baru lalu replace
                        const created = await createSocialPost(postData);
                        setPosts(prev => prev.map(p => p.id === selectedPost.id ? created : p));
                        showNotification('Postingan baru berhasil dibuat (fallback).');
                    }
                    showNotification('Postingan berhasil diperbarui.');
                } catch (err: any) {
                    console.warn('[Supabase][socialPosts.update] gagal, fallback create. Detail:', err);
                    const created = await createSocialPost(postData);
                    setPosts(prev => prev.map(p => p.id === selectedPost.id ? created : p));
                    showNotification('Postingan baru berhasil dibuat (fallback).');
                }
            }
            handleCloseModal();
        } catch (err: any) {
            console.error('[Supabase][socialPosts.save] error:', err);
            alert(`Gagal menyimpan postingan. ${err?.message || 'Coba lagi.'}`);
        }
    };
    
    const handleDelete = async (postId: string) => {
        if(!window.confirm('Yakin ingin menghapus postingan ini?')) return;
        try {
            if (isUuid(postId)) {
                await deleteSocialPost(postId);
            }
            setPosts(prev => prev.filter(p => p.id !== postId));
            showNotification('Postingan berhasil dihapus.');
            handleCloseModal();
        } catch (err: any) {
            console.error('[Supabase][socialPosts.delete] error:', err);
            alert(`Gagal menghapus postingan. ${err?.message || 'Coba lagi.'}`);
        }
    }
    
    const handleDayClick = (date: Date) => {
        handleOpenModal('add');
        setFormData({
            ...initialFormState,
            scheduledDate: date.toISOString().split('T')[0]
        });
    };

    const handleGenerateCaption = async () => {
        if (!formData.projectId) {
            showNotification("Pilih proyek terlebih dahulu untuk membuat caption.");
            return;
        }

        const project = projects.find(p => p.id === formData.projectId);
        if (!project) {
            showNotification("Detail proyek tidak ditemukan.");
            return;
        }

        setIsGenerating(true);
        setAiCaptions([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                Based on the following photography project details, generate 3 creative and engaging social media caption options in Indonesian. The tone should be professional and celebratory.

                Project Details:
                - Client Names: ${project.clientName}
                - Event Type: ${project.projectType}
                - Location: ${project.location}

                Return the response as a JSON object with a single key 'captions' which is an array of strings. For example: {\"captions\": [\"caption 1\", \"caption 2\", \"caption 3\"]}
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            captions: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.STRING
                                }
                            }
                        }
                    }
                }
            });

            const jsonString = response.text.trim();
            const result = JSON.parse(jsonString);
            
            if (result.captions && Array.isArray(result.captions)) {
                setAiCaptions(result.captions);
                setIsCaptionModalOpen(true);
            } else {
                throw new Error("Invalid response format from AI.");
            }

        } catch (error) {
            console.error("Error generating captions:", error);
            showNotification("Gagal membuat caption. Coba lagi nanti.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Perencana Media Sosial" subtitle="Rencanakan, kelola, dan lacak semua postingan media sosial Anda.">
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-brand-bg rounded-lg flex items-center h-fit">
                        <button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${viewMode === 'kanban' ? 'bg-brand-surface shadow-sm text-brand-text-light' : 'text-brand-text-secondary'}`}><LayoutGridIcon className="w-5 h-5"/> Papan</button>
                        <button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${viewMode === 'calendar' ? 'bg-brand-surface shadow-sm text-brand-text-light' : 'text-brand-text-secondary'}`}><CalendarIcon className="w-5 h-5"/> Kalender</button>
                    </div>
                    <button onClick={() => handleOpenModal('add')} className="button-primary inline-flex items-center gap-2"><PlusIcon className="w-5 h-5" /> Buat Postingan</button>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <button onClick={() => setActiveFilter(p => p === PostStatus.SCHEDULED ? 'all' : PostStatus.SCHEDULED)} className="text-left w-full"><StatCard icon={<CalendarIcon className="w-6 h-6"/>} title="Terjadwal Bulan Ini" value={stats.scheduledThisMonth.toString()} /></button>
                 <button onClick={() => setActiveFilter(p => p === PostStatus.DRAFT ? 'all' : PostStatus.DRAFT)} className="text-left w-full"><StatCard icon={<PencilIcon className="w-6 h-6"/>} title="Dalam Draf" value={stats.inDraft.toString()} /></button>
                 <button onClick={() => setActiveFilter(p => p === PostStatus.POSTED ? 'all' : PostStatus.POSTED)} className="text-left w-full"><StatCard icon={<CheckSquareIcon className="w-6 h-6"/>} title="Total Diposting" value={stats.postedTotal.toString()} /></button>
                 <button onClick={() => setActiveFilter('all')} className="text-left w-full"><StatCard icon={<Share2Icon className="w-6 h-6"/>} title="Tampilkan Semua" value={(posts.length).toString()} /></button>
            </div>

            {viewMode === 'kanban' ? (
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {Object.values(PostStatus).map(status => (
                        <div key={status} onDragOver={handleDragOver} onDrop={e => handleDrop(e, status)} className={`w-72 flex-shrink-0 bg-brand-bg rounded-2xl border border-brand-border flex flex-col transition-opacity duration-300 ${activeFilter !== 'all' && activeFilter !== status ? 'opacity-40' : 'opacity-100'}`}>
                            <div className={`p-4 font-semibold text-brand-text-light border-b-2 ${getStatusColorClass(status)} flex justify-between items-center sticky top-0 bg-brand-bg/80 backdrop-blur-sm rounded-t-2xl z-10`}>
                                <span>{status}</span>
                                <span className="text-sm font-normal bg-brand-surface text-brand-text-secondary px-2.5 py-1 rounded-full">{posts.filter(p => p.status === status).length}</span>
                            </div>
                            <div className="p-3 space-y-3 h-[calc(100vh-500px)] overflow-y-auto">
                                {posts.filter(p => p.status === status).map(post => (
                                    <div key={post.id} draggable onDragStart={e => handleDragStart(e, post.id)} onClick={() => handleOpenModal('edit', post)} className={`p-4 bg-brand-surface rounded-xl cursor-grab border-l-4 shadow-lg ${draggedPostId === post.id ? 'opacity-50 ring-2 ring-brand-accent' : 'opacity-100'}`} style={{ borderLeftColor: getStatusColorClass(post.status).replace('border-', '') }}>
                                        <div className="flex justify-between items-start">
                                            <p className="font-semibold text-sm text-brand-text-light">{post.clientName}</p>
                                            <span className="text-lg">{getPlatformIcon(post.platform)}</span>
                                        </div>
                                        <p className="text-xs text-brand-text-secondary mt-1">{post.postType}</p>
                                        <p className="text-xs text-brand-text-primary mt-2 pt-2 border-t border-brand-border italic truncate">"{post.caption || 'Tanpa caption'}"</p>
                                        <div className="flex justify-between items-center mt-3 text-xs">
                                            <span className="text-brand-text-secondary">{formatShortDate(post.scheduledDate)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <PostCalendarView posts={posts} onPostClick={(post) => handleOpenModal('edit', post)} onDayClick={handleDayClick} />
            )}
            
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalMode === 'add' ? 'Buat Postingan Baru' : 'Edit Postingan'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="input-group">
                        <select id="projectId" name="projectId" value={formData.projectId} onChange={handleFormChange} className="input-field" required>
                            <option value="">Pilih Proyek Terkait...</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}
                        </select>
                         <label htmlFor="projectId" className="input-label">Proyek</label>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="input-group">
                            <select id="postType" name="postType" value={formData.postType} onChange={handleFormChange} className="input-field" required>
                                {Object.values(PostType).map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                            <label htmlFor="postType" className="input-label">Jenis Postingan</label>
                        </div>
                        <div className="input-group">
                            <input type="date" id="scheduledDate" name="scheduledDate" value={formData.scheduledDate} onChange={handleFormChange} className="input-field" placeholder=" " required />
                            <label htmlFor="scheduledDate" className="input-label">Tanggal Jadwal</label>
                        </div>
                    </div>
                     <div className="input-group">
                        <textarea id="caption" name="caption" value={formData.caption} onChange={handleFormChange} className="input-field" rows={5} placeholder=" "></textarea>
                        <label htmlFor="caption" className="input-label">Caption</label>
                        <button type="button" onClick={handleGenerateCaption} disabled={isGenerating} className="absolute right-2 top-2 text-xs font-semibold text-brand-accent hover:underline inline-flex items-center gap-1">
                            <SparkleIcon className="w-4 h-4" /> {isGenerating ? 'Membuat...' : 'Buat dengan AI'}
                        </button>
                    </div>
                    <div className="input-group">
                        <input type="url" id="mediaUrl" name="mediaUrl" value={formData.mediaUrl} onChange={handleFormChange} className="input-field" placeholder=" " />
                        <label htmlFor="mediaUrl" className="input-label">Tautan Media (Google Drive)</label>
                    </div>
                    <div className="flex justify-between items-center pt-6 border-t border-brand-border">
                        <div>
                             {modalMode === 'edit' && selectedPost && (
                                 <button type="button" onClick={() => handleDelete(selectedPost.id)} className="button-secondary !text-brand-danger !border-brand-danger hover:!bg-brand-danger/10">
                                    Hapus
                                </button>
                             )}
                        </div>
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={handleCloseModal} className="button-secondary">Batal</button>
                            <button type="submit" className="button-primary">{modalMode === 'add' ? 'Simpan Draf' : 'Update Postingan'}</button>
                        </div>
                    </div>
                </form>
            </Modal>
             <Modal isOpen={isCaptionModalOpen} onClose={() => setIsCaptionModalOpen(false)} title="Pilih Caption dari AI">
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {aiCaptions.map((caption, index) => (
                        <div key={index} className="p-4 bg-brand-bg rounded-lg">
                            <p className="text-sm text-brand-text-primary whitespace-pre-wrap">{caption}</p>
                            <button
                                onClick={() => {
                                    setFormData(prev => ({...prev, caption}));
                                    setIsCaptionModalOpen(false);
                                }}
                                className="button-secondary text-xs mt-3"
                            >
                                Gunakan Caption Ini
                            </button>
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
};