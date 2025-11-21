// Authentication System
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.currentCompany = null;
        this.init();
    }

    init() {
        this.loadUserData();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }
    }

    handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            this.showAlert('Preencha todos os campos', 'error');
            return;
        }

        const user = this.authenticateUser(email, password);
        
        if (user) {
            this.login(user);
            this.showAlert('Login realizado com sucesso!', 'success');
            
            // Redirect to dashboard after short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            this.showAlert('Email ou senha incorretos', 'error');
        }
    }

    handleRegister() {
        const company = document.getElementById('register-company').value;
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        if (!company || !name || !email || !password) {
            this.showAlert('Preencha todos os campos', 'error');
            return;
        }

        if (password.length < 6) {
            this.showAlert('A senha deve ter pelo menos 6 caracteres', 'error');
            return;
        }

        const success = this.registerUser(company, name, email, password);
        
        if (success) {
            this.showAlert('Conta criada com sucesso!', 'success');
            
            // Auto login and redirect
            setTimeout(() => {
                const user = this.authenticateUser(email, password);
                if (user) {
                    this.login(user);
                    window.location.href = 'dashboard.html';
                }
            }, 1000);
        } else {
            this.showAlert('Email já cadastrado', 'error');
        }
    }

    registerUser(companyName, userName, email, password) {
        const users = this.getUsers();
        
        // Check if email already exists
        if (users.find(u => u.email === email)) {
            return false;
        }

        // Create company
        const companyId = this.generateId();
        const companies = this.getCompanies();
        companies.push({
            id: companyId,
            name: companyName,
            email: email,
            plan: 'free',
            created_at: new Date().toISOString()
        });
        localStorage.setItem('companies', JSON.stringify(companies));

        // Create user
        const userId = this.generateId();
        const user = {
            id: userId,
            company_id: companyId,
            name: userName,
            email: email,
            password_hash: this.hashPassword(password),
            role: 'admin',
            is_active: true,
            created_at: new Date().toISOString()
        };
        
        users.push(user);
        localStorage.setItem('users', JSON.stringify(users));

        return true;
    }

    authenticateUser(email, password) {
        const users = this.getUsers();
        const companies = this.getCompanies();
        
        const user = users.find(u => 
            u.email === email && 
            u.password_hash === this.hashPassword(password) &&
            u.is_active
        );

        if (user) {
            const company = companies.find(c => c.id === user.company_id);
            return {
                ...user,
                company_name: company?.name || 'Empresa',
                company_plan: company?.plan || 'free'
            };
        }

        return null;
    }

    login(user) {
        this.currentUser = user;
        this.currentCompany = {
            id: user.company_id,
            name: user.company_name,
            plan: user.company_plan
        };
        
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('currentCompany', JSON.stringify(this.currentCompany));
    }

    logout() {
        this.currentUser = null;
        this.currentCompany = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentCompany');
        window.location.href = 'index.html';
    }

    loadUserData() {
        const userData = localStorage.getItem('currentUser');
        const companyData = localStorage.getItem('currentCompany');
        
        if (userData && companyData) {
            this.currentUser = JSON.parse(userData);
            this.currentCompany = JSON.parse(companyData);
        }
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    getUsers() {
        return JSON.parse(localStorage.getItem('users') || '[]');
    }

    getCompanies() {
        return JSON.parse(localStorage.getItem('companies') || '[]');
    }

    hashPassword(password) {
        // Simple hash for demo purposes - in production use proper hashing
        return btoa(password);
    }

    generateId() {
        return 'id-' + Math.random().toString(36).substr(2, 9);
    }

    showAlert(message, type = 'info') {
        // Remove existing alerts
        const existingAlert = document.querySelector('.auth-alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        const alert = document.createElement('div');
        alert.className = `auth-alert ${type}`;
        alert.textContent = message;

        const form = document.querySelector('.auth-form');
        if (form) {
            form.parentNode.insertBefore(alert, form);
        }

        // Auto remove after 5 seconds
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

// Global auth instance
const auth = new AuthSystem();

// UI Functions
function showLogin() {
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('register-modal').classList.add('hidden');
}

function showRegister() {
    document.getElementById('register-modal').classList.remove('hidden');
    document.getElementById('login-modal').classList.add('hidden');
}

function hideModals() {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('register-modal').classList.add('hidden');
}

function logout() {
    auth.logout();
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('dashboard.html') && !auth.isLoggedIn()) {
        window.location.href = 'index.html';
    }
    
    if (window.location.pathname.includes('index.html') && auth.isLoggedIn()) {
        window.location.href = 'dashboard.html';
    }
});