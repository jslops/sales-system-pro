// Charts Management System
class ChartsManager {
    constructor() {
        this.salesChart = null;
        this.progressChart = null;
        this.annualChart = null;
        this.init();
    }

    init() {
        // Charts will be initialized when needed
    }

    async updateCharts(year, month) {
        await this.updateProgressChart(year, month);
        await this.updateSalesChart(year, month);
    }

    async updateProgressChart(year, month) {
        const ctx = document.getElementById('progress-chart');
        if (!ctx) return;

        const summary = await db.getMonthlySummary(year, month);
        
        const progressPercentage = summary.progressPercentage;
        const remainingPercentage = Math.max(0, 100 - progressPercentage);

        // Destroy existing chart
        if (this.progressChart) {
            this.progressChart.destroy();
        }

        this.progressChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Realizado', 'Restante'],
                datasets: [{
                    data: [progressPercentage, remainingPercentage],
                    backgroundColor: [
                        progressPercentage >= 100 ? '#10b981' : '#3b82f6',
                        '#e5e7eb'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed}%`;
                            }
                        }
                    }
                }
            },
            plugins: [{
                id: 'centerText',
                beforeDraw: function(chart) {
                    const width = chart.width;
                    const height = chart.height;
                    const ctx = chart.ctx;
                    ctx.restore();
                    
                    const fontSize = (height / 150).toFixed(2);
                    ctx.font = `bold ${fontSize}em sans-serif`;
                    ctx.textBaseline = 'middle';
                    
                    const text = `${progressPercentage.toFixed(1)}%`;
                    const textX = Math.round((width - ctx.measureText(text).width) / 2);
                    const textY = height / 2;
                    
                    ctx.fillText(text, textX, textY);
                    ctx.save();
                }
            }]
        });
    }

    async updateSalesChart(year, month) {
        const ctx = document.getElementById('sales-chart');
        if (!ctx) return;

        const sales = await db.getSales({ year, month });
        
        // Group by day
        const dailyData = {};
        sales.forEach(sale => {
            const day = new Date(sale.sale_date).getDate();
            if (!dailyData[day]) {
                dailyData[day] = { sales: 0, returns: 0 };
            }
            
            if (sale.sale_type === 'sale') {
                dailyData[day].sales += sale.amount;
            } else {
                dailyData[day].returns += sale.amount;
            }
        });

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const labels = [];
        const salesData = [];
        const returnsData = [];
        const netData = [];

        for (let day = 1; day <= daysInMonth; day++) {
            labels.push(day);
            const dayData = dailyData[day] || { sales: 0, returns: 0 };
            salesData.push(dayData.sales);
            returnsData.push(dayData.returns);
            netData.push(dayData.sales - dayData.returns);
        }

        // Destroy existing chart
        if (this.salesChart) {
            this.salesChart.destroy();
        }

        this.salesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Vendas',
                        data: salesData,
                        backgroundColor: 'rgba(59, 130, 246, 0.7)',
                        borderColor: 'rgb(59, 130, 246)',
                        borderWidth: 1
                    },
                    {
                        label: 'Devoluções',
                        data: returnsData,
                        backgroundColor: 'rgba(239, 68, 68, 0.7)',
                        borderColor: 'rgb(239, 68, 68)',
                        borderWidth: 1
                    },
                    {
                        label: 'Líquido',
                        data: netData,
                        type: 'line',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        borderColor: 'rgb(16, 185, 129)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                });
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += 'R$ ' + context.parsed.y.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                });
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    async updateAnnualChart(year) {
        const ctx = document.getElementById('annual-chart');
        if (!ctx) return;

        const report = await db.getAnnualReport(year);
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        // Destroy existing chart
        if (this.annualChart) {
            this.annualChart.destroy();
        }

        this.annualChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthNames,
                datasets: [{
                    label: 'Vendas Líquidas (R$)',
                    data: report.monthlyData.map(m => m.netAmount),
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                });
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Líquido: R$ ' + context.parsed.y.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                });
                            }
                        }
                    }
                }
            }
        });
    }

    destroyCharts() {
        if (this.salesChart) {
            this.salesChart.destroy();
            this.salesChart = null;
        }
        if (this.progressChart) {
            this.progressChart.destroy();
            this.progressChart = null;
        }
        if (this.annualChart) {
            this.annualChart.destroy();
            this.annualChart = null;
        }
    }
}

// Initialize charts manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.chartsManager = new ChartsManager();
});