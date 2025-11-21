// Main Application Controller
class SalesSystemApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeApp();
        this.checkAuthentication();
    }

    setupEventListeners() {
        // Navigation
        document.addEventListener('click', (e) => {
            if (e.target.closest('.menu-item')) {
                e.preventDefault();
                const page = e.target.closest('.menu-item').getAttribute('data-page');
                this.navigateTo(page);
            }
        });

        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => this.toggleMobileMenu());
        }

        // Goal form
        const goalForm = document.getElementById('goal-form');
        if (goalForm) {
            goalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveMonthlyGoal();
            });
        }

        // Notes form
        const notesForm = document.getElementById('notes-form');
        if (notesForm) {
            notesForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveMonthlyNotes();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case '1':
                        e.preventDefault();
                        this.navigateTo('dashboard');
                        break;
                    case '2':
                        e.preventDefault();
                        this.navigateTo('sales');
                        break;
                    case '3':
                        e.preventDefault();
                        this.navigateTo('goals');
                        break;
                    case 's':
                        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                            e.preventDefault();
                            this.navigateTo('sales');
                        }
                        break;
                }
            }
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            const page = window.location.hash.replace('#', '') || 'dashboard';
            this.navigateTo(page, false);
        });
    }

    initializeApp() {
        // Load user info
        this.loadUserInfo();
        
        // Initialize managers
        this.initializeManagers();
        
        // Load initial page from URL hash
        const initialPage = window.location.hash.replace('#', '') || 'dashboard';
        this.navigateTo(initialPage, false);
        
        // Initialize PWA
        this.initializePWA();
    }

    checkAuthentication() {
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        const onDashboard = window.location.pathname.includes('dashboard.html');
        
        if (!user && onDashboard) {
            window.location.href = 'index.html';
        } else if (user && !onDashboard && window.location.pathname.endsWith('index.html')) {
            window.location.href = 'dashboard.html';
        }
    }

    loadUserInfo() {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
        
        // Update UI with user info
        const companyNameEl = document.getElementById('company-name');
        const userNameEl = document.getElementById('user-name');
        
        if (companyNameEl) companyNameEl.textContent = company.name || 'Empresa';
        if (userNameEl) userNameEl.textContent = user.name || 'Usuário';
    }

    initializeManagers() {
        // These will be initialized automatically when their files load
        console.log('Initializing application managers...');
    }

    async navigateTo(page, updateHistory = true) {
        // Update active menu item
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`[data-page="${page}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }

        // Update current page
        this.currentPage = page;

        // Update URL hash
        if (updateHistory) {
            window.location.hash = page;
        }

        // Load page content
        await this.loadPageContent(page);
    }

    async loadPageContent(page) {
        const contentContainer = document.getElementById('app-content') || document.querySelector('.page-content');
        if (!contentContainer) return;

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            await this.initializePage(page);
            return;
        }

        // Load page dynamically
        try {
            const response = await fetch(`pages/${page}.html`);
            if (!response.ok) throw new Error('Page not found');
            
            const html = await response.text();
            contentContainer.innerHTML = html;
            await this.initializePage(page);
        } catch (error) {
            contentContainer.innerHTML = `
                <div class="page active" id="${page}-page">
                    <div class="error-page">
                        <h2>Página não encontrada</h2>
                        <p>A página "${page}" não existe ou não pôde ser carregada.</p>
                        <button onclick="app.navigateTo('dashboard')" class="btn btn-primary">
                            Voltar ao Dashboard
                        </button>
                    </div>
                </div>
            `;
        }
    }

    async initializePage(page) {
        switch(page) {
            case 'dashboard':
                await this.initializeDashboard();
                break;
            case 'sales':
                await this.initializeSales();
                break;
            case 'goals':
                await this.initializeGoals();
                break;
            case 'reports':
                await this.initializeReports();
                break;
            case 'settings':
                await this.initializeSettings();
                break;
        }

        // Update page title
        const pageTitles = {
            dashboard: 'Dashboard',
            sales: 'Vendas',
            goals: 'Metas',
            reports: 'Relatórios',
            settings: 'Configurações'
        };
        
        document.title = `${pageTitles[page] || 'Sales System'} - Sales System Pro`;
    }

    async initializeDashboard() {
        // Initialize dashboard components
        if (window.salesManager) {
            await window.salesManager.updateDisplay();
        }
        
        // Load recent sales
        await this.loadRecentSales();
    }

    async initializeSales() {
        // Sales page is handled by SalesManager
        if (window.salesManager) {
            await window.salesManager.updateDisplay();
        }
    }

    async initializeGoals() {
        const year = window.salesManager?.currentYear || new Date().getFullYear();
        const month = window.salesManager?.currentMonth || new Date().getMonth();
        
        // Load current goal
        const goal = await db.getMonthlyGoal(year, month);
        if (goal) {
            document.getElementById('monthly-goal-input').value = goal.goal_amount;
            document.getElementById('workdays-input').value = goal.workdays;
        }
        
        // Load goal history
        await this.loadGoalHistory();
    }

    async initializeReports() {
        // Reports page is handled by ReportsManager
        console.log('Initializing reports page...');
    }

    async initializeSettings() {
        // Load current settings
        this.loadSettings();
    }

    async loadRecentSales() {
        const sales = await db.getSales({ 
            year: window.salesManager.currentYear, 
            month: window.salesManager.currentMonth 
        });
        
        const recentSales = sales.slice(-5).reverse(); // Last 5 sales
        const container = document.getElementById('recent-sales-list');
        
        if (!container) return;

        if (recentSales.length === 0) {
            container.innerHTML = '<div class="text-muted">Nenhuma venda recente</div>';
            return;
        }

        container.innerHTML = recentSales.map(sale => `
            <div class="sale-item">
                <div class="sale-info">
                    <h4>${new Date(sale.sale_date).toLocaleDateString('pt-BR')}</h4>
                    <p>${sale.description || 'Venda'}</p>
                </div>
                <div class="sale-value ${sale.sale_type === 'return' ? 'negative' : 'positive'}">
                    ${sale.sale_type === 'return' ? '-' : ''}R$ ${this.formatCurrency(sale.amount)}
                </div>
            </div>
        `).join('');
    }

    async loadGoalHistory() {
        const year = window.salesManager?.currentYear || new Date().getFullYear();
        const goals = [];
        
        for (let month = 0; month < 12; month++) {
            const goal = await db.getMonthlyGoal(year, month);
            if (goal) {
                goals.push({ month, ...goal });
            }
        }
        
        const container = document.getElementById('goal-history');
        if (!container) return;

        if (goals.length === 0) {
            container.innerHTML = '<div class="text-muted">Nenhuma meta definida para este ano</div>';
            return;
        }

        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        container.innerHTML = goals.map(goal => `
            <div class="goal-history-item">
                <div class="goal-month">${monthNames[goal.month]}</div>
                <div class="goal-amount">R$ ${this.formatCurrency(goal.goal_amount)}</div>
                <div class="goal-workdays">${goal.workdays} dias</div>
            </div>
        `).join('');
    }

    async saveMonthlyGoal() {
        const year = window.salesManager.currentYear;
        const month = window.salesManager.currentMonth;
        const goalAmount = parseFloat(document.getElementById('monthly-goal-input').value);
        const workdays = parseInt(document.getElementById('workdays-input').value);

        if (isNaN(goalAmount) || goalAmount < 0 || isNaN(workdays) || workdays < 1 || workdays > 31) {
            this.showAlert('Por favor, insira valores válidos para a meta e dias úteis.', 'error');
            return;
        }

        try {
            await db.saveMonthlyGoal(year, month, {
                goal_amount: goalAmount,
                workdays: workdays
            });

            this.showAlert('Meta salva com sucesso!', 'success');
            
            // Update displays
            if (window.salesManager) {
                await window.salesManager.updateDisplay();
            }
            
            await this.loadGoalHistory();

        } catch (error) {
            this.showAlert('Erro ao salvar meta: ' + error.message, 'error');
        }
    }

    async saveMonthlyNotes() {
        const year = window.salesManager.currentYear;
        const month = window.salesManager.currentMonth;
        const notes = document.getElementById('monthly-notes').value;

        try {
            await db.saveMonthlyNotes(year, month, notes);
            this.showAlert('Anotações salvas com sucesso!', 'success');
        } catch (error) {
            this.showAlert('Erro ao salvar anotações: ' + error.message, 'error');
        }
    }

    loadSettings() {
        // Load user settings from localStorage
        const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
        
        // Apply settings to form elements
        Object.keys(settings).forEach(key => {
            const element = document.getElementById(`setting-${key}`);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = settings[key];
                } else {
                    element.value = settings[key];
                }
            }
        });
    }

    saveSettings() {
        const settings = {};
        const elements = document.querySelectorAll('[id^="setting-"]');
        
        elements.forEach(element => {
            const key = element.id.replace('setting-', '');
            settings[key] = element.type === 'checkbox' ? element.checked : element.value;
        });
        
        localStorage.setItem('userSettings', JSON.stringify(settings));
        this.showAlert('Configurações salvas com sucesso!', 'success');
    }

    toggleMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('mobile-open');
    }

    initializePWA() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        }

        // Add to home screen prompt
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install prompt
            this.showInstallPrompt();
        });

        // Track app installed
        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            deferredPrompt = null;
        });
    }

    showInstallPrompt() {
        // You can implement a custom install prompt here
        console.log('App can be installed');
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            padding: 12px 20px;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            max-width: 400px;
            ${type === 'success' ? 'background: #10b981;' : ''}
            ${type === 'error' ? 'background: #ef4444;' : ''}
            ${type === 'info' ? 'background: #3b82f6;' : ''}
            ${type === 'warning' ? 'background: #f59e0b;' : ''}
        `;
        alert.textContent = message;

        document.body.appendChild(alert);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    }

    // Utility method to check if user is admin
    isUserAdmin() {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return user.role === 'admin';
    }

    // Data cleanup utility
    async cleanupOldData() {
        const confirmCleanup = confirm(
            'Isso irá remover vendas com mais de 2 anos. Deseja continuar?'
        );
        
        if (!confirmCleanup) return;

        try {
            const twoYearsAgo = new Date();
            twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
            
            const allSales = await db.getSales();
            const recentSales = allSales.filter(sale => {
                const saleDate = new Date(sale.sale_date);
                return saleDate >= twoYearsAgo;
            });

            // Replace all sales with only recent ones
            db.setTable('sales', recentSales);
            
            this.showAlert(
                `Limpeza concluída! ${allSales.length - recentSales.length} registros antigos removidos.`,
                'success'
            );
            
        } catch (error) {
            this.showAlert('Erro na limpeza de dados: ' + error.message, 'error');
        }
    }
}

// Global app instance
const app = new SalesSystemApp();

// Make app globally available
window.app = app;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new SalesSystemApp();
    });
} else {
    window.app = new SalesSystemApp();
}