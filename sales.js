// Sales Management System
class SalesManager {
    constructor() {
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth();
        this.currentFilter = 'all';
        this.currentSort = { field: 'date', direction: 'desc' };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeSelects();
    }

    setupEventListeners() {
        // Sales form
        const saleForm = document.getElementById('sale-form');
        if (saleForm) {
            saleForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addSale();
            });
        }

        // Filter buttons
        const filterAll = document.getElementById('filter-all');
        const filterSales = document.getElementById('filter-sales');
        const filterReturns = document.getElementById('filter-returns');

        if (filterAll) filterAll.addEventListener('click', () => this.setFilter('all'));
        if (filterSales) filterSales.addEventListener('click', () => this.setFilter('sales'));
        if (filterReturns) filterReturns.addEventListener('click', () => this.setFilter('returns'));

        // Sort headers
        document.addEventListener('click', (e) => {
            if (e.target.closest('th[data-sort]')) {
                const field = e.target.closest('th[data-sort]').getAttribute('data-sort');
                this.sortSales(field);
            }
        });

        // Edit and delete buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.edit-sale')) {
                const index = e.target.closest('.edit-sale').getAttribute('data-index');
                this.editSale(parseInt(index));
            }
            
            if (e.target.closest('.delete-sale')) {
                const index = e.target.closest('.delete-sale').getAttribute('data-index');
                this.deleteSale(parseInt(index));
            }
        });
    }

    initializeSelects() {
        // Year select
        const yearSelect = document.getElementById('year-select');
        if (yearSelect) {
            yearSelect.innerHTML = '';
            for (let i = this.currentYear - 5; i <= this.currentYear + 5; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                if (i === this.currentYear) option.selected = true;
                yearSelect.appendChild(option);
            }
            yearSelect.addEventListener('change', (e) => {
                this.currentYear = parseInt(e.target.value);
                this.updateDisplay();
            });
        }

        // Month select
        const monthSelect = document.getElementById('month-select');
        if (monthSelect) {
            monthSelect.value = this.currentMonth;
            monthSelect.addEventListener('change', (e) => {
                this.currentMonth = parseInt(e.target.value);
                this.updateDisplay();
            });
        }

        // Set current date in form
        this.setCurrentDate();
    }

    async addSale() {
        const dateInput = document.getElementById('sale-date');
        const valueInput = document.getElementById('sale-value');
        const typeInput = document.getElementById('sale-type');
        const descriptionInput = document.getElementById('sale-description');

        const date = dateInput.value;
        const value = parseFloat(valueInput.value);
        const type = typeInput.value;
        const description = descriptionInput.value;

        if (!date || isNaN(value) || value <= 0) {
            this.showAlert('Por favor, preencha todos os campos obrigatórios com valores válidos.', 'error');
            return;
        }

        const saleDate = new Date(date);
        const current = new Date();
        if (saleDate > current) {
            this.showAlert('Não é possível adicionar vendas com data futura.', 'error');
            return;
        }

        try {
            await db.addSale({
                sale_date: date,
                amount: value,
                sale_type: type,
                description: description
            });

            this.showAlert(
                type === 'sale' ? 'Venda registrada com sucesso!' : 'Devolução registrada com sucesso!',
                'success'
            );

            // Reset form
            document.getElementById('sale-form').reset();
            this.setCurrentDate();
            typeInput.value = 'sale';

            // Update display
            this.updateDisplay();

        } catch (error) {
            this.showAlert('Erro ao adicionar venda: ' + error.message, 'error');
        }
    }

    async editSale(index) {
        const sales = await db.getSales({
            year: this.currentYear,
            month: this.currentMonth
        });

        const sale = sales[index];
        
        // Preenche o formulário com os dados da venda
        document.getElementById('sale-date').value = sale.sale_date;
        document.getElementById('sale-value').value = sale.amount;
        document.getElementById('sale-type').value = sale.sale_type;
        document.getElementById('sale-description').value = sale.description || '';

        // Remove a venda original
        await db.deleteSale(sale.id);
        
        this.showAlert('Venda carregada para edição. Faça as alterações e clique em Adicionar.', 'info');
        this.updateDisplay();
    }

    async deleteSale(index) {
        if (!confirm('Tem certeza que deseja excluir este registro?')) {
            return;
        }

        const sales = await db.getSales({
            year: this.currentYear,
            month: this.currentMonth
        });

        const sale = sales[index];
        
        try {
            await db.deleteSale(sale.id);
            this.showAlert('Registro excluído com sucesso!', 'success');
            this.updateDisplay();
        } catch (error) {
            this.showAlert('Erro ao excluir registro: ' + error.message, 'error');
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update button states
        document.getElementById('filter-all').classList.remove('active');
        document.getElementById('filter-sales').classList.remove('active');
        document.getElementById('filter-returns').classList.remove('active');
        
        document.getElementById(`filter-${filter}`).classList.add('active');
        
        this.updateSalesTable();
    }

    sortSales(field) {
        if (this.currentSort.field === field) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.direction = 'asc';
        }
        
        this.updateSalesTable();
    }

    async updateDisplay() {
        await this.updateSalesTable();
        await this.updateMonthlySummary();
        await this.updateCharts();
    }

    async updateSalesTable() {
        const tbody = document.getElementById('sales-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        let sales = await db.getSales({
            year: this.currentYear,
            month: this.currentMonth
        });

        // Apply filter
        if (this.currentFilter === 'sales') {
            sales = sales.filter(sale => sale.sale_type === 'sale');
        } else if (this.currentFilter === 'returns') {
            sales = sales.filter(sale => sale.sale_type === 'return');
        }

        // Apply sorting
        sales.sort((a, b) => {
            let aValue, bValue;
            
            if (this.currentSort.field === 'date') {
                aValue = a.sale_date;
                bValue = b.sale_date;
            } else {
                aValue = a.amount;
                bValue = b.amount;
            }
            
            if (this.currentSort.direction === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });

        if (sales.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4 text-muted">
                        Nenhuma venda encontrada para o período selecionado
                    </td>
                </tr>
            `;
            return;
        }

        let dailyTotal = 0;
        let currentDate = null;

        sales.forEach((sale, index) => {
            const saleDate = new Date(sale.sale_date);
            const formattedDate = saleDate.toLocaleDateString('pt-BR');

            if (currentDate !== formattedDate) {
                if (currentDate !== null) {
                    this.addDailyTotalRow(tbody, currentDate, dailyTotal);
                    dailyTotal = 0;
                }
                currentDate = formattedDate;
            }

            const row = document.createElement('tr');
            row.className = sale.sale_type === 'return' ? 'return-row' : '';
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td class="${sale.sale_type === 'return' ? 'text-danger' : 'text-success'}">
                    ${sale.sale_type === 'return' ? '-' : ''}R$ ${this.formatCurrency(sale.amount)}
                </td>
                <td>
                    <span class="badge ${sale.sale_type === 'return' ? 'badge-danger' : 'badge-success'}">
                        ${sale.sale_type === 'return' ? 'Devolução' : 'Venda'}
                    </span>
                </td>
                <td>${sale.description || ''}</td>
                <td>
                    <button class="btn btn-sm btn-outline edit-sale" data-index="${index}">
                        <i>✏️</i> Editar
                    </button>
                    <button class="btn btn-sm btn-outline btn-danger delete-sale" data-index="${index}">
                        <i>🗑️</i> Excluir
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);

            if (sale.sale_type === 'return') {
                dailyTotal -= sale.amount;
            } else {
                dailyTotal += sale.amount;
            }
        });

        if (currentDate !== null) {
            this.addDailyTotalRow(tbody, currentDate, dailyTotal);
        }

        // Update sales count
        const salesCount = document.getElementById('sales-count');
        if (salesCount) {
            salesCount.textContent = sales.length;
        }
    }

    addDailyTotalRow(tbody, date, total) {
        const row = document.createElement('tr');
        row.className = 'daily-total-row';
        row.innerHTML = `
            <td colspan="2" class="font-weight-bold">
                Total ${date}: R$ ${this.formatCurrency(total)}
            </td>
            <td colspan="3"></td>
        `;
        tbody.appendChild(row);
    }

    async updateMonthlySummary() {
        const summary = await db.getMonthlySummary(this.currentYear, this.currentMonth);
        
        // Update summary cards
        this.updateElement('total-sold', summary.totalSales);
        this.updateElement('total-returns', summary.totalReturns);
        this.updateElement('net-amount', summary.netAmount);
        this.updateElement('monthly-goal-display', summary.monthlyGoal);
        this.updateElement('daily-goal', summary.dailyGoal);
        this.updateElement('average-needed', summary.averageNeeded);

        // Update progress indicator
        const progressElement = document.getElementById('progress-percentage');
        if (progressElement) {
            progressElement.textContent = `${summary.progressPercentage.toFixed(1)}%`;
            progressElement.className = `progress-percentage ${
                summary.progressPercentage >= 100 ? 'text-success' : 
                summary.progressPercentage >= 75 ? 'text-warning' : 'text-danger'
            }`;
        }
    }

    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = `R$ ${this.formatCurrency(value)}`;
        }
    }

    async updateCharts() {
        // This will be handled by the Charts class
        if (window.chartsManager) {
            await window.chartsManager.updateCharts(this.currentYear, this.currentMonth);
        }
    }

    setCurrentDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        
        const dateInput = document.getElementById('sale-date');
        if (dateInput) {
            dateInput.value = `${year}-${month}-${day}`;
        }
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    showAlert(message, type = 'info') {
        // Create alert element
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Add to page
        const container = document.querySelector('.container') || document.body;
        container.insertBefore(alert, container.firstChild);

        // Auto remove after 5 seconds
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

// Initialize sales manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.salesManager = new SalesManager();
});