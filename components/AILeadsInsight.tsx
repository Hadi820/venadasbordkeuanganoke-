import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Lead, Project, LeadStatus, ViewType, NavigationAction } from '../types';
import { SparkleIcon, LightbulbIcon, MessageSquareIcon, TrendingUpIcon, TargetIcon } from '../constants';

interface AILeadsInsightProps {
    leads: Lead[];
    projects: Project[];
    handleNavigation: (view: ViewType, action?: NavigationAction) => void;
}

interface AIInsight {
    summary: string;
    suggestions: {
        icon: 'follow-up' | 'source' | 'stale' | 'general';
        text: string;
        action: keyof typeof ViewType;
        actionId?: string;
        actionText: string;
    }[];
}

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


const AILeadsInsight: React.FC<AILeadsInsightProps> = ({ leads, projects, handleNavigation }) => {
    const [insights, setInsights] = useState<AIInsight | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const suggestionIcons = {
        'follow-up': <MessageSquareIcon className="w-5 h-5 text-purple-400" />,
        'source': <TrendingUpIcon className="w-5 h-5 text-green-400" />,
        'stale': <TargetIcon className="w-5 h-5 text-orange-400" />,
        'general': <LightbulbIcon className="w-5 h-5 text-yellow-400" />,
    };

    const generateInsights = async () => {
        setLoading(true);
        setError(null);

        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

            const newLeadsThisMonth = leads.filter(l => new Date(l.date) >= startOfMonth).length;
            const leadsToFollowUp = leads.filter(l => l.status === LeadStatus.FOLLOW_UP);
            const staleLeads = leads.filter(l => (l.status === LeadStatus.DISCUSSION || l.status === LeadStatus.FOLLOW_UP) && new Date(l.date) < threeDaysAgo);

            const leadSourceCounts = leads.reduce((acc, lead) => {
                acc[lead.contactChannel] = (acc[lead.contactChannel] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const topSource = Object.keys(leadSourceCounts).length > 0
                ? Object.entries(leadSourceCounts)
                    .sort((a, b) => (b[1] as number) - (a[1] as number))[0][0]
                : 'Tidak ada';

            const dataSummary = `
                    - Total Prospek Aktif: ${leads.filter(l => l.status !== LeadStatus.CONVERTED && l.status !== LeadStatus.REJECTED).length}
                    - Prospek Baru Bulan Ini: ${newLeadsThisMonth}
                    - Prospek Perlu Follow-up: ${leadsToFollowUp.length}
                    - Prospek "Dingin" (lebih dari 3 hari): ${staleLeads.map(l => ({id: l.id, name: l.name})).slice(0, 3).map(l => l.name).join(', ')}
                    - Sumber Prospek Teratas: ${topSource}
                `;

            const prompt = `
                    Anda adalah 'Asisten AI Prospek Vena', asisten bisnis yang cerdas dan proaktif untuk bisnis fotografi Vena Pictures.
                    Analisis data prospek berikut, berikan ringkasan singkat (1-2 kalimat) dan 2 saran strategis yang paling penting dan bisa langsung ditindaklanjuti.
                    
                    Data Prospek Saat Ini:
                    ${dataSummary}
                    
                    Tugas Anda:
                    1.  Buat ringkasan dalam satu paragraf (1-2 kalimat) dalam Bahasa Indonesia.
                    2.  Buat daftar 2 saran paling prioritas. Untuk setiap saran:
                        - Tentukan 'icon' yang paling sesuai ('follow-up', 'source', 'stale', 'general').
                        - Tulis 'text' saran yang jelas dalam Bahasa Indonesia.
                        - Tentukan 'action' (halaman tujuan) yang harus berupa 'PROSPEK'.
                        - Tentukan 'actionId' jika relevan (gunakan ID yang disediakan di data), jika tidak, berikan null.
                        - Tentukan 'actionText' singkat untuk tombol (misal: 'Lihat Prospek').

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
            setError("Tidak dapat memuat saran AI untuk prospek saat ini.");
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
                    <h3 className="font-bold text-xl text-gradient">Asisten AI Prospek</h3>
                </div>
                <p className="text-brand-text-secondary mb-4">Klik tombol di bawah untuk menghasilkan wawasan AI untuk prospek.</p>
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
        handleNavigation(ViewType.PROSPEK);
    }

    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
            <div className="flex items-center gap-3 mb-4">
                <SparkleIcon className="w-8 h-8 text-brand-accent" />
                <h3 className="font-bold text-xl text-gradient">Asisten AI Prospek</h3>
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
                                {suggestionIcons[suggestion.icon as keyof typeof suggestionIcons]}
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

export default AILeadsInsight;
