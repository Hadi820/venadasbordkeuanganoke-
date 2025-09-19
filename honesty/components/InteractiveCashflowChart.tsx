import React, { useState } from 'react';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

interface ChartDataPoint {
    label: string;
    income: number;
    expense: number;
    balance: number;
}

interface InteractiveCashflowChartProps {
    data: ChartDataPoint[];
}

const InteractiveCashflowChart: React.FC<InteractiveCashflowChartProps> = ({ data }) => {
    const [tooltip, setTooltip] = useState<{ x: number; y: number; data: ChartDataPoint } | null>(null);
    const width = 800;
    const height = 300;
    const padding = { top: 20, right: 20, bottom: 40, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    if (!data || data.length === 0) {
        return <div className="text-center text-brand-text-secondary py-16">Tidak ada data untuk ditampilkan.</div>;
    }

    const maxBarValue = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
    const minBalance = Math.min(...data.map(d => d.balance), 0);
    const maxBalance = Math.max(...data.map(d => d.balance), 1);

    const bandWidth = chartWidth / data.length;
    const barWidth = Math.max(2, bandWidth * 0.4);

    const xScale = (index: number) => padding.left + index * bandWidth + bandWidth / 2;
    const yBarScale = (value: number) => chartHeight - (value / maxBarValue) * chartHeight;
    const yLineScale = (value: number) => {
        const range = maxBalance - minBalance;
        if (range === 0) return chartHeight / 2;
        return chartHeight - ((value - minBalance) / range) * chartHeight;
    };
    
    const balancePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${padding.top + yLineScale(d.balance)}`).join(' ');

    const handleMouseMove = (e: React.MouseEvent<SVGRectElement>, index: number) => {
        const svg = e.currentTarget.ownerSVGElement;
        if (svg) {
            const point = svg.createSVGPoint();
            point.x = e.clientX;
            point.y = e.clientY;
            const { x, y } = point.matrixTransform(svg.getScreenCTM()?.inverse());
            setTooltip({ x, y: y - 10, data: data[index] });
        }
    };
    const handleMouseLeave = () => setTooltip(null);
    
    // Y-Axis grid lines and labels for bars
    const yBarAxisLabels = Array.from({ length: 5 }, (_, i) => {
        const value = maxBarValue * (i / 4);
        return { value: (value/1_000_000).toFixed(1), y: padding.top + yBarScale(value) };
    });

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                <defs><clipPath id="chartArea"><rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} /></clipPath></defs>
                
                {/* Y-axis grid and labels */}
                {yBarAxisLabels.map(({ value, y }, i) => (
                    <g key={i} className="text-xs text-brand-text-secondary">
                        <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" strokeDasharray="2,3" opacity="0.2" />
                        <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="currentColor">{value}jt</text>
                    </g>
                ))}

                {/* X-axis labels */}
                {data.map((d, i) => {
                    if (data.length <= 12 || i % Math.ceil(data.length / 10) === 0) {
                         return (
                            <text key={i} x={xScale(i)} y={height - padding.bottom + 15} textAnchor="middle" fontSize="10" className="fill-current text-brand-text-secondary">
                                {d.label}
                            </text>
                        );
                    }
                    return null;
                })}

                <g clipPath="url(#chartArea)">
                    {/* Bars */}
                    {data.map((d, i) => (
                        <g key={`bar-${i}`}>
                             <rect
                                x={xScale(i) - barWidth / 2}
                                y={padding.top + yBarScale(d.expense)}
                                width={barWidth}
                                height={chartHeight - yBarScale(d.expense)}
                                fill="#FB5D5D" // brand-danger
                                className="transition-opacity"
                                opacity={tooltip && tooltip.data.label === d.label ? 1 : 0.7}
                                rx="4"
                            />
                            <rect
                                x={xScale(i) - barWidth / 2}
                                y={padding.top + yBarScale(d.income)}
                                width={barWidth}
                                height={chartHeight - yBarScale(d.income)}
                                fill="#34D399" // brand-success
                                className="transition-opacity"
                                opacity={tooltip && tooltip.data.label === d.label ? 1 : 0.8}
                                rx="4"
                            />
                        </g>
                    ))}

                    {/* Balance Line */}
                    <path d={balancePath} fill="none" stroke="#FFF27A" strokeWidth="2.5" />
                    {data.map((d, i) => (
                         <circle key={`point-${i}`} cx={xScale(i)} cy={padding.top + yLineScale(d.balance)} r={tooltip && tooltip.data.label === d.label ? 5 : 3} fill="#FFF27A" stroke="#2E3137" strokeWidth="1.5" className="transition-all" />
                    ))}
                </g>

                {/* Interaction layer */}
                {data.map((d, i) => (
                    <rect key={`interaction-${i}`} x={padding.left + i*bandWidth} y={padding.top} width={bandWidth} height={chartHeight} fill="transparent"
                        onMouseMove={(e) => handleMouseMove(e, i)}
                        onMouseLeave={handleMouseLeave}
                    />
                ))}
                
                {tooltip && (
                    <g className="pointer-events-none transition-opacity" transform={`translate(${tooltip.x}, ${tooltip.y})`}>
                       <foreignObject x="-85" y="-125" width="170" height="110">
                           <div className="p-3 bg-brand-bg border border-gray-700/50 text-white rounded-lg shadow-xl text-xs z-10">
                                <p className="font-bold mb-2 text-center border-b border-gray-600 pb-1.5">{tooltip.data.label}</p>
                                <div className="space-y-1">
                                   <p><span className="inline-block w-2.5 h-2.5 bg-brand-success rounded-sm mr-2 align-middle"></span>Pemasukan: {formatCurrency(tooltip.data.income)}</p>
                                   <p><span className="inline-block w-2.5 h-2.5 bg-brand-danger rounded-sm mr-2 align-middle"></span>Pengeluaran: {formatCurrency(tooltip.data.expense)}</p>
                                   <p><span className="inline-block w-2.5 h-2.5 bg-brand-accent rounded-sm mr-2 align-middle"></span>Saldo: {formatCurrency(tooltip.data.balance)}</p>
                                </div>
                            </div>
                       </foreignObject>
                    </g>
                )}
            </svg>
        </div>
    );
};

export default InteractiveCashflowChart;