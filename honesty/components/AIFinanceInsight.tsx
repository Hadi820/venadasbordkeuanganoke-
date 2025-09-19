

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { Transaction, Project, Card, FinancialPocket, TeamMember, RewardLedgerEntry } from '../types';
import { SparkleIcon, TrendingUpIcon, TrendingDownIcon, AlertCircleIcon, LightbulbIcon, CheckCircleIcon, MessageCircleIcon, SendIcon } from '../constants';

interface AIFinanceInsightProps {
    transactions: Transaction[];
    projects: Project[];
    cards: Card[];
    pockets: FinancialPocket[];
    teamMembers: TeamMember[];
    rewardLedgerEntries: RewardLedgerEntry[];
}

interface FullAnalysis {
    strategic_summary: {
        overall_status: string;
        key_insights: { type: 'positive' | 'negative' | 'neutral'; insight: string; }[];
        recommendations: string[];
    };
    cash_flow_analysis: {
        monthly_trend_analysis: string;
        future_outlook: string;
        improvement_suggestions: string[];
    };
    anomaly_detection: {
        anomaly: string;
        details: string;
        recommendation: string;
    }[];
}

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

const AILoadingSkeleton: React.FC = () => (
    <div className="p-6 animate-pulse">
        <div className="h-6 w-3/4 bg-brand-bg rounded-md mb-4"></div>
        <div className="space-y-2">
            <div className="h-4 bg-brand-bg rounded-md"></div>
            <div className="h-4 bg-brand-bg rounded-md w-5/6"></div>
        </div>
        <div className="mt-6 pt-4 border-t border-brand-border/50">
            <div className="h-5 w-1/3 bg-brand-bg rounded-md mb-3"></div>
            <div className="space-y-3"><div className="h-8 bg-brand-bg rounded-md"></div><div className="h-8 bg-brand-bg rounded-md"></div></div>
        </div>
    </div>
);

const AIFinanceInsight: React.FC<AIFinanceInsightProps> = (props) => {
    const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'summary' | 'cashflow' | 'anomalies' | 'chat'>('summary');
    
    // Chat states
    const [chat, setChat] = useState<Chat | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const chatMessagesEndRef = useRef<HTMLDivElement>(null);

    const dataSummaryForPrompt = useMemo(() => {
        return JSON.stringify({
            transactions: props.transactions.map(t => ({ id: t.id, date: t.date, desc: t.description, amount: t.amount, type: t.type, cat: t.category, projId: t.projectId })),
            projects: props.projects.map(p => ({ id: p.id, name: p.projectName, cost: p.totalCost, paid: p.amountPaid, status: p.status, date: p.date })),
            cards: props.cards.map(c => ({ name: c.bankName, type: c.cardType, balance: c.balance })),
            pockets: props.pockets.map(p => ({ name: p.name, amount: p.amount, type: p.type })),
            teamPayments: props.projects.flatMap(p => p.team.map(t => ({ projName: p.projectName, teamMember: t.name, fee: t.fee })))
        }, null, 2);
    }, [props]);

    useEffect(() => {
        // Initialize Gemini Chat when component mounts or data changes
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const chatInstance = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: `Anda adalah 'Vena Finance AI', seorang analis keuangan ahli untuk bisnis fotografi Vena Pictures. Anda memiliki akses ke data keuangan internal perusahaan dalam format JSON. Tugas Anda adalah menjawab pertanyaan pengguna secara akurat dan ringkas berdasarkan data yang diberikan. Selalu berikan jawaban dalam Bahasa Indonesia. Jika data tidak cukup untuk menjawab, katakan demikian. Jangan mengarang informasi. Data Keuangan Internal: ${dataSummaryForPrompt}`
            }
        });
        setChat(chatInstance);
        setChatHistory([]); // Reset history when data changes
    }, [dataSummaryForPrompt]);
    
    useEffect(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    const runFullAnalysis = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                Anda adalah 'Vena Finance AI', seorang analis keuangan ahli untuk bisnis fotografi Vena Pictures. 
                Tugas Anda adalah menganalisis data keuangan berikut dan memberikan wawasan strategis dalam Bahasa Indonesia.
                
                Data Keuangan (JSON): ${dataSummaryForPrompt}

                Respons HARUS berupa objek JSON yang valid, sesuai dengan skema yang diberikan.
                - strategic_summary: Ringkasan & wawasan strategis.
                - cash_flow_analysis: Analisis mendalam tentang arus kas.
                - anomaly_detection: Temuan potensi masalah dalam data.
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            strategic_summary: { type: Type.OBJECT, properties: { overall_status: { type: Type.STRING }, key_insights: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, insight: { type: Type.STRING } } } }, recommendations: { type: Type.ARRAY, items: { type: Type.STRING } } } },
                            cash_flow_analysis: { type: Type.OBJECT, properties: { monthly_trend_analysis: { type: Type.STRING }, future_outlook: { type: Type.STRING }, improvement_suggestions: { type: Type.ARRAY, items: { type: Type.STRING } } } },
                            anomaly_detection: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { anomaly: { type: Type.STRING }, details: { type: Type.STRING }, recommendation: { type: Type.STRING } } } }
                        }
                    }
                }
            });
            setAnalysis(JSON.parse(response.text.trim()));
        } catch (err) {
            console.error("AI Analysis Error:", err);
            setError("Gagal melakukan analisis. Silakan coba lagi.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !chat || isChatLoading) return;
        
        const userMessage: ChatMessage = { role: 'user', text: chatInput };
        setChatHistory(prev => [...prev, userMessage]);
        setChatInput('');
        setIsChatLoading(true);

        try {
            const response = await chat.sendMessage({ message: chatInput });
            const modelMessage: ChatMessage = { role: 'model', text: response.text };
            setChatHistory(prev => [...prev, modelMessage]);
        } catch (err) {
            console.error("Chat Error:", err);
            const errorMessage: ChatMessage = { role: 'model', text: "Maaf, terjadi kesalahan saat memproses permintaan Anda." };
            setChatHistory(prev => [...prev, errorMessage]);
        } finally {
            setIsChatLoading(false);
        }
    };

    if (!analysis && !isLoading && !error) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center p-8">
                <SparkleIcon className="w-16 h-16 text-brand-accent mb-4" />
                <h2 className="text-2xl font-bold text-brand-text-light">Asisten AI Keuangan Vena</h2>
                <p className="mt-2 text-brand-text-secondary max-w-md">Dapatkan wawasan mendalam, deteksi anomali, analisis arus kas, dan ajukan pertanyaan tentang data keuangan Anda.</p>
                <button onClick={runFullAnalysis} className="mt-8 button-primary">
                    Mulai Analisis
                </button>
            </div>
        );
    }
    
    const tabs = [
        { id: 'summary', label: 'Ringkasan & Strategi' },
        { id: 'cashflow', label: 'Analisis Cash Flow' },
        { id: 'anomalies', label: 'Deteksi Anomali' },
        { id: 'chat', label: 'Tanya AI' },
    ];

    const InsightCard: React.FC<{ type?: string, text: string, details?: string, recommendation?: string }> = ({ type, text, details, recommendation }) => {
        const icons = {
            positive: <TrendingUpIcon className="w-5 h-5 text-brand-success flex-shrink-0 mt-0.5" />,
            negative: <TrendingDownIcon className="w-5 h-5 text-brand-danger flex-shrink-0 mt-0.5" />,
            neutral: <AlertCircleIcon className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />,
            recommendation: <LightbulbIcon className="w-5 h-5 text-brand-accent flex-shrink-0 mt-0.5" />,
            anomaly: <AlertCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />,
        };
        const icon = icons[type as keyof typeof icons] || <LightbulbIcon className="w-5 h-5 text-brand-accent flex-shrink-0 mt-0.5" />;
        const bgColor = type === 'anomaly' ? 'bg-red-500/5' : 'bg-brand-bg';

        return (
            <div className={`flex items-start gap-3 text-sm p-3 rounded-md ${bgColor}`}>
                {icon}
                <div>
                    <span className="text-brand-text-primary font-medium">{text}</span>
                    {details && <p className="text-xs text-brand-text-secondary mt-1">{details}</p>}
                    {recommendation && <p className="text-xs text-brand-accent mt-2 font-semibold">Saran: {recommendation}</p>}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-[80vh]">
            <div className="flex-shrink-0 border-b border-brand-border px-4">
                <nav className="-mb-px flex space-x-6">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}>{tab.label}</button>
                    ))}
                </nav>
            </div>
            <div className="flex-grow overflow-y-auto">
                {isLoading ? <AILoadingSkeleton /> : error ? <div className="p-8 text-center text-red-400">{error}</div> :
                <div className="p-6">
                    {activeTab === 'summary' && analysis?.strategic_summary && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-brand-text-light mb-3">Ringkasan Umum</h4>
                                <p className="text-brand-text-primary bg-brand-bg p-4 rounded-lg">{analysis.strategic_summary.overall_status}</p>
                                <h4 className="font-semibold text-brand-text-light mt-6 mb-3">Rekomendasi Strategis</h4>
                                <div className="space-y-2">
                                    {analysis.strategic_summary.recommendations.map((rec, i) => <InsightCard key={i} type="recommendation" text={rec} />)}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-brand-text-light mb-3">Pokok Pikiran Kunci</h4>
                                <div className="space-y-2">
                                    {analysis.strategic_summary.key_insights.map((item, i) => <InsightCard key={i} type={item.type} text={item.insight} />)}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'cashflow' && analysis?.cash_flow_analysis && (
                        <div className="space-y-6">
                            <div><h4 className="font-semibold text-brand-text-light mb-2">Analisis Tren Bulanan</h4><p className="text-brand-text-primary bg-brand-bg p-4 rounded-lg">{analysis.cash_flow_analysis.monthly_trend_analysis}</p></div>
                            <div><h4 className="font-semibold text-brand-text-light mb-2">Proyeksi Masa Depan</h4><p className="text-brand-text-primary bg-brand-bg p-4 rounded-lg">{analysis.cash_flow_analysis.future_outlook}</p></div>
                            <div><h4 className="font-semibold text-brand-text-light mb-2">Saran Peningkatan Arus Kas</h4><div className="space-y-2">{analysis.cash_flow_analysis.improvement_suggestions.map((sug, i) => <InsightCard key={i} type="recommendation" text={sug} />)}</div></div>
                        </div>
                    )}
                    {activeTab === 'anomalies' && analysis?.anomaly_detection && (
                        <div>
                            <h4 className="font-semibold text-brand-text-light mb-3">Anomali & Inkonsistensi Data</h4>
                            {analysis.anomaly_detection.length > 0 ? (
                                <div className="space-y-3">{analysis.anomaly_detection.map((item, i) => <InsightCard key={i} type="anomaly" text={item.anomaly} details={item.details} recommendation={item.recommendation} />)}</div>
                            ) : (
                                <div className="flex items-center gap-3 text-sm p-3 bg-green-500/10 rounded-md"><CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0" /><span className="text-brand-text-primary">Bagus! Tidak ada anomali data signifikan yang terdeteksi.</span></div>
                            )}
                        </div>
                    )}
                    {activeTab === 'chat' && (
                        <div className="flex flex-col h-full">
                            <div className="flex-grow overflow-y-auto space-y-4 pr-2" style={{height: 'calc(80vh - 12rem)'}}>
                                {chatHistory.map((msg, i) => (
                                    <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-brand-accent/20 flex items-center justify-center font-bold text-brand-accent text-sm flex-shrink-0"><SparkleIcon className="w-5 h-5"/></div>}
                                        <div className={`max-w-xl p-3 rounded-2xl ${msg.role === 'user' ? 'bg-brand-accent text-white rounded-br-none' : 'bg-brand-bg text-brand-text-primary rounded-bl-none'}`}>
                                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                        </div>
                                    </div>
                                ))}
                                {isChatLoading && (
                                     <div className="flex items-start gap-3 justify-start">
                                        <div className="w-8 h-8 rounded-full bg-brand-accent/20 flex items-center justify-center font-bold text-brand-accent text-sm flex-shrink-0"><SparkleIcon className="w-5 h-5"/></div>
                                        <div className="max-w-xl p-3 rounded-2xl bg-brand-bg text-brand-text-primary rounded-bl-none">
                                            <p className="text-sm animate-pulse">Mengetik...</p>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatMessagesEndRef} />
                            </div>
                            <form onSubmit={handleSendMessage} className="mt-4 flex-shrink-0 flex items-center gap-2">
                                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Tanyakan apa saja tentang data keuangan Anda..." className="input-field flex-grow" disabled={isChatLoading} />
                                <button type="submit" className="button-primary h-12 w-12 flex items-center justify-center flex-shrink-0" disabled={isChatLoading || !chatInput.trim()}><SendIcon className="w-5 h-5"/></button>
                            </form>
                        </div>
                    )}
                </div>}
            </div>
        </div>
    );
};

export default AIFinanceInsight;