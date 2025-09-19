import React from 'react';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  className?: string;
}

const DonutChart: React.FC<DonutChartProps> = ({ data, className = '' }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    if (total === 0) {
        return <div className="text-center text-brand-text-secondary py-8 text-sm">Tidak ada data untuk ditampilkan.</div>;
    }

    let accumulatedPercentage = 0;

    return (
        <div className={`flex flex-col md:flex-row items-center gap-4 ${className}`}>
            <div className="relative w-28 h-28 md:w-36 md:h-36 flex-shrink-0">
                <svg className="w-full h-full" viewBox="0 0 36 36" transform="rotate(-90)">
                    {data.map((item, index) => {
                        const percentage = (item.value / total) * 100;
                        const element = (
                            <circle
                                key={index}
                                cx="18" cy="18" r="15.9154943092"
                                fill="transparent"
                                stroke={item.color}
                                strokeWidth="6"
                                strokeDasharray={`${percentage} ${100 - percentage}`}
                                strokeDashoffset={-accumulatedPercentage}
                            />
                        );
                        accumulatedPercentage += percentage;
                        return element;
                    })}
                </svg>
            </div>
            <div className="text-xs md:text-sm space-y-2.5 w-full">
                {data.map(item => (
                    <div key={item.label} className="flex items-center justify-between gap-2">
                         <div className="flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                            <span className="text-brand-text-secondary truncate">{item.label}</span>
                        </div>
                        <span className="font-semibold text-brand-text-light">{((item.value/total)*100).toFixed(0)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default DonutChart;