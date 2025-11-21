// Reports Management System
class ReportsManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Print button
        const printBtn = document.getElementById('print-btn');
        if (printBtn) {
            printBtn.addEventListener('click', () => this.printReport());
        }

        // Export button
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }

        // Import button
        const importBtn = document.getElementById('import-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.showImportModal());
        }

        // Stats button
        const statsBtn = document.getElementById('stats-btn');
        if (statsBtn) {
            statsBtn.addEventListener('click', () => this.showStatsModal());
        }
    }

    async printReport() {
        const year = window.salesManager.currentYear;
        const month = window.salesManager.currentMonth;
        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        const summary = await db.getMonthlySummary(year, month);
        const sales = await db.getSales({ year, month });

        // Create print window
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Relatório de Vendas - ${monthNames[month]} ${year}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                    .summary-card { background: #f8f9fa; padding: 15px; border-radius: 5px; }
                    .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .table th { background-color: #f8f9fa; }
                    .text-right { text-align: right; }
                    .text-danger { color: #dc3545; }
                    .text-success { color: #28a745; }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Relatório de Vendas</h1>
                    <h2>${monthNames[month]} ${year}</h2>
                    <p>Emitido em: ${new Date().toLocaleDateString('pt-BR')}</p>
                </div>

                <div class="summary">
                    <div class="summary-card">
                        <h3>Resumo Financeiro</h3>
                        <p><strong>Total Vendido:</strong> R$ ${this.formatCurrency(summary.totalSales)}</p>
                        <p><strong>Devoluções:</strong> R$ ${this.formatCurrency(summary.totalReturns)}</p>
                        <p><strong>Valor Líquido:</strong> R$ ${this.formatCurrency(summary.netAmount)}</p>
                    </div>
                    <div class="summary-card">
                        <h3>Metas e Performance</h3>
                        <p><strong>Meta Mensal:</strong> R$ ${this.formatCurrency(summary.monthlyGoal)}</p>
                        <p><strong>Progresso:</strong> ${summary.progressPercentage.toFixed(1)}%</p>
                        <p><strong>Meta Diária:</strong> R$ ${this.formatCurrency(summary.dailyGoal)}</p>
                    </div>
                </div>

                <h3>Detalhamento de Vendas</h3>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Valor</th>
                            <th>Tipo</th>
                            <th>Descrição</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sales.map(sale => `
                            <tr>
                                <td>${new Date(sale.sale_date).toLocaleDateString('pt-BR')}</td>
                                <td class="text-right ${sale.sale_type === 'return' ? 'text-danger' : 'text-success'}">
                                    ${sale.sale_type === 'return' ? '-' : ''}R$ ${this.formatCurrency(sale.amount)}
                                </td>
                                <td>${sale.sale_type === 'return' ? 'Devolução' : 'Venda'}</td>
                                <td>${sale.description || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="margin-top: 30px; font-size: 12px; color: #666;">
                    <p>Relatório gerado pelo Sales System Pro</p>
                </div>
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        
        // Wait for content to load before printing
        setTimeout(() => {
            printWindow.print();
            // printWindow.close(); // Uncomment to auto-close after printing
        }, 500);
    }

    async exportData() {
        try {
            const data = await db.exportData();
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `backup-vendas-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            this.showAlert('Backup exportado com sucesso!', 'success');
        } catch (error) {
            this.showAlert('Erro ao exportar backup: ' + error.message, 'error');
        }
    }

    async importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    await db.importData(data);
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.readAsText(file);
        });
    }

    showImportModal() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!confirm('⚠️ ATENÇÃO: Isso substituirá todos os seus dados atuais. Deseja continuar?')) {
                return;
            }

            try {
                await this.importData(file);
                this.showAlert('Dados importados com sucesso!', 'success');
                
                // Refresh the display
                if (window.salesManager) {
                    window.salesManager.updateDisplay();
                }
            } catch (error) {
                this.showAlert('Erro ao importar dados: ' + error.message, 'error');
            }
        };
        input.click();
    }

    async showStatsModal() {
        const year = window.salesManager.currentYear;
        const report = await db.getAnnualReport(year);
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        // Create stats modal content
        const statsHTML = `
            <div class="modal" id="stats-modal">
                <div class="modal-content" style="max-width: 800px;">
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                    <h2>Estatísticas Detalhadas - ${year}</h2>
                    
                    <div class="stats-grid">
                        <div class="stats-card">
                            <h3>Resumo Anual</h3>
                            <div class="stats-list">
                                <div class="stat-item">
                                    <span>Total Anual:</span>
                                    <strong>R$ ${this.formatCurrency(report.annualTotal)}</strong>
                                </div>
                                <div class="stat-item">
                                    <span>Vendas Anuais:</span>
                                    <span>R$ ${this.formatCurrency(report.annualSales)}</span>
                                </div>
                                <div class="stat-item">
                                    <span>Devoluções Anuais:</span>
                                    <span>R$ ${this.formatCurrency(report.annualReturns)}</span>
                                </div>
                                <div class="stat-item">
                                    <span>Meses com dados:</span>
                                    <span>${report.monthsWithData}/12</span>
                                </div>
                                <div class="stat-item">
                                    <span>Média Mensal:</span>
                                    <span>R$ ${this.formatCurrency(report.monthsWithData > 0 ? report.annualTotal / report.monthsWithData : 0)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="stats-card">
                            <h3>Melhores Meses</h3>
                            <div class="stats-list">
                                ${this.getTopMonths(report.monthlyData, monthNames)}
                            </div>
                        </div>
                    </div>
                    
                    <div class="chart-container" style="height: 300px; margin-top: 20px;">
                        <canvas id="annual-stats-chart"></canvas>
                    </div>
                </div>
            </div>
        `;

        // Add to page
        document.body.insertAdjacentHTML('beforeend', statsHTML);

        // Update annual chart
        if (window.chartsManager) {
            setTimeout(() => {
                window.chartsManager.updateAnnualChart(year);
            }, 100);
        }
    }

    getTopMonths(monthlyData, monthNames) {
        const topMonths = monthlyData
            .map((month, index) => ({
                month: monthNames[index],
                netAmount: month.netAmount
            }))
            .filter(month => month.netAmount > 0)
            .sort((a, b) => b.netAmount - a.netAmount)
            .slice(0, 5);

        if (topMonths.length === 0) {
            return '<div class="text-muted">Nenhum dado disponível</div>';
        }

        return topMonths.map(month => `
            <div class="stat-item">
                <span>${month.month}:</span>
                <strong>R$ ${this.formatCurrency(month.netAmount)}</strong>
            </div>
        `).join('');
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    showAlert(message, type = 'info') {
        // Similar to salesManager showAlert
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            padding: 12px 20px;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            ${type === 'success' ? 'background: #10b981;' : ''}
            ${type === 'error' ? 'background: #ef4444;' : ''}
            ${type === 'info' ? 'background: #3b82f6;' : ''}
        `;

        document.body.appendChild(alert);

        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

// Initialize reports manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.reportsManager = new ReportsManager();
});