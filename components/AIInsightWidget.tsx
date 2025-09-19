
import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Project, Lead, Transaction, TeamProjectPayment, TransactionType, LeadStatus, ViewType, NavigationAction } from '../types';
import { SparkleIcon, LightbulbIcon, ClockIcon, DollarSignIcon, FolderKanbanIcon } from '../constants';

interface AIInsightWidgetProps {
    projects: Project[];
    leads: Lead[];
    transactions: Transaction[];
    teamProjectPayments: TeamProjectPayment[];
    handleNavigation: (view: ViewType, action?: NavigationAction) => void;
}

interface AIInsight {
    summary: string;
    suggestions: {
        icon: 'lead' | 'deadline' | 'payment' | 'project';
        text: string;
        action: keyof typeof ViewType;
        actionId?: string;
        actionText: string;
    }[];
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

const AILoadingSkeleton: React.FC = () => (
    <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border animate-pulse">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-bg"></div>
            <div className="h-6 w-48 bg-brand-bg rounded-md"></div>
        </div>
        <div className="space-y-3">
            <div className="h-4 bg-brand-bg rounded-md w-full"></div>
            <div className="h-4 bg-brand-bg rounded-md w-3/4"></div>
        </div>
        <div className="mt-6 pt-4 border-t border-brand-border/50">
             <div className="h-5 w-32 bg-brand-bg rounded-md mb-4"></div>
             <div className="space-y-4">
                 <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-brand-bg"></div>
                     <div className="flex-1 space-y-2">
                        <div className="h-4 bg-brand-bg rounded-md w-full"></div>
                     </div>
                     <div className="w-24 h-8 bg-brand-bg rounded-lg"></div>
                 </div>
                 <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-brand-bg"></div>
                     <div className="flex-1 space-y-2">
                        <div className="h-4 bg-brand-bg rounded-md w-full"></div>
                     </div>
                      <div className="w-24 h-8 bg-brand-bg rounded-lg"></div>
                 </div>
             </div>
        </div>
    </div>
);


const AIInsightWidget: React.FC<AIInsightWidgetProps> = ({ projects, leads, transactions, teamProjectPayments, handleNavigation }) => {
    const [insights, setInsights] = useState<AIInsight | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const suggestionIcons = {
        lead: <LightbulbIcon className="w-5 h-5 text-yellow-400" />,
        deadline: <ClockIcon className="w-5 h-5 text-orange-400" />,
        payment: <DollarSignIcon className="w-5 h-5 text-red-400" />,
        project: <FolderKanbanIcon className="w-5 h-5 text-blue-400" />,
    };

    const generateInsights = async () => {
        setLoading(true);
        setError(null);

        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            const totalIncomeThisMonth = transactions
                .filter(t => t.type === TransactionType.INCOME && new Date(t.date) >= startOfMonth)
                .reduce((sum, t) => sum + t.amount, 0);

            const activeProjects = projects.filter(p => p.status !== 'Selesai' && p.status !== 'Dibatalkan');
            const newLeadsThisMonth = leads.filter(l => new Date(l.date) >= startOfMonth).length;
            const leadsToFollowUp = leads.filter(l => l.status === LeadStatus.FOLLOW_UP);
            const projectsNearingDeadline = activeProjects.filter(p => p.deadlineDate && new Date(p.deadlineDate) <= nextWeek);
            const unpaidTeamFees = teamProjectPayments.filter(p => p.status === 'Unpaid').reduce((sum, p) => sum + p.fee, 0);

            const firstLeadToFollowUpId = leadsToFollowUp[0]?.id || null;
            const firstProjectNearingDeadlineId = projectsNearingDeadline[0]?.id || null;

            const dataSummary = `
                    - Total Pemasukan Bulan Ini: ${formatCurrency(totalIncomeThisMonth)}
                    - Jumlah Proyek Aktif: ${activeProjects.length}
                    - Prospek Baru Bulan Ini: ${newLeadsThisMonth}
                    - Prospek Perlu Follow-up: ${leadsToFollowUp.length}
                    - Proyek Mendekati Deadline (7 hari): ${projectsNearingDeadline.length}
                    - Total Gaji Tim Belum Dibayar: ${formatCurrency(unpaidTeamFees)}
                    - ID Prospek pertama untuk di-follow up: ${firstLeadToFollowUpId}
                    - ID Proyek pertama yang mendekati deadline: ${firstProjectNearingDeadlineId}
                `;

            const prompt = `
                    Anda adalah 'Asisten AI Vena', asisten bisnis yang cerdas dan proaktif untuk bisnis fotografi bernama Vena Pictures.
                    Analisis data real-time berikut, berikan ringkasan bisnis yang singkat, ramah, dan memotivasi, serta 3 saran strategis yang paling penting dan bisa langsung ditindaklanjuti.
                    
                    Data Bisnis Saat Ini:
                    ${dataSummary}
                    
                    Tugas Anda:
                    1.  Buat ringkasan dalam satu paragraf (2-3 kalimat) dalam Bahasa Indonesia.
                    2.  Buat daftar 3 saran paling prioritas. Untuk setiap saran:
                        - Tentukan 'icon' yang paling sesuai ('lead', 'deadline', 'payment', 'project').
                        - Tulis 'text' saran yang jelas dalam Bahasa Indonesia.
                        - Tentukan 'action' (halaman tujuan) yang harus berupa salah satu dari: 'PROSPEK', 'PROJECTS', 'FINANCE', 'TEAM'.
                        - Tentukan 'actionId' jika relevan (gunakan ID yang disediakan di data), jika tidak, berikan null.
                        - Tentukan 'actionText' singkat untuk tombol (misal: 'Follow Up', 'Lihat Proyek').

                    Respons Anda HARUS berupa objek JSON yang valid, tanpa teks atau markup tambahan di luar JSON. Ikuti skema ini dengan ketat.
                `;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            summary: { type: Type.STRING },
                            suggestions: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        icon: { type: Type.STRING },
                                        text: { type: Type.STRING },
                                        action: { type: Type.STRING },
                                        actionId: { type: Type.STRING, nullable: true },
                                        actionText: { type: Type.STRING }
                                    },
                                    required: ['icon', 'text', 'action', 'actionText']
                                }
                            }
                        },
                         required: ['summary', 'suggestions']
                    }
                }
            });

            const jsonString = response.text.trim();
            const parsedResult = JSON.parse(jsonString);
            setInsights(parsedResult);

        } catch (err) {
            console.error("AI Insight Error:", err);
            setError("Tidak dapat memuat saran AI saat ini.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <AILoadingSkeleton />;
    }

    if (!insights && !error) {
        return (
            <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <SparkleIcon className="w-8 h-8 text-brand-accent" />
                    <h3 className="font-bold text-xl text-gradient">Asisten AI Vena</h3>
                </div>
                <p className="text-brand-text-secondary mb-4">Klik tombol di bawah untuk menghasilkan wawasan AI berdasarkan data saat ini.</p>
                <button onClick={generateInsights} className="button-primary">Hasilkan Wawasan</button>
            </div>
        );
    }

    if (error && !insights) {
        return (
            <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border text-center">
                <p className="text-brand-text-secondary mb-4">{error}</p>
                <button onClick={generateInsights} className="button-primary">Coba Lagi</button>
            </div>
        );
    }
    
    const handleActionClick = (suggestion: AIInsight['suggestions'][0]) => {
        const viewType = ViewType[suggestion.action as keyof typeof ViewType];
        if (viewType) {
            let action: NavigationAction | undefined = undefined;
            if(suggestion.actionId) {
                // Determine action type based on view
                if(viewType === ViewType.CLIENTS) action = { type: 'VIEW_CLIENT_DETAILS', id: suggestion.actionId };
                else if (viewType === ViewType.PROJECTS) action = { type: 'VIEW_PROJECT_DETAILS', id: suggestion.actionId };
                else if (viewType === ViewType.TEAM) action = { type: 'VIEW_FREELANCER_DETAILS', id: suggestion.actionId };
                else action = { type: 'VIEW_DETAILS', id: suggestion.actionId }; // Generic fallback
            }
            handleNavigation(viewType, action);
        }
    }

    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
            <div className="flex items-center gap-3 mb-4">
                <SparkleIcon className="w-8 h-8 text-brand-accent" />
                <h3 className="font-bold text-xl text-gradient">Asisten AI Vena</h3>
            </div>
            <div className="mb-4">
                <button onClick={generateInsights} className="button-secondary text-sm">Perbarui Analisis</button>
            </div>
            <p className="text-brand-text-primary mb-6">{insights.summary}</p>

            <div className="pt-4 border-t border-brand-border/50">
                <h4 className="font-semibold text-brand-text-light mb-4">Saran Strategis</h4>
                <div className="space-y-3">
                    {insights.suggestions.map((suggestion, index) => (
                        <div key={index} className="flex items-center gap-4 p-3 bg-brand-bg rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-brand-surface flex-shrink-0 flex items-center justify-center border border-brand-border">
                                {suggestionIcons[suggestion.icon]}
                            </div>
                            <p className="flex-grow text-sm text-brand-text-primary">{suggestion.text}</p>
                            <button
                                onClick={() => handleActionClick(suggestion)}
                                className="button-secondary text-sm flex-shrink-0"
                            >
                                {suggestion.actionText}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AIInsightWidget;
