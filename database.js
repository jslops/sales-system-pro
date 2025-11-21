// Database System for Local Storage
class Database {
    constructor() {
        this.tables = {
            'sales': 'sales_data',
            'monthly_goals': 'monthly_goals_data',
            'monthly_notes': 'monthly_notes_data',
            'users': 'users_data',
            'companies': 'companies_data'
        };
        this.init();
    }

    init() {
        // Initialize empty tables if they don't exist
        Object.values(this.tables).forEach(table => {
            if (!localStorage.getItem(table)) {
                localStorage.setItem(table, JSON.stringify([]));
            }
        });
    }

    // Sales operations
    async getSales(filters = {}) {
        const sales = this.getTable('sales');
        let filtered = sales.filter(sale => sale.company_id === this.getCompanyId());

        if (filters.year !== undefined) {
            filtered = filtered.filter(sale => {
                const saleYear = new Date(sale.sale_date).getFullYear();
                return saleYear === parseInt(filters.year);
            });
        }

        if (filters.month !== undefined) {
            filtered = filtered.filter(sale => {
                const saleMonth = new Date(sale.sale_date).getMonth();
                return saleMonth === parseInt(filters.month);
            });
        }

        if (filters.type && filters.type !== 'all') {
            filtered = filtered.filter(sale => sale.sale_type === filters.type);
        }

        return filtered;
    }

    async addSale(saleData) {
        const sales = this.getTable('sales');
        const newSale = {
            id: this.generateId(),
            company_id: this.getCompanyId(),
            user_id: this.getUserId(),
            ...saleData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        sales.push(newSale);
        this.setTable('sales', sales);
        return newSale;
    }

    async updateSale(saleId, saleData) {
        const sales = this.getTable('sales');
        const index = sales.findIndex(s => s.id === saleId && s.company_id === this.getCompanyId());
        
        if (index !== -1) {
            sales[index] = {
                ...sales[index],
                ...saleData,
                updated_at: new Date().toISOString()
            };
            this.setTable('sales', sales);
            return sales[index];
        }
        return null;
    }

    async deleteSale(saleId) {
        const sales = this.getTable('sales');
        const filtered = sales.filter(s => !(s.id === saleId && s.company_id === this.getCompanyId()));
        this.setTable('sales', filtered);
        return true;
    }

    // Monthly Goals operations
    async getMonthlyGoal(year, month) {
        const goals = this.getTable('monthly_goals');
        return goals.find(g => 
            g.company_id === this.getCompanyId() && 
            g.year === year && 
            g.month === month
        );
    }

    async saveMonthlyGoal(year, month, goalData) {
        const goals = this.getTable('monthly_goals');
        const existingIndex = goals.findIndex(g => 
            g.company_id === this.getCompanyId() && 
            g.year === year && 
            g.month === month
        );

        const goal = {
            id: this.generateId(),
            company_id: this.getCompanyId(),
            year,
            month,
            ...goalData,
            created_at: new Date().toISOString()
        };

        if (existingIndex !== -1) {
            goals[existingIndex] = goal;
        } else {
            goals.push(goal);
        }

        this.setTable('monthly_goals', goals);
        return goal;
    }

    // Monthly Notes operations
    async getMonthlyNotes(year, month) {
        const notes = this.getTable('monthly_notes');
        return notes.find(n => 
            n.company_id === this.getCompanyId() && 
            n.year === year && 
            n.month === month
        );
    }

    async saveMonthlyNotes(year, month, notesText) {
        const notes = this.getTable('monthly_notes');
        const existingIndex = notes.findIndex(n => 
            n.company_id === this.getCompanyId() && 
            n.year === year && 
            n.month === month
        );

        const note = {
            id: this.generateId(),
            company_id: this.getCompanyId(),
            year,
            month,
            notes: notesText,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (existingIndex !== -1) {
            notes[existingIndex] = note;
        } else {
            notes.push(note);
        }

        this.setTable('monthly_notes', notes);
        return note;
    }

    // Utility methods
    getTable(tableName) {
        const key = this.tables[tableName];
        return JSON.parse(localStorage.getItem(key) || '[]');
    }

    setTable(tableName, data) {
        const key = this.tables[tableName];
        localStorage.setItem(key, JSON.stringify(data));
    }

    getCompanyId() {
        const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
        return company.id;
    }

    getUserId() {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return user.id;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Backup and restore
    async exportData() {
        const data = {};
        Object.keys(this.tables).forEach(table => {
            data[table] = this.getTable(table);
        });
        return data;
    }

    async importData(data) {
        Object.keys(data).forEach(table => {
            if (this.tables[table]) {
                this.setTable(table, data[table]);
            }
        });
        return true;
    }

    // Statistics
    async getMonthlySummary(year, month) {
        const sales = await this.getSales({ year, month });
        
        const totalSold = sales
            .filter(sale => sale.sale_type === 'sale')
            .reduce((sum, sale) => sum + parseFloat(sale.amount), 0);
            
        const totalReturns = sales
            .filter(sale => sale.sale_type === 'return')
            .reduce((sum, sale) => sum + parseFloat(sale.amount), 0);
            
        const netAmount = totalSold - totalReturns;
        
        const goal = await this.getMonthlyGoal(year, month);
        const monthlyGoal = goal ? parseFloat(goal.goal_amount) : 0;
        const workdays = goal ? goal.workdays : 22;

        const progressPercentage = monthlyGoal > 0 ? Math.min(100, (netAmount / monthlyGoal) * 100) : 0;
        const dailyGoal = workdays > 0 ? monthlyGoal / workdays : 0;
        const averageNeeded = workdays > 0 ? monthlyGoal / workdays : 0;

        return {
            totalSales: totalSold,
            totalReturns: totalReturns,
            netAmount: netAmount,
            salesCount: sales.filter(s => s.sale_type === 'sale').length,
            returnsCount: sales.filter(s => s.sale_type === 'return').length,
            monthlyGoal,
            workdays,
            dailyGoal,
            averageNeeded,
            progressPercentage
        };
    }

    async getAnnualReport(year) {
        const monthlyData = [];
        
        for (let month = 0; month < 12; month++) {
            const summary = await this.getMonthlySummary(year, month);
            monthlyData.push({
                month,
                ...summary
            });
        }

        const annualTotal = monthlyData.reduce((sum, month) => sum + month.netAmount, 0);
        const annualSales = monthlyData.reduce((sum, month) => sum + month.totalSales, 0);
        const annualReturns = monthlyData.reduce((sum, month) => sum + month.totalReturns, 0);

        return {
            year,
            monthlyData,
            annualTotal,
            annualSales,
            annualReturns,
            monthsWithData: monthlyData.filter(month => month.salesCount > 0 || month.returnsCount > 0).length
        };
    }
}

// Global database instance
const db = new Database();