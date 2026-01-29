// app.js - Main Application Logic
import { AuthService, DatabaseService, initializeSudoAccount } from './firebase.js';

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = 'dd3lcymrk';
const CLOUDINARY_UPLOAD_PRESET = 'h3eyhc2o';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

// Application State
let currentUser = null;
let applicationState = {
    currentView: 'dashboard',
    currentRole: null,
    notifications: [],
    unreadNotifications: 0,
    systemStats: {},
    loanSettings: {
        minAmount: 500,
        maxAmount: 50000,
        interestRate: 15,
        durations: [1, 3, 6, 12],
        penaltyRate: 5
    }
};

// DOM Elements
const elements = {
    // Login Screen
    loginScreen: document.getElementById('loginScreen'),
    loginBtn: document.getElementById('loginBtn'),
    emailInput: document.getElementById('email'),
    passwordInput: document.getElementById('password'),
    otpContainer: document.getElementById('otpContainer'),
    otpInput: document.getElementById('otp'),
    showRegister: document.getElementById('showRegister'),
    
    // Main App
    appContainer: document.getElementById('appContainer'),
    appName: document.getElementById('appName'),
    topNav: document.getElementById('topNav'),
    userMenu: document.getElementById('userMenu'),
    userDropdown: document.getElementById('userDropdown'),
    userName: document.getElementById('userName'),
    userAvatar: document.getElementById('userAvatar'),
    notificationBadge: document.getElementById('notificationBadge'),
    notificationsBtn: document.getElementById('notificationsBtn'),
    notificationsPanel: document.getElementById('notificationsPanel'),
    notificationsList: document.getElementById('notificationsList'),
    quickActionsBtn: document.getElementById('quickActionsBtn'),
    quickActionsPanel: document.getElementById('quickActionsPanel'),
    quickActionsGrid: document.getElementById('quickActionsGrid'),
    contentArea: document.getElementById('contentArea'),
    statusRole: document.getElementById('statusRole'),
    statusConnection: document.getElementById('statusConnection'),
    statusLastSync: document.getElementById('statusLastSync'),
    statusLoans: document.getElementById('statusLoans'),
    statusRevenue: document.getElementById('statusRevenue'),
    statusSystem: document.getElementById('statusSystem'),
    
    // Navigation
    navDashboard: document.getElementById('navDashboard'),
    navLoans: document.getElementById('navLoans'),
    navCustomers: document.getElementById('navCustomers'),
    navAgents: document.getElementById('navAgents'),
    navReports: document.getElementById('navReports'),
    navSettings: document.getElementById('navSettings'),
    
    // Modals
    registerModal: document.getElementById('registerModal'),
    createAdminModal: document.getElementById('createAdminModal'),
    createCustomerModal: document.getElementById('createCustomerModal'),
    applyLoanModal: document.getElementById('applyLoanModal'),
    modalOverlay: document.getElementById('modalOverlay'),
    
    // Toast Container
    toastContainer: document.getElementById('toastContainer')
};

// Initialize Application
class TruCashApp {
    constructor() {
        this.initializeEventListeners();
        this.initializeSystem();
        this.updateSystemTime();
        setInterval(() => this.updateSystemTime(), 60000); // Update every minute
    }
    
    initializeEventListeners() {
        // Login
        elements.loginBtn.addEventListener('click', () => this.handleLogin());
        elements.emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        elements.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        
        // Register
        elements.showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            this.showModal(elements.registerModal);
        });
        
        // Navigation
        elements.navDashboard.addEventListener('click', () => this.loadDashboard());
        elements.navLoans.addEventListener('click', () => this.loadLoansView());
        elements.navCustomers.addEventListener('click', () => this.loadCustomersView());
        elements.navAgents.addEventListener('click', () => this.loadAgentsView());
        elements.navReports.addEventListener('click', () => this.loadReportsView());
        elements.navSettings.addEventListener('click', () => this.loadSettingsView());
        
        // User Menu
        elements.userMenu.addEventListener('click', () => this.toggleUserDropdown());
        elements.notificationsBtn.addEventListener('click', () => this.toggleNotificationsPanel());
        elements.quickActionsBtn.addEventListener('click', () => this.toggleQuickActionsPanel());
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!elements.userMenu.contains(e.target) && !elements.userDropdown.contains(e.target)) {
                elements.userDropdown.style.display = 'none';
            }
            if (!elements.notificationsBtn.contains(e.target) && !elements.notificationsPanel.contains(e.target)) {
                elements.notificationsPanel.style.display = 'none';
            }
            if (!elements.quickActionsBtn.contains(e.target) && !elements.quickActionsPanel.contains(e.target)) {
                elements.quickActionsPanel.style.display = 'none';
            }
        });
        
        // Modal close buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });
        
        elements.modalOverlay.addEventListener('click', () => this.closeAllModals());
    }
    
    async initializeSystem() {
        // Hide preloader after 2 seconds
        setTimeout(() => {
            document.querySelector('.preloader').style.display = 'none';
        }, 2000);
        
        // Initialize Sudo account
        await initializeSudoAccount();
        
        // Check auth state
        AuthService.onAuthStateChanged(async (user) => {
            if (user) {
                // User is signed in
                currentUser = await AuthService.getCurrentUser();
                if (currentUser) {
                    await this.onUserAuthenticated(currentUser);
                }
            } else {
                // User is signed out
                this.showLoginScreen();
            }
        });
    }
    
    async handleLogin() {
        const email = elements.emailInput.value.trim();
        const password = elements.passwordInput.value;
        
        if (!email || !password) {
            this.showToast('Please enter both email and password', 'warning');
            return;
        }
        
        elements.loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
        elements.loginBtn.disabled = true;
        
        const result = await AuthService.signIn(email, password);
        
        if (result.success) {
            currentUser = result.user;
            this.showToast(`Welcome back, ${currentUser.fullName || currentUser.email}!`, 'success');
        } else {
            this.showToast(result.error, 'danger');
            elements.loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            elements.loginBtn.disabled = false;
        }
    }
    
    async onUserAuthenticated(user) {
        // Hide login screen, show app
        elements.loginScreen.style.display = 'none';
        elements.appContainer.style.display = 'flex';
        
        // Set user info
        elements.userName.textContent = user.fullName || user.email.split('@')[0];
        elements.statusRole.textContent = `Role: ${user.role.toUpperCase()}`;
        
        // Set theme based on role
        this.setTheme(user.role);
        
        // Update app name
        elements.appName.textContent = `TruCash OS - ${user.role.toUpperCase()}`;
        
        // Load user-specific data
        await this.loadUserData(user);
        
        // Set up real-time listeners
        this.setupRealtimeListeners(user);
        
        // Load dashboard
        this.loadDashboard();
    }
    
    setTheme(role) {
        // Remove all theme classes
        document.body.classList.remove('sudo-theme', 'admin-theme', 'agent-theme', 'customer-theme');
        
        // Add current theme class
        switch(role) {
            case 'sudo':
                document.body.classList.add('sudo-theme');
                break;
            case 'admin':
                document.body.classList.add('admin-theme');
                break;
            case 'agent':
                document.body.classList.add('agent-theme');
                break;
            case 'customer':
                document.body.classList.add('customer-theme');
                break;
        }
    }
    
    async loadUserData(user) {
        // Load notifications
        await this.loadNotifications(user.uid);
        
        // Load system stats
        await this.loadSystemStats(user);
        
        // Set up quick actions based on role
        this.setupQuickActions(user.role);
    }
    
    async loadNotifications(userId) {
        // In a real implementation, this would fetch from Firebase
        // For now, we'll use mock data
        const mockNotifications = [
            {
                id: 1,
                type: 'info',
                title: 'System Update',
                message: 'System maintenance scheduled for tonight at 2 AM',
                time: '2 hours ago',
                read: false
            },
            {
                id: 2,
                type: 'success',
                title: 'Loan Approved',
                message: 'Your loan application for ZMW 5,000 has been approved',
                time: '1 day ago',
                read: true
            },
            {
                id: 3,
                type: 'warning',
                title: 'Payment Due',
                message: 'Loan installment of ZMW 1,200 is due in 3 days',
                time: '2 days ago',
                read: false
            }
        ];
        
        applicationState.notifications = mockNotifications;
        applicationState.unreadNotifications = mockNotifications.filter(n => !n.read).length;
        
        this.updateNotificationBadge();
        this.renderNotifications();
    }
    
    updateNotificationBadge() {
        elements.notificationBadge.textContent = applicationState.unreadNotifications;
        if (applicationState.unreadNotifications > 0) {
            elements.notificationBadge.style.display = 'flex';
        } else {
            elements.notificationBadge.style.display = 'none';
        }
    }
    
    renderNotifications() {
        elements.notificationsList.innerHTML = '';
        
        applicationState.notifications.forEach(notification => {
            const notificationEl = document.createElement('div');
            notificationEl.className = `notification-item ${notification.read ? '' : 'unread'}`;
            notificationEl.innerHTML = `
                <div class="notification-icon ${notification.type}">
                    <i class="fas fa-${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${notification.time}</div>
                </div>
            `;
            
            notificationEl.addEventListener('click', () => this.markNotificationAsRead(notification.id));
            elements.notificationsList.appendChild(notificationEl);
        });
    }
    
    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            warning: 'exclamation-triangle',
            danger: 'exclamation-circle',
            info: 'info-circle'
        };
        return icons[type] || 'bell';
    }
    
    markNotificationAsRead(notificationId) {
        const notification = applicationState.notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            applicationState.unreadNotifications--;
            this.updateNotificationBadge();
            this.renderNotifications();
        }
    }
    
    setupQuickActions(role) {
        elements.quickActionsGrid.innerHTML = '';
        
        const actions = this.getQuickActionsForRole(role);
        
        actions.forEach(action => {
            const actionEl = document.createElement('div');
            actionEl.className = 'quick-action';
            actionEl.innerHTML = `
                <i class="fas fa-${action.icon}"></i>
                <span>${action.label}</span>
            `;
            
            actionEl.addEventListener('click', () => this.handleQuickAction(action.action));
            elements.quickActionsGrid.appendChild(actionEl);
        });
    }
    
    getQuickActionsForRole(role) {
        const actions = {
            sudo: [
                { icon: 'user-plus', label: 'Create Admin', action: 'createAdmin' },
                { icon: 'cog', label: 'System Settings', action: 'systemSettings' },
                { icon: 'chart-bar', label: 'View Reports', action: 'viewReports' },
                { icon: 'users', label: 'Manage Agents', action: 'manageAgents' },
                { icon: 'money-check-alt', label: 'Loan Settings', action: 'loanSettings' },
                { icon: 'download', label: 'Export Data', action: 'exportData' }
            ],
            admin: [
                { icon: 'user-check', label: 'Verify Agent', action: 'verifyAgent' },
                { icon: 'user-check', label: 'Verify Customer', action: 'verifyCustomer' },
                { icon: 'file-invoice-dollar', label: 'Review Loans', action: 'reviewLoans' },
                { icon: 'money-bill-wave', label: 'Confirm Payment', action: 'confirmPayment' },
                { icon: 'exclamation-triangle', label: 'Overdue Loans', action: 'overdueLoans' },
                { icon: 'chart-line', label: 'Daily Revenue', action: 'dailyRevenue' }
            ],
            agent: [
                { icon: 'user-plus', label: 'Add Customer', action: 'addCustomer' },
                { icon: 'file-alt', label: 'Apply Loan', action: 'applyLoan' },
                { icon: 'users', label: 'My Customers', action: 'myCustomers' },
                { icon: 'chart-pie', label: 'Commissions', action: 'commissions' },
                { icon: 'bell', label: 'Alerts', action: 'alerts' },
                { icon: 'phone-alt', label: 'Contact Support', action: 'contactSupport' }
            ],
            customer: [
                { icon: 'file-invoice-dollar', label: 'Apply Loan', action: 'applyLoan' },
                { icon: 'calendar-check', label: 'Repayment Plan', action: 'repaymentPlan' },
                { icon: 'upload', label: 'Upload Docs', action: 'uploadDocs' },
                { icon: 'history', label: 'Loan History', action: 'loanHistory' },
                { icon: 'question-circle', label: 'Help', action: 'help' },
                { icon: 'phone-alt', label: 'Contact Agent', action: 'contactAgent' }
            ]
        };
        
        return actions[role] || [];
    }
    
    handleQuickAction(action) {
        switch(action) {
            case 'createAdmin':
                this.showCreateAdminModal();
                break;
            case 'addCustomer':
                this.showCreateCustomerModal();
                break;
            case 'applyLoan':
                this.showApplyLoanModal();
                break;
            case 'systemSettings':
                this.loadSettingsView();
                break;
            case 'viewReports':
                this.loadReportsView();
                break;
            default:
                this.showToast(`Action "${action}" clicked`, 'info');
        }
        
        this.closeAllPanels();
    }
    
    async loadSystemStats(user) {
        const stats = await DatabaseService.getDashboardStats(user.role, user.uid);
        if (stats) {
            applicationState.systemStats = stats;
            
            // Update status bar
            elements.statusLoans.textContent = `Active Loans: ${stats.activeLoans}`;
            elements.statusRevenue.textContent = `Today's Revenue: ZMW ${stats.totalRevenue.toLocaleString()}`;
        }
    }
    
    setupRealtimeListeners(user) {
        // Set up real-time updates for various data
        // This would connect to Firebase real-time database listeners
        
        // Simulate real-time updates
        setInterval(async () => {
            await this.loadSystemStats(user);
            elements.statusLastSync.innerHTML = `<i class="fas fa-sync"></i> Synced ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }, 30000); // Update every 30 seconds
    }
    
    updateSystemTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const dateString = now.toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric'});
        
        elements.systemTime.textContent = `${timeString} - ${dateString}`;
    }
    
    // View Loaders
    async loadDashboard() {
        this.setActiveNav('navDashboard');
        applicationState.currentView = 'dashboard';
        
        let dashboardHTML = '';
        
        switch(currentUser.role) {
            case 'sudo':
                dashboardHTML = this.getSudoDashboard();
                break;
            case 'admin':
                dashboardHTML = this.getAdminDashboard();
                break;
            case 'agent':
                dashboardHTML = this.getAgentDashboard();
                break;
            case 'customer':
                dashboardHTML = this.getCustomerDashboard();
                break;
        }
        
        elements.contentArea.innerHTML = dashboardHTML;
        
        // Initialize dashboard components
        this.initializeDashboardComponents();
    }
    
    getSudoDashboard() {
        const stats = applicationState.systemStats;
        
        return `
            <div class="dashboard sudo-dashboard">
                <!-- Row 1: Key Metrics -->
                <div class="dashboard-card stat-card" style="grid-column: span 3; grid-row: span 2;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-chart-line"></i> Total Loans Issued
                        </div>
                    </div>
                    <div class="stat-value">ZMW ${(stats.totalAmount || 0).toLocaleString()}</div>
                    <div class="stat-label">
                        <span>${stats.totalLoans || 0} loans</span>
                        <span class="stat-change positive">+12%</span>
                    </div>
                </div>
                
                <div class="dashboard-card stat-card" style="grid-column: span 3; grid-row: span 2;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-money-bill-wave"></i> Total Repayments
                        </div>
                    </div>
                    <div class="stat-value">ZMW ${(stats.totalRepaid || 0).toLocaleString()}</div>
                    <div class="stat-label">
                        <span>${stats.totalLoans || 0} loans</span>
                        <span class="stat-change positive">+8%</span>
                    </div>
                </div>
                
                <div class="dashboard-card stat-card" style="grid-column: span 3; grid-row: span 2;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-exclamation-triangle"></i> Overdue Loans
                        </div>
                    </div>
                    <div class="stat-value">${stats.overdueLoans || 0}</div>
                    <div class="stat-label">
                        <span>ZMW ${((stats.overdueLoans || 0) * 5000).toLocaleString()} value</span>
                        <span class="stat-change negative">+3%</span>
                    </div>
                </div>
                
                <div class="dashboard-card stat-card" style="grid-column: span 3; grid-row: span 2;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-times-circle"></i> Defaulted Loans
                        </div>
                    </div>
                    <div class="stat-value">${stats.defaultedLoans || 0}</div>
                    <div class="stat-label">
                        <span>ZMW ${((stats.defaultedLoans || 0) * 7500).toLocaleString()} value</span>
                        <span class="stat-change negative">+1%</span>
                    </div>
                </div>
                
                <!-- Row 2: Revenue Summary -->
                <div class="dashboard-card" style="grid-column: span 6; grid-row: span 3;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-chart-pie"></i> Revenue & Profit Summary
                        </div>
                        <div class="dashboard-card-actions">
                            <div class="dashboard-card-action">
                                <i class="fas fa-ellipsis-h"></i>
                            </div>
                        </div>
                    </div>
                    <div class="chart-container">
                        <!-- Revenue chart would go here -->
                        <div style="height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; color: var(--sudo-text-secondary);">
                            <i class="fas fa-chart-bar" style="font-size: 48px; margin-bottom: 16px;"></i>
                            <p>Revenue chart would display here</p>
                        </div>
                    </div>
                </div>
                
                <!-- Row 2: Agent Leaderboard -->
                <div class="dashboard-card" style="grid-column: span 6; grid-row: span 3;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-trophy"></i> Agent Performance Leaderboard
                        </div>
                        <div class="dashboard-card-actions">
                            <div class="dashboard-card-action">
                                <i class="fas fa-redo"></i>
                            </div>
                        </div>
                    </div>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Agent</th>
                                <th>Loans</th>
                                <th>Amount</th>
                                <th>Performance</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>1</td>
                                <td>John Doe (TRU24001)</td>
                                <td>24</td>
                                <td>ZMW 120,000</td>
                                <td><span class="status-badge approved">Excellent</span></td>
                            </tr>
                            <tr>
                                <td>2</td>
                                <td>Jane Smith (TRU24002)</td>
                                <td>18</td>
                                <td>ZMW 90,000</td>
                                <td><span class="status-badge approved">Good</span></td>
                            </tr>
                            <tr>
                                <td>3</td>
                                <td>Mike Johnson (TRU24003)</td>
                                <td>15</td>
                                <td>ZMW 75,000</td>
                                <td><span class="status-badge approved">Good</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <!-- Row 3: Risk Alerts -->
                <div class="dashboard-card" style="grid-column: span 6; grid-row: span 3;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-shield-alt"></i> Risk Alerts Panel
                        </div>
                        <div class="dashboard-card-actions">
                            <div class="dashboard-card-action">
                                <i class="fas fa-filter"></i>
                            </div>
                        </div>
                    </div>
                    <div style="padding: 16px;">
                        <div class="alert-item" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255, 59, 48, 0.1); border-radius: 8px; margin-bottom: 8px;">
                            <div style="color: var(--danger); font-size: 20px;">
                                <i class="fas fa-exclamation-circle"></i>
                            </div>
                            <div>
                                <div style="font-weight: 500;">High-risk loan detected</div>
                                <div style="font-size: 12px; color: var(--sudo-text-secondary);">Loan ID: L-24001-001 (ZMW 25,000) - 45 days overdue</div>
                            </div>
                        </div>
                        <div class="alert-item" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255, 149, 0, 0.1); border-radius: 8px; margin-bottom: 8px;">
                            <div style="color: var(--warning); font-size: 20px;">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <div>
                                <div style="font-weight: 500;">Agent performance decline</div>
                                <div style="font-size: 12px; color: var(--sudo-text-secondary);">Agent TRU24005: 3 consecutive defaults</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Row 3: System Activity -->
                <div class="dashboard-card" style="grid-column: span 6; grid-row: span 3;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-history"></i> System Activity Log
                        </div>
                        <div class="dashboard-card-actions">
                            <div class="dashboard-card-action">
                                <i class="fas fa-download"></i>
                            </div>
                        </div>
                    </div>
                    <div style="padding: 16px; max-height: 200px; overflow-y: auto;">
                        <div class="activity-item" style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <div style="display: flex; justify-content: space-between;">
                                <span style="font-size: 12px; color: var(--sudo-text-secondary);">Loan L-24001-005 approved</span>
                                <span style="font-size: 11px; color: var(--sudo-text-secondary);">2 min ago</span>
                            </div>
                            <div style="font-size: 11px; color: var(--sudo-text-secondary);">By: Admin User (admin@trucash.com)</div>
                        </div>
                        <div class="activity-item" style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <div style="display: flex; justify-content: space-between;">
                                <span style="font-size: 12px; color: var(--sudo-text-secondary);">New customer registered</span>
                                <span style="font-size: 11px; color: var(--sudo-text-secondary);">15 min ago</span>
                            </div>
                            <div style="font-size: 11px; color: var(--sudo-text-secondary);">Agent: TRU24001 (John Doe)</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    getAdminDashboard() {
        const stats = applicationState.systemStats;
        
        return `
            <div class="dashboard admin-dashboard">
                <!-- Row 1: Key Metrics -->
                <div class="dashboard-card stat-card" style="grid-column: span 3; grid-row: span 2;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-user-clock"></i> Pending Agents
                        </div>
                    </div>
                    <div class="stat-value">12</div>
                    <div class="stat-label">
                        <span>Awaiting verification</span>
                        <button class="btn btn-sm btn-primary" style="margin-left: auto;" onclick="app.showPendingAgents()">Review</button>
                    </div>
                </div>
                
                <div class="dashboard-card stat-card" style="grid-column: span 3; grid-row: span 2;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-user-clock"></i> Pending Customers
                        </div>
                    </div>
                    <div class="stat-value">24</div>
                    <div class="stat-label">
                        <span>Awaiting verification</span>
                        <button class="btn btn-sm btn-primary" style="margin-left: auto;" onclick="app.showPendingCustomers()">Review</button>
                    </div>
                </div>
                
                <div class="dashboard-card stat-card" style="grid-column: span 3; grid-row: span 2;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-file-alt"></i> Pending Loans
                        </div>
                    </div>
                    <div class="stat-value">${stats.pendingLoans || 0}</div>
                    <div class="stat-label">
                        <span>Awaiting approval</span>
                        <button class="btn btn-sm btn-primary" style="margin-left: auto;" onclick="app.showPendingLoans()">Review</button>
                    </div>
                </div>
                
                <div class="dashboard-card stat-card" style="grid-column: span 3; grid-row: span 2;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-exclamation-triangle"></i> Overdue Loans
                        </div>
                    </div>
                    <div class="stat-value">${stats.overdueLoans || 0}</div>
                    <div class="stat-label">
                        <span>Requiring attention</span>
                        <button class="btn btn-sm btn-danger" style="margin-left: auto;" onclick="app.showOverdueLoans()">View</button>
                    </div>
                </div>
                
                <!-- Row 2: Daily Summary -->
                <div class="dashboard-card" style="grid-column: span 8; grid-row: span 4;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-chart-bar"></i> Daily Revenue Summary
                        </div>
                        <div class="dashboard-card-actions">
                            <div class="dashboard-card-action">
                                <i class="fas fa-calendar-alt"></i>
                            </div>
                        </div>
                    </div>
                    <div style="padding: 20px;">
                        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; height: 150px; align-items: end;">
                            ${[12000, 15000, 18000, 22000, 19000, 25000, 21000].map(amount => `
                                <div style="display: flex; flex-direction: column; align-items: center;">
                                    <div style="width: 30px; background: var(--admin-accent); border-radius: 4px 4px 0 0; height: ${(amount / 30000) * 100}px;"></div>
                                    <div style="font-size: 10px; margin-top: 5px;">ZMW ${(amount/1000).toFixed(0)}K</div>
                                </div>
                            `).join('')}
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-top: 20px; font-size: 11px; color: var(--admin-text-secondary);">
                            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                        </div>
                    </div>
                </div>
                
                <!-- Row 2: Quick Actions -->
                <div class="dashboard-card" style="grid-column: span 4; grid-row: span 4;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-bolt"></i> Quick Actions
                        </div>
                    </div>
                    <div style="padding: 20px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                        <button class="btn btn-primary" style="height: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center;" onclick="app.showVerifyAgent()">
                            <i class="fas fa-user-check" style="font-size: 24px; margin-bottom: 8px;"></i>
                            <span>Verify Agent</span>
                        </button>
                        <button class="btn btn-success" style="height: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center;" onclick="app.approveLoan()">
                            <i class="fas fa-check-circle" style="font-size: 24px; margin-bottom: 8px;"></i>
                            <span>Approve Loan</span>
                        </button>
                        <button class="btn btn-warning" style="height: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center;" onclick="app.reviewCollateral()">
                            <i class="fas fa-images" style="font-size: 24px; margin-bottom: 8px;"></i>
                            <span>Review Collateral</span>
                        </button>
                        <button class="btn btn-info" style="height: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center;" onclick="app.generateReport()">
                            <i class="fas fa-file-export" style="font-size: 24px; margin-bottom: 8px;"></i>
                            <span>Generate Report</span>
                        </button>
                    </div>
                </div>
                
                <!-- Row 3: Recent Activity -->
                <div class="dashboard-card" style="grid-column: span 12; grid-row: span 3;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-list-alt"></i> Recent Loan Applications
                        </div>
                        <div class="dashboard-card-actions">
                            <div class="dashboard-card-action">
                                <i class="fas fa-redo"></i>
                            </div>
                        </div>
                    </div>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Loan ID</th>
                                <th>Customer</th>
                                <th>Agent</th>
                                <th>Amount</th>
                                <th>Collateral</th>
                                <th>Status</th>
                                <th>Applied</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>L-24001-001</td>
                                <td>Mary Banda</td>
                                <td>TRU24001</td>
                                <td>ZMW 15,000</td>
                                <td>Vehicle</td>
                                <td><span class="status-badge pending">Pending</span></td>
                                <td>2 hours ago</td>
                                <td>
                                    <button class="btn btn-sm btn-primary">Review</button>
                                </td>
                            </tr>
                            <tr>
                                <td>L-24001-002</td>
                                <td>John Phiri</td>
                                <td>TRU24002</td>
                                <td>ZMW 8,000</td>
                                <td>Electronics</td>
                                <td><span class="status-badge pending">Pending</span></td>
                                <td>4 hours ago</td>
                                <td>
                                    <button class="btn btn-sm btn-primary">Review</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    getAgentDashboard() {
        const stats = applicationState.systemStats;
        
        return `
            <div class="dashboard agent-dashboard">
                <!-- Agent ID Card -->
                <div class="dashboard-card" style="grid-column: span 4; grid-row: span 2; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <div style="font-size: 11px; color: var(--agent-text-secondary); margin-bottom: 8px;">YOUR AGENT ID</div>
                    <div style="font-size: 32px; font-weight: 700; color: var(--agent-accent); letter-spacing: 2px;">${currentUser.agentId || 'TRU24001'}</div>
                    <div style="margin-top: 16px; text-align: center;">
                        <div style="font-size: 14px; font-weight: 500;">${currentUser.fullName || 'Agent Name'}</div>
                        <div style="font-size: 12px; color: var(--agent-text-secondary);">${currentUser.status || 'Active'}</div>
                    </div>
                </div>
                
                <!-- Key Stats -->
                <div class="dashboard-card stat-card" style="grid-column: span 2; grid-row: span 2;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-users"></i> Customers
                        </div>
                    </div>
                    <div class="stat-value">${stats.totalCustomers || 0}</div>
                    <div class="stat-label">
                        <span>Total onboarded</span>
                        <span class="stat-change positive">+3</span>
                    </div>
                </div>
                
                <div class="dashboard-card stat-card" style="grid-column: span 2; grid-row: span 2;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-hand-holding-usd"></i> Active Loans
                        </div>
                    </div>
                    <div class="stat-value">${stats.activeLoans || 0}</div>
                    <div class="stat-label">
                        <span>Currently active</span>
                        <span class="stat-change positive">+2</span>
                    </div>
                </div>
                
                <div class="dashboard-card stat-card" style="grid-column: span 2; grid-row: span 2;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-money-bill-wave"></i> Commission
                        </div>
                    </div>
                    <div class="stat-value">ZMW ${((stats.totalAmount || 0) * 0.05).toLocaleString()}</div>
                    <div class="stat-label">
                        <span>5% of ZMW ${(stats.totalAmount || 0).toLocaleString()}</span>
                        <span class="stat-change positive">+15%</span>
                    </div>
                </div>
                
                <!-- Loan Status Chart -->
                <div class="dashboard-card" style="grid-column: span 6; grid-row: span 3;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-chart-pie"></i> Loan Status Distribution
                        </div>
                    </div>
                    <div style="padding: 20px; height: 200px; display: flex; align-items: center; justify-content: center;">
                        <div style="display: flex; align-items: center; gap: 40px;">
                            <div style="width: 150px; height: 150px; border-radius: 50%; background: conic-gradient(
                                var(--success) 0% ${(stats.activeLoans/10)*100}%,
                                var(--warning) ${(stats.activeLoans/10)*100}% ${((stats.activeLoans+stats.pendingLoans)/10)*100}%,
                                var(--danger) ${((stats.activeLoans+stats.pendingLoans)/10)*100}% ${((stats.activeLoans+stats.pendingLoans+stats.overdueLoans)/10)*100}%,
                                #e0e0e0 ${((stats.activeLoans+stats.pendingLoans+stats.overdueLoans)/10)*100}% 100%
                            );"></div>
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="width: 12px; height: 12px; background: var(--success); border-radius: 2px;"></div>
                                    <span>Active: ${stats.activeLoans || 0}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="width: 12px; height: 12px; background: var(--warning); border-radius: 2px;"></div>
                                    <span>Pending: ${stats.pendingLoans || 0}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="width: 12px; height: 12px; background: var(--danger); border-radius: 2px;"></div>
                                    <span>Overdue: ${stats.overdueLoans || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Commission Panel -->
                <div class="dashboard-card" style="grid-column: span 6; grid-row: span 3;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-chart-line"></i> Commission Earnings
                        </div>
                        <div class="dashboard-card-actions">
                            <div class="dashboard-card-action">
                                <i class="fas fa-download"></i>
                            </div>
                        </div>
                    </div>
                    <div style="padding: 20px;">
                        <div style="font-size: 24px; font-weight: 700; text-align: center; margin-bottom: 20px;">
                            ZMW ${((stats.totalAmount || 0) * 0.05).toLocaleString()}
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center;">
                            <div>
                                <div style="font-size: 12px; color: var(--agent-text-secondary);">This Month</div>
                                <div style="font-weight: 500;">ZMW 2,500</div>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: var(--agent-text-secondary);">Last Month</div>
                                <div style="font-weight: 500;">ZMW 2,100</div>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: var(--agent-text-secondary);">Total</div>
                                <div style="font-weight: 500;">ZMW ${((stats.totalAmount || 0) * 0.05).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Customer List -->
                <div class="dashboard-card" style="grid-column: span 12; grid-row: span 4;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-users"></i> Customer List
                        </div>
                        <div class="dashboard-card-actions">
                            <button class="btn btn-sm btn-primary" onclick="app.showCreateCustomerModal()">
                                <i class="fas fa-user-plus"></i> Add Customer
                            </button>
                        </div>
                    </div>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Customer ID</th>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Loans</th>
                                <th>Active Loan</th>
                                <th>Status</th>
                                <th>Last Activity</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>C-24001-001</td>
                                <td>Mary Banda</td>
                                <td>+260 97 123 4567</td>
                                <td>3</td>
                                <td>ZMW 15,000</td>
                                <td><span class="status-badge approved">Active</span></td>
                                <td>2 days ago</td>
                                <td>
                                    <button class="btn btn-sm btn-primary">View</button>
                                </td>
                            </tr>
                            <tr>
                                <td>C-24001-002</td>
                                <td>John Phiri</td>
                                <td>+260 96 234 5678</td>
                                <td>1</td>
                                <td>ZMW 8,000</td>
                                <td><span class="status-badge pending">Pending</span></td>
                                <td>Today</td>
                                <td>
                                    <button class="btn btn-sm btn-primary">View</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    getCustomerDashboard() {
        return `
            <div class="dashboard customer-dashboard">
                <!-- Current Loan Status -->
                <div class="dashboard-card" style="grid-column: span 6; grid-row: span 3;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-file-invoice-dollar"></i> Current Loan Status
                        </div>
                    </div>
                    <div style="padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: calc(100% - 60px);">
                        <div style="font-size: 48px; color: var(--customer-accent); margin-bottom: 16px;">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">ZMW 15,000</div>
                        <div style="color: var(--customer-text-secondary); margin-bottom: 24px;">Active Loan</div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; width: 100%;">
                            <div style="text-align: center;">
                                <div style="font-size: 12px; color: var(--customer-text-secondary);">Amount Paid</div>
                                <div style="font-weight: 500;">ZMW 3,600</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 12px; color: var(--customer-text-secondary);">Balance</div>
                                <div style="font-weight: 500;">ZMW 11,400</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Repayment Progress -->
                <div class="dashboard-card" style="grid-column: span 6; grid-row: span 3;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-chart-bar"></i> Repayment Progress
                        </div>
                    </div>
                    <div style="padding: 24px;">
                        <div style="margin-bottom: 16px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="font-size: 12px; color: var(--customer-text-secondary);">Progress</span>
                                <span style="font-weight: 500;">24%</span>
                            </div>
                            <div style="height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                                <div style="width: 24%; height: 100%; background: var(--customer-accent);"></div>
                            </div>
                        </div>
                        <div style="margin-bottom: 24px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="font-size: 12px; color: var(--customer-text-secondary);">Next Payment</span>
                                <span style="font-weight: 500;">ZMW 1,200</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="font-size: 12px; color: var(--customer-text-secondary);">Due Date</span>
                                <span style="font-weight: 500;">10 Feb 2024 (in 3 days)</span>
                            </div>
                        </div>
                        <button class="btn btn-success w-full" onclick="app.makePayment()">
                            <i class="fas fa-money-bill-wave"></i> Make Payment
                        </button>
                    </div>
                </div>
                
                <!-- Apply for Loan Button -->
                <div class="dashboard-card" style="grid-column: span 4; grid-row: span 2; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;" onclick="app.showApplyLoanModal()">
                    <div style="font-size: 48px; color: var(--customer-accent); margin-bottom: 16px;">
                        <i class="fas fa-hand-holding-usd"></i>
                    </div>
                    <div style="font-size: 18px; font-weight: 500;">Apply for Loan</div>
                    <div style="font-size: 12px; color: var(--customer-text-secondary); margin-top: 8px; text-align: center;">Quick application with your agent</div>
                </div>
                
                <!-- Document Upload -->
                <div class="dashboard-card" style="grid-column: span 4; grid-row: span 2;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-upload"></i> Document Upload
                        </div>
                    </div>
                    <div style="padding: 16px;">
                        <div style="font-size: 12px; color: var(--customer-text-secondary); margin-bottom: 12px;">Upload required documents</div>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f8f8fa; border-radius: 6px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <i class="fas fa-id-card" style="color: var(--customer-accent);"></i>
                                    <span>NRC Front</span>
                                </div>
                                <span class="status-badge success">Uploaded</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f8f8fa; border-radius: 6px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <i class="fas fa-id-card" style="color: var(--customer-accent);"></i>
                                    <span>NRC Back</span>
                                </div>
                                <span class="status-badge success">Uploaded</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f8f8fa; border-radius: 6px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <i class="fas fa-camera" style="color: var(--customer-accent);"></i>
                                    <span>Profile Photo</span>
                                </div>
                                <span class="status-badge success">Uploaded</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Loan History -->
                <div class="dashboard-card" style="grid-column: span 4; grid-row: span 2;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-history"></i> Loan History
                        </div>
                    </div>
                    <div style="padding: 16px; max-height: 200px; overflow-y: auto;">
                        <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(0,0,0,0.05);">
                            <div style="display: flex; justify-content: space-between;">
                                <span style="font-weight: 500;">ZMW 5,000</span>
                                <span class="status-badge success">Repaid</span>
                            </div>
                            <div style="font-size: 11px; color: var(--customer-text-secondary);">Dec 2023 - Jan 2024</div>
                        </div>
                        <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(0,0,0,0.05);">
                            <div style="display: flex; justify-content: space-between;">
                                <span style="font-weight: 500;">ZMW 3,000</span>
                                <span class="status-badge success">Repaid</span>
                            </div>
                            <div style="font-size: 11px; color: var(--customer-text-secondary);">Oct 2023 - Nov 2023</div>
                        </div>
                    </div>
                </div>
                
                <!-- Notifications Panel -->
                <div class="dashboard-card" style="grid-column: span 12; grid-row: span 3;">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-bell"></i> Notifications
                        </div>
                    </div>
                    <div style="padding: 16px;">
                        <div class="notification-item" style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: rgba(52, 199, 89, 0.1); border-radius: 8px; margin-bottom: 8px;">
                            <div style="color: var(--success);">
                                <i class="fas fa-check-circle"></i>
                            </div>
                            <div>
                                <div style="font-weight: 500;">Payment Confirmed</div>
                                <div style="font-size: 12px; color: var(--customer-text-secondary);">Your payment of ZMW 1,200 has been confirmed</div>
                                <div style="font-size: 11px; color: var(--customer-text-secondary); margin-top: 4px;">Today, 10:30 AM</div>
                            </div>
                        </div>
                        <div class="notification-item" style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: rgba(255, 149, 0, 0.1); border-radius: 8px; margin-bottom: 8px;">
                            <div style="color: var(--warning);">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <div>
                                <div style="font-weight: 500;">Payment Reminder</div>
                                <div style="font-size: 12px; color: var(--customer-text-secondary);">Your next payment of ZMW 1,200 is due in 3 days</div>
                                <div style="font-size: 11px; color: var(--customer-text-secondary); margin-top: 4px;">Yesterday, 2:45 PM</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    initializeDashboardComponents() {
        // Initialize any interactive elements in the dashboard
        // This would include chart initialization, event listeners, etc.
    }
    
    // Other view loaders
    async loadLoansView() {
        this.setActiveNav('navLoans');
        applicationState.currentView = 'loans';
        
        const loans = await DatabaseService.getLoans();
        
        let loansHTML = `
            <div style="padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h2 style="font-size: 24px; font-weight: 600;">
                        <i class="fas fa-hand-holding-usd"></i> Loan Management
                    </h2>
                    ${currentUser.role === 'agent' ? `
                        <button class="btn btn-primary" onclick="app.showApplyLoanModal()">
                            <i class="fas fa-plus"></i> Apply for Loan
                        </button>
                    ` : ''}
                </div>
                
                <!-- Filters -->
                <div style="display: flex; gap: 12px; margin-bottom: 24px; padding: 16px; background: white; border-radius: 12px; box-shadow: var(--shadow-sm);">
                    <select class="form-control" style="flex: 1;" id="loanStatusFilter">
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="active">Active</option>
                        <option value="overdue">Overdue</option>
                        <option value="defaulted">Defaulted</option>
                        <option value="repaid">Repaid</option>
                    </select>
                    <input type="date" class="form-control" id="loanDateFrom" placeholder="From Date">
                    <input type="date" class="form-control" id="loanDateTo" placeholder="To Date">
                    <button class="btn btn-secondary" onclick="app.filterLoans()">
                        <i class="fas fa-filter"></i> Filter
                    </button>
                    <button class="btn btn-secondary" onclick="app.resetLoanFilters()">
                        <i class="fas fa-redo"></i> Reset
                    </button>
                </div>
                
                <!-- Loans Table -->
                <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-sm);">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Loan ID</th>
                                <th>Customer</th>
                                <th>Agent</th>
                                <th>Amount</th>
                                <th>Duration</th>
                                <th>Interest</th>
                                <th>Collateral</th>
                                <th>Status</th>
                                <th>Applied</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="loansTableBody">
                            ${loans.map(loan => `
                                <tr>
                                    <td>${loan.loanId || 'N/A'}</td>
                                    <td>${loan.customerName || 'Customer'}</td>
                                    <td>${loan.agentId || 'Agent'}</td>
                                    <td>ZMW ${(loan.amount || 0).toLocaleString()}</td>
                                    <td>${loan.duration || 0} months</td>
                                    <td>${loan.interestRate || 15}%</td>
                                    <td>${loan.collateralType || 'N/A'}</td>
                                    <td><span class="status-badge ${loan.status || 'pending'}">${loan.status || 'pending'}</span></td>
                                    <td>${new Date(loan.createdAt || Date.now()).toLocaleDateString()}</td>
                                    <td>
                                        <button class="btn btn-sm btn-primary" onclick="app.viewLoanDetails('${loan.id}')">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        ${currentUser.role === 'admin' && loan.status === 'pending' ? `
                                            <button class="btn btn-sm btn-success" onclick="app.approveLoan('${loan.id}')">
                                                <i class="fas fa-check"></i>
                                            </button>
                                            <button class="btn btn-sm btn-danger" onclick="app.rejectLoan('${loan.id}')">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        ` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        elements.contentArea.innerHTML = loansHTML;
    }
    
    async loadCustomersView() {
        this.setActiveNav('navCustomers');
        applicationState.currentView = 'customers';
        
        let customersHTML = `
            <div style="padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h2 style="font-size: 24px; font-weight: 600;">
                        <i class="fas fa-users"></i> Customer Management
                    </h2>
                    ${currentUser.role === 'agent' ? `
                        <button class="btn btn-primary" onclick="app.showCreateCustomerModal()">
                            <i class="fas fa-user-plus"></i> Add Customer
                        </button>
                    ` : ''}
                </div>
                
                <!-- Customer Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                    <!-- Customer cards will be dynamically generated -->
                    <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: var(--shadow-sm);">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                            <div style="width: 50px; height: 50px; border-radius: 50%; background: #f0f0f0; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-user" style="font-size: 24px; color: #666;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 500;">Mary Banda</div>
                                <div style="font-size: 12px; color: var(--agent-text-secondary);">C-24001-001</div>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
                            <div>
                                <div style="font-size: 11px; color: var(--agent-text-secondary);">Phone</div>
                                <div style="font-weight: 500;">+260 97 123 4567</div>
                            </div>
                            <div>
                                <div style="font-size: 11px; color: var(--agent-text-secondary);">Loans</div>
                                <div style="font-weight: 500;">3</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-sm btn-primary" style="flex: 1;">View</button>
                            <button class="btn btn-sm btn-secondary" style="flex: 1;">Contact</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        elements.contentArea.innerHTML = customersHTML;
    }
    
    async loadAgentsView() {
        this.setActiveNav('navAgents');
        applicationState.currentView = 'agents';
        
        let agentsHTML = `
            <div style="padding: 24px;">
                <h2 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">
                    <i class="fas fa-user-tie"></i> Agent Management
                </h2>
                
                <!-- Agents Table -->
                <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-sm);">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Agent ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Customers</th>
                                <th>Loans</th>
                                <th>Commission</th>
                                <th>Status</th>
                                <th>Registered</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>TRU24001</td>
                                <td>John Doe</td>
                                <td>john@example.com</td>
                                <td>+260 97 111 2222</td>
                                <td>24</td>
                                <td>15</td>
                                <td>ZMW 7,500</td>
                                <td><span class="status-badge approved">Active</span></td>
                                <td>15 Jan 2024</td>
                                <td>
                                    <button class="btn btn-sm btn-primary">View</button>
                                    ${currentUser.role === 'admin' ? `
                                        <button class="btn btn-sm btn-warning">Suspend</button>
                                    ` : ''}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        elements.contentArea.innerHTML = agentsHTML;
    }
    
    async loadReportsView() {
        this.setActiveNav('navReports');
        applicationState.currentView = 'reports';
        
        let reportsHTML = `
            <div style="padding: 24px;">
                <h2 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">
                    <i class="fas fa-chart-bar"></i> Reports & Analytics
                </h2>
                
                <!-- Report Options -->
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div class="dashboard-card" style="cursor: pointer;" onclick="app.generateReport('loan_summary')">
                        <div class="dashboard-card-header">
                            <div class="dashboard-card-title">
                                <i class="fas fa-file-invoice-dollar"></i> Loan Summary
                            </div>
                        </div>
                        <div style="padding: 16px;">
                            <div style="font-size: 12px; color: var(--agent-text-secondary);">
                                Summary of all loans with status breakdown
                            </div>
                        </div>
                    </div>
                    
                    <div class="dashboard-card" style="cursor: pointer;" onclick="app.generateReport('repayment_analysis')">
                        <div class="dashboard-card-header">
                            <div class="dashboard-card-title">
                                <i class="fas fa-money-bill-wave"></i> Repayment Analysis
                            </div>
                        </div>
                        <div style="padding: 16px;">
                            <div style="font-size: 12px; color: var(--agent-text-secondary);">
                                Analysis of repayment patterns and trends
                            </div>
                        </div>
                    </div>
                    
                    <div class="dashboard-card" style="cursor: pointer;" onclick="app.generateReport('agent_performance')">
                        <div class="dashboard-card-header">
                            <div class="dashboard-card-title">
                                <i class="fas fa-chart-line"></i> Agent Performance
                            </div>
                        </div>
                        <div style="padding: 16px;">
                            <div style="font-size: 12px; color: var(--agent-text-secondary);">
                                Performance metrics for all agents
                            </div>
                        </div>
                    </div>
                    
                    <div class="dashboard-card" style="cursor: pointer;" onclick="app.generateReport('collateral_report')">
                        <div class="dashboard-card-header">
                            <div class="dashboard-card-title">
                                <i class="fas fa-images"></i> Collateral Report
                            </div>
                        </div>
                        <div style="padding: 16px;">
                            <div style="font-size: 12px; color: var(--agent-text-secondary);">
                                Report on all collateral items
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Report Generation Form -->
                <div class="dashboard-card">
                    <div class="dashboard-card-header">
                        <div class="dashboard-card-title">
                            <i class="fas fa-cog"></i> Generate Custom Report
                        </div>
                    </div>
                    <div style="padding: 24px;">
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px;">
                            <div class="form-group">
                                <label>Report Type</label>
                                <select id="reportType" class="form-control">
                                    <option value="loan_analysis">Loan Analysis</option>
                                    <option value="financial_summary">Financial Summary</option>
                                    <option value="customer_demographics">Customer Demographics</option>
                                    <option value="risk_assessment">Risk Assessment</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Date Range</label>
                                <select id="reportDateRange" class="form-control">
                                    <option value="last_week">Last Week</option>
                                    <option value="last_month">Last Month</option>
                                    <option value="last_quarter">Last Quarter</option>
                                    <option value="last_year">Last Year</option>
                                    <option value="custom">Custom Range</option>
                                </select>
                            </div>
                            <div class="form-group" id="customDateRange" style="display: none; grid-column: span 2;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                    <div>
                                        <label>From Date</label>
                                        <input type="date" id="reportFromDate" class="form-control">
                                    </div>
                                    <div>
                                        <label>To Date</label>
                                        <input type="date" id="reportToDate" class="form-control">
                                    </div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Format</label>
                                <select id="reportFormat" class="form-control">
                                    <option value="pdf">PDF</option>
                                    <option value="excel">Excel</option>
                                    <option value="csv">CSV</option>
                                </select>
                            </div>
                        </div>
                        <div style="display: flex; gap: 12px;">
                            <button class="btn btn-primary" onclick="app.generateCustomReport()">
                                <i class="fas fa-download"></i> Generate Report
                            </button>
                            <button class="btn btn-secondary" onclick="app.previewReport()">
                                <i class="fas fa-eye"></i> Preview
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        elements.contentArea.innerHTML = reportsHTML;
        
        // Add event listener for date range selection
        document.getElementById('reportDateRange').addEventListener('change', function() {
            const customRange = document.getElementById('customDateRange');
            customRange.style.display = this.value === 'custom' ? 'block' : 'none';
        });
    }
    
    async loadSettingsView() {
        this.setActiveNav('navSettings');
        applicationState.currentView = 'settings';
        
        let settingsHTML = `
            <div style="padding: 24px;">
                <h2 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">
                    <i class="fas fa-cog"></i> System Settings
                </h2>
                
                <div style="display: grid; grid-template-columns: 250px 1fr; gap: 30px;">
                    <!-- Settings Sidebar -->
                    <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: var(--shadow-sm); height: fit-content;">
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <button class="btn btn-sm btn-secondary" style="justify-content: flex-start;" onclick="app.showSettingsSection('loan')">
                                <i class="fas fa-hand-holding-usd"></i> Loan Settings
                            </button>
                            <button class="btn btn-sm btn-secondary" style="justify-content: flex-start;" onclick="app.showSettingsSection('interest')">
                                <i class="fas fa-percentage"></i> Interest Rates
                            </button>
                            <button class="btn btn-sm btn-secondary" style="justify-content: flex-start;" onclick="app.showSettingsSection('penalty')">
                                <i class="fas fa-exclamation-triangle"></i> Penalty Settings
                            </button>
                            <button class="btn btn-sm btn-secondary" style="justify-content: flex-start;" onclick="app.showSettingsSection('collateral')">
                                <i class="fas fa-images"></i> Collateral Settings
                            </button>
                            <button class="btn btn-sm btn-secondary" style="justify-content: flex-start;" onclick="app.showSettingsSection('commission')">
                                <i class="fas fa-money-bill-wave"></i> Commission
                            </button>
                            ${currentUser.role === 'sudo' ? `
                                <div style="height: 1px; background: #e0e0e0; margin: 12px 0;"></div>
                                <button class="btn btn-sm btn-secondary" style="justify-content: flex-start;" onclick="app.showSettingsSection('system')">
                                    <i class="fas fa-server"></i> System Settings
                                </button>
                                <button class="btn btn-sm btn-secondary" style="justify-content: flex-start;" onclick="app.showSettingsSection('security')">
                                    <i class="fas fa-shield-alt"></i> Security
                                </button>
                                <button class="btn btn-sm btn-secondary" style="justify-content: flex-start;" onclick="app.showSettingsSection('modules')">
                                    <i class="fas fa-puzzle-piece"></i> Module Control
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Settings Content -->
                    <div id="settingsContent">
                        <!-- Settings content will be loaded here -->
                    </div>
                </div>
            </div>
        `;
        
        elements.contentArea.innerHTML = settingsHTML;
        this.showSettingsSection('loan');
    }
    
    showSettingsSection(section) {
        const settingsContent = document.getElementById('settingsContent');
        
        const sections = {
            loan: this.getLoanSettingsHTML(),
            interest: this.getInterestSettingsHTML(),
            penalty: this.getPenaltySettingsHTML(),
            collateral: this.getCollateralSettingsHTML(),
            commission: this.getCommissionSettingsHTML(),
            system: this.getSystemSettingsHTML(),
            security: this.getSecuritySettingsHTML(),
            modules: this.getModuleSettingsHTML()
        };
        
        settingsContent.innerHTML = sections[section] || sections.loan;
    }
    
    getLoanSettingsHTML() {
        const settings = applicationState.loanSettings;
        
        return `
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <div class="dashboard-card-title">
                        <i class="fas fa-hand-holding-usd"></i> Loan Settings
                    </div>
                </div>
                <div style="padding: 24px;">
                    <form id="loanSettingsForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="minLoanAmount">Minimum Loan Amount (ZMW)</label>
                                <input type="number" id="minLoanAmount" value="${settings.minAmount}" class="form-control" min="100" max="100000">
                            </div>
                            <div class="form-group">
                                <label for="maxLoanAmount">Maximum Loan Amount (ZMW)</label>
                                <input type="number" id="maxLoanAmount" value="${settings.maxAmount}" class="form-control" min="1000" max="1000000">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="loanDurations">Loan Durations (months)</label>
                                <input type="text" id="loanDurations" value="${settings.durations.join(', ')}" class="form-control" placeholder="1, 3, 6, 12">
                                <small style="font-size: 11px; color: var(--agent-text-secondary);">Separate durations with commas</small>
                            </div>
                            <div class="form-group">
                                <label for="defaultDuration">Default Duration (months)</label>
                                <select id="defaultDuration" class="form-control">
                                    ${settings.durations.map(d => `
                                        <option value="${d}" ${d === 6 ? 'selected' : ''}>${d} months</option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="loanPurposes">Allowed Loan Purposes</label>
                            <textarea id="loanPurposes" rows="3" class="form-control">Business, Education, Medical, Home Improvement, Vehicle Purchase, Other</textarea>
                            <small style="font-size: 11px; color: var(--agent-text-secondary);">Separate purposes with commas</small>
                        </div>
                        
                        <div style="display: flex; gap: 12px; margin-top: 24px;">
                            <button type="button" class="btn btn-primary" onclick="app.saveLoanSettings()">
                                <i class="fas fa-save"></i> Save Settings
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="app.resetLoanSettings()">
                                <i class="fas fa-redo"></i> Reset
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }
    
    // Modal Methods
    showModal(modalElement) {
        modalElement.style.display = 'block';
        elements.modalOverlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
    
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        elements.modalOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    closeAllPanels() {
        elements.userDropdown.style.display = 'none';
        elements.notificationsPanel.style.display = 'none';
        elements.quickActionsPanel.style.display = 'none';
    }
    
    showCreateAdminModal() {
        this.showModal(elements.createAdminModal);
    }
    
    showCreateCustomerModal() {
        this.showModal(elements.createCustomerModal);
        this.loadCreateCustomerForm();
    }
    
    showApplyLoanModal() {
        this.showModal(elements.applyLoanModal);
        this.loadApplyLoanForm();
    }
    
    async loadCreateCustomerForm() {
        const form = document.getElementById('createCustomerForm');
        
        form.innerHTML = `
            <div class="registration-steps">
                <div class="step active">1. Personal Info</div>
                <div class="step">2. Documents</div>
                <div class="step">3. Review</div>
            </div>
            
            <div class="step-content active" id="customerStep1">
                <div class="form-row">
                    <div class="form-group">
                        <label><i class="fas fa-user"></i> Full Name</label>
                        <input type="text" id="customerFullName" required>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-id-card"></i> NRC Number</label>
                        <input type="text" id="customerNRC" placeholder="123456/78/9" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label><i class="fas fa-phone"></i> Phone Number</label>
                        <input type="tel" id="customerPhone" placeholder="+260 97 XXX XXXX" required>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-envelope"></i> Email Address</label>
                        <input type="email" id="customerEmail">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label><i class="fas fa-home"></i> House Number</label>
                        <input type="text" id="customerHouseNumber" required>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-map-marker-alt"></i> Address</label>
                        <textarea id="customerAddress" rows="2" required></textarea>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label><i class="fas fa-briefcase"></i> Occupation</label>
                        <input type="text" id="customerOccupation">
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-money-bill-wave"></i> Monthly Income (ZMW)</label>
                        <input type="number" id="customerIncome" min="0">
                    </div>
                </div>
            </div>
            
            <div class="step-content" id="customerStep2">
                <div class="upload-section">
                    <h4><i class="fas fa-id-card"></i> NRC Front Photo</h4>
                    <div class="upload-area" id="customerNrcFrontUpload">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Drag & drop or click to upload</p>
                        <small>JPG, PNG max 5MB</small>
                    </div>
                </div>
                
                <div class="upload-section">
                    <h4><i class="fas fa-id-card"></i> NRC Back Photo</h4>
                    <div class="upload-area" id="customerNrcBackUpload">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Drag & drop or click to upload</p>
                        <small>JPG, PNG max 5MB</small>
                    </div>
                </div>
                
                <div class="upload-section">
                    <h4><i class="fas fa-camera"></i> Profile Photo</h4>
                    <div class="upload-area" id="customerProfilePhotoUpload">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Drag & drop or click to upload</p>
                        <small>JPG, PNG max 5MB</small>
                    </div>
                </div>
            </div>
            
            <div class="step-content" id="customerStep3">
                <div class="review-info">
                    <h4><i class="fas fa-user-check"></i> Customer Information</h4>
                    <div class="info-grid">
                        <!-- Review info will be populated here -->
                    </div>
                </div>
                
                <div class="terms-agreement" style="margin-top: 24px;">
                    <label class="checkbox">
                        <input type="checkbox" id="customerAgreeTerms" required>
                        <span>Customer agrees to the Terms of Service and Privacy Policy</span>
                    </label>
                </div>
            </div>
        `;
        
        // Initialize step navigation
        this.initializeRegistrationSteps('customer');
    }
    
    async loadApplyLoanForm() {
        const form = document.getElementById('applyLoanForm');
        const settings = applicationState.loanSettings;
        
        form.innerHTML = `
            <div class="registration-steps">
                <div class="step active">1. Loan Details</div>
                <div class="step">2. Collateral</div>
                <div class="step">3. Review</div>
            </div>
            
            <div class="step-content active" id="loanStep1">
                <div class="form-row">
                    <div class="form-group">
                        <label><i class="fas fa-money-bill-wave"></i> Loan Amount (ZMW)</label>
                        <input type="number" id="loanAmount" 
                               min="${settings.minAmount}" 
                               max="${settings.maxAmount}" 
                               step="100" 
                               required>
                        <small style="font-size: 11px; color: var(--agent-text-secondary);">
                            Min: ZMW ${settings.minAmount} | Max: ZMW ${settings.maxAmount}
                        </small>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-calendar-alt"></i> Loan Duration (months)</label>
                        <select id="loanDuration" required>
                            ${settings.durations.map(d => `
                                <option value="${d}">${d} months</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label><i class="fas fa-bullseye"></i> Loan Purpose</label>
                        <select id="loanPurpose" required>
                            <option value="">Select purpose</option>
                            <option value="business">Business</option>
                            <option value="education">Education</option>
                            <option value="medical">Medical</option>
                            <option value="home_improvement">Home Improvement</option>
                            <option value="vehicle">Vehicle Purchase</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-comment-alt"></i> Purpose Description</label>
                        <textarea id="loanDescription" rows="3" placeholder="Brief description of how the loan will be used"></textarea>
                    </div>
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-percentage"></i> Interest Rate</label>
                    <div style="padding: 12px; background: #f8f8fa; border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: 700; text-align: center;">
                            ${settings.interestRate}%
                        </div>
                        <div style="text-align: center; font-size: 12px; color: var(--agent-text-secondary);">
                            Annual interest rate
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="step-content" id="loanStep2">
                <div class="form-row">
                    <div class="form-group">
                        <label><i class="fas fa-tag"></i> Collateral Type</label>
                        <select id="collateralType" required>
                            <option value="">Select type</option>
                            <option value="vehicle">Vehicle</option>
                            <option value="electronics">Electronics</option>
                            <option value="jewelry">Jewelry</option>
                            <option value="property_documents">Property Documents</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-money-bill-wave"></i> Estimated Value (ZMW)</label>
                        <input type="number" id="collateralValue" min="100" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-align-left"></i> Collateral Description</label>
                    <textarea id="collateralDescription" rows="3" placeholder="Detailed description of the collateral item" required></textarea>
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-map-marker-alt"></i> Storage Location</label>
                    <input type="text" id="collateralLocation" placeholder="Where the collateral will be stored" required>
                </div>
                
                <div class="upload-section">
                    <h4><i class="fas fa-images"></i> Collateral Photos (Minimum 3)</h4>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px;">
                        <div class="upload-area" id="collateralPhoto1">
                            <i class="fas fa-camera"></i>
                            <p>Front View</p>
                            <small>Required</small>
                        </div>
                        <div class="upload-area" id="collateralPhoto2">
                            <i class="fas fa-camera"></i>
                            <p>Side View</p>
                            <small>Required</small>
                        </div>
                        <div class="upload-area" id="collateralPhoto3">
                            <i class="fas fa-camera"></i>
                            <p>Close-up</p>
                            <small>Required</small>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="step-content" id="loanStep3">
                <div class="review-info">
                    <h4><i class="fas fa-file-invoice-dollar"></i> Loan Summary</h4>
                    <div class="info-grid" id="loanReviewInfo">
                        <!-- Loan review info will be populated here -->
                    </div>
                    
                    <h4 style="margin-top: 24px;"><i class="fas fa-images"></i> Collateral Summary</h4>
                    <div class="info-grid" id="collateralReviewInfo">
                        <!-- Collateral review info will be populated here -->
                    </div>
                    
                    <div style="margin-top: 24px; padding: 16px; background: #f8f8fa; border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span>Principal Amount:</span>
                            <span id="reviewPrincipal">ZMW 0</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span>Interest (${settings.interestRate}%):</span>
                            <span id="reviewInterest">ZMW 0</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-weight: 700; padding-top: 8px; border-top: 1px solid #ddd;">
                            <span>Total Payable:</span>
                            <span id="reviewTotal">ZMW 0</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--agent-text-secondary); margin-top: 8px;">
                            <span>Monthly Installment:</span>
                            <span id="reviewInstallment">ZMW 0</span>
                        </div>
                    </div>
                </div>
                
                <div class="terms-agreement" style="margin-top: 24px;">
                    <label class="checkbox">
                        <input type="checkbox" id="loanAgreeTerms" required>
                        <span>I agree to the Loan Agreement terms and conditions</span>
                    </label>
                </div>
            </div>
        `;
        
        // Initialize step navigation
        this.initializeRegistrationSteps('loan');
        
        // Add event listeners for real-time calculation
        document.getElementById('loanAmount').addEventListener('input', this.calculateLoanDetails.bind(this));
        document.getElementById('loanDuration').addEventListener('change', this.calculateLoanDetails.bind(this));
    }
    
    calculateLoanDetails() {
        const amount = parseFloat(document.getElementById('loanAmount').value) || 0;
        const duration = parseInt(document.getElementById('loanDuration').value) || 1;
        const interestRate = applicationState.loanSettings.interestRate;
        
        const interest = (amount * interestRate * duration) / 1200; // Monthly interest calculation
        const total = amount + interest;
        const monthlyInstallment = total / duration;
        
        // Update review elements if they exist
        const reviewPrincipal = document.getElementById('reviewPrincipal');
        const reviewInterest = document.getElementById('reviewInterest');
        const reviewTotal = document.getElementById('reviewTotal');
        const reviewInstallment = document.getElementById('reviewInstallment');
        
        if (reviewPrincipal) {
            reviewPrincipal.textContent = `ZMW ${amount.toLocaleString()}`;
            reviewInterest.textContent = `ZMW ${interest.toFixed(2)}`;
            reviewTotal.textContent = `ZMW ${total.toFixed(2)}`;
            reviewInstallment.textContent = `ZMW ${monthlyInstallment.toFixed(2)}`;
        }
    }
    
    initializeRegistrationSteps(type) {
        const steps = document.querySelectorAll(`#${type}Step1, #${type}Step2, #${type}Step3`);
        const stepIndicators = document.querySelectorAll(`#${type}RegisterForm .step`);
        
        let currentStep = 0;
        
        // Function to show step
        const showStep = (stepIndex) => {
            steps.forEach((step, index) => {
                step.classList.toggle('active', index === stepIndex);
            });
            
            stepIndicators.forEach((indicator, index) => {
                indicator.classList.toggle('active', index <= stepIndex);
            });
            
            // Update buttons
            const prevBtn = document.getElementById('prevStep');
            const nextBtn = document.getElementById('nextStep');
            const submitBtn = document.getElementById('submitRegistration');
            
            if (prevBtn) prevBtn.style.display = stepIndex > 0 ? 'inline-block' : 'none';
            if (nextBtn) nextBtn.style.display = stepIndex < 2 ? 'inline-block' : 'none';
            if (submitBtn) submitBtn.style.display = stepIndex === 2 ? 'inline-block' : 'none';
            
            currentStep = stepIndex;
        };
        
        // Initialize event listeners for step navigation
        const prevBtn = document.getElementById('prevStep');
        const nextBtn = document.getElementById('nextStep');
        const submitBtn = document.getElementById('submitRegistration');
        
        if (prevBtn) {
            prevBtn.onclick = () => {
                if (currentStep > 0) {
                    showStep(currentStep - 1);
                }
            };
        }
        
        if (nextBtn) {
            nextBtn.onclick = () => {
                // Validate current step
                if (this.validateStep(type, currentStep)) {
                    if (currentStep < 2) {
                        showStep(currentStep + 1);
                        // Update review information for step 3
                        if (currentStep + 1 === 2) {
                            this.updateReviewInformation(type);
                        }
                    }
                }
            };
        }
        
        if (submitBtn) {
            submitBtn.onclick = () => {
                if (this.validateStep(type, 2)) {
                    this.submitRegistration(type);
                }
            };
        }
        
        // Show first step initially
        showStep(0);
    }
    
    validateStep(type, stepIndex) {
        // Basic validation logic
        // In a real implementation, this would validate each field
        
        switch(type) {
            case 'customer':
                return this.validateCustomerStep(stepIndex);
            case 'loan':
                return this.validateLoanStep(stepIndex);
            default:
                return true;
        }
    }
    
    validateCustomerStep(stepIndex) {
        switch(stepIndex) {
            case 0: // Personal Info
                const fullName = document.getElementById('customerFullName')?.value;
                const nrc = document.getElementById('customerNRC')?.value;
                const phone = document.getElementById('customerPhone')?.value;
                
                if (!fullName || !nrc || !phone) {
                    this.showToast('Please fill in all required fields', 'warning');
                    return false;
                }
                return true;
                
            case 1: // Documents
                // Check if documents would be uploaded
                return true;
                
            case 2: // Review
                const agreeTerms = document.getElementById('customerAgreeTerms')?.checked;
                if (!agreeTerms) {
                    this.showToast('Please agree to the terms and conditions', 'warning');
                    return false;
                }
                return true;
                
            default:
                return true;
        }
    }
    
    validateLoanStep(stepIndex) {
        const settings = applicationState.loanSettings;
        
        switch(stepIndex) {
            case 0: // Loan Details
                const amount = parseFloat(document.getElementById('loanAmount')?.value);
                const duration = document.getElementById('loanDuration')?.value;
                const purpose = document.getElementById('loanPurpose')?.value;
                
                if (!amount || !duration || !purpose) {
                    this.showToast('Please fill in all loan details', 'warning');
                    return false;
                }
                
                if (amount < settings.minAmount || amount > settings.maxAmount) {
                    this.showToast(`Loan amount must be between ZMW ${settings.minAmount} and ZMW ${settings.maxAmount}`, 'warning');
                    return false;
                }
                return true;
                
            case 1: // Collateral
                const collateralType = document.getElementById('collateralType')?.value;
                const collateralValue = document.getElementById('collateralValue')?.value;
                
                if (!collateralType || !collateralValue) {
                    this.showToast('Please provide collateral details', 'warning');
                    return false;
                }
                return true;
                
            case 2: // Review
                const agreeTerms = document.getElementById('loanAgreeTerms')?.checked;
                if (!agreeTerms) {
                    this.showToast('Please agree to the loan terms and conditions', 'warning');
                    return false;
                }
                return true;
                
            default:
                return true;
        }
    }
    
    updateReviewInformation(type) {
        if (type === 'customer') {
            // Update customer review information
            const reviewGrid = document.querySelector('#customerStep3 .info-grid');
            if (reviewGrid) {
                reviewGrid.innerHTML = `
                    <div class="info-item">
                        <label>Full Name:</label>
                        <span>${document.getElementById('customerFullName')?.value || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <label>NRC Number:</label>
                        <span>${document.getElementById('customerNRC')?.value || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <label>Phone:</label>
                        <span>${document.getElementById('customerPhone')?.value || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <label>Email:</label>
                        <span>${document.getElementById('customerEmail')?.value || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <label>Address:</label>
                        <span>${document.getElementById('customerAddress')?.value || 'N/A'}</span>
                    </div>
                `;
            }
        } else if (type === 'loan') {
            // Update loan review information
            const loanReviewGrid = document.getElementById('loanReviewInfo');
            const collateralReviewGrid = document.getElementById('collateralReviewInfo');
            
            if (loanReviewGrid) {
                loanReviewGrid.innerHTML = `
                    <div class="info-item">
                        <label>Loan Amount:</label>
                        <span>ZMW ${document.getElementById('loanAmount')?.value || '0'}</span>
                    </div>
                    <div class="info-item">
                        <label>Duration:</label>
                        <span>${document.getElementById('loanDuration')?.value || '0'} months</span>
                    </div>
                    <div class="info-item">
                        <label>Purpose:</label>
                        <span>${document.getElementById('loanPurpose')?.value || 'N/A'}</span>
                    </div>
                `;
            }
            
            if (collateralReviewGrid) {
                collateralReviewGrid.innerHTML = `
                    <div class="info-item">
                        <label>Collateral Type:</label>
                        <span>${document.getElementById('collateralType')?.value || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <label>Estimated Value:</label>
                        <span>ZMW ${document.getElementById('collateralValue')?.value || '0'}</span>
                    </div>
                    <div class="info-item">
                        <label>Storage Location:</label>
                        <span>${document.getElementById('collateralLocation')?.value || 'N/A'}</span>
                    </div>
                `;
            }
            
            // Calculate and display loan details
            this.calculateLoanDetails();
        }
    }
    
    async submitRegistration(type) {
        if (type === 'customer') {
            await this.submitCustomerRegistration();
        } else if (type === 'loan') {
            await this.submitLoanApplication();
        }
    }
    
    async submitCustomerRegistration() {
        const customerData = {
            fullName: document.getElementById('customerFullName')?.value,
            nrcNumber: document.getElementById('customerNRC')?.value,
            phone: document.getElementById('customerPhone')?.value,
            email: document.getElementById('customerEmail')?.value || '',
            houseNumber: document.getElementById('customerHouseNumber')?.value,
            address: document.getElementById('customerAddress')?.value,
            occupation: document.getElementById('customerOccupation')?.value || '',
            income: parseFloat(document.getElementById('customerIncome')?.value) || 0,
            agentId: currentUser.agentId || currentUser.uid,
            registeredBy: currentUser.uid,
            status: 'pending',
            verificationStatus: 'unverified',
            documents: {
                nrcFront: 'pending',
                nrcBack: 'pending',
                profilePhoto: 'pending'
            }
        };
        
        // In a real implementation, this would save to Firebase
        this.showToast('Customer registration submitted successfully!', 'success');
        this.closeAllModals();
        
        // Refresh customer list if on customers view
        if (applicationState.currentView === 'customers') {
            this.loadCustomersView();
        }
    }
    
    async submitLoanApplication() {
        const loanData = {
            amount: parseFloat(document.getElementById('loanAmount')?.value),
            duration: parseInt(document.getElementById('loanDuration')?.value),
            purpose: document.getElementById('loanPurpose')?.value,
            description: document.getElementById('loanDescription')?.value || '',
            collateralType: document.getElementById('collateralType')?.value,
            collateralValue: parseFloat(document.getElementById('collateralValue')?.value),
            collateralDescription: document.getElementById('collateralDescription')?.value,
            collateralLocation: document.getElementById('collateralLocation')?.value,
            customerId: currentUser.role === 'customer' ? currentUser.uid : 'mock-customer-id',
            agentId: currentUser.role === 'agent' ? currentUser.uid : currentUser.agentId || 'mock-agent-id',
            createdBy: currentUser.uid,
            interestRate: applicationState.loanSettings.interestRate
        };
        
        // Calculate loan details
        const interest = (loanData.amount * loanData.interestRate * loanData.duration) / 1200;
        const totalPayable = loanData.amount + interest;
        const monthlyInstallment = totalPayable / loanData.duration;
        
        loanData.totalPayable = totalPayable;
        loanData.monthlyInstallment = monthlyInstallment;
        loanData.repaymentPlan = this.generateRepaymentPlan(loanData);
        
        // Save loan application
        const result = await DatabaseService.createLoan(loanData);
        
        if (result.success) {
            this.showToast('Loan application submitted successfully!', 'success');
            this.closeAllModals();
            
            // Refresh loans view if on loans view
            if (applicationState.currentView === 'loans') {
                this.loadLoansView();
            }
        } else {
            this.showToast('Failed to submit loan application: ' + result.error, 'danger');
        }
    }
    
    generateRepaymentPlan(loanData) {
        const plan = [];
        const today = new Date();
        
        for (let i = 1; i <= loanData.duration; i++) {
            const dueDate = new Date(today);
            dueDate.setMonth(today.getMonth() + i);
            
            plan.push({
                installment: i,
                amount: loanData.monthlyInstallment,
                dueDate: dueDate.getTime(),
                status: i === 1 ? 'pending' : 'upcoming',
                paid: false
            });
        }
        
        return plan;
    }
    
    // Toast Notification System
    showToast(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${this.getToastTitle(type)}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">&times;</button>
        `;
        
        elements.toastContainer.appendChild(toast);
        
        // Add close event
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.remove();
        });
        
        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100px)';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 300);
            }
        }, duration);
        
        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 10);
    }
    
    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            warning: 'exclamation-triangle',
            danger: 'exclamation-circle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
    
    getToastTitle(type) {
        const titles = {
            success: 'Success',
            warning: 'Warning',
            danger: 'Error',
            info: 'Information'
        };
        return titles[type] || 'Information';
    }
    
    // Utility Methods
    setActiveNav(navId) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to current nav item
        const activeNav = document.getElementById(navId);
        if (activeNav) {
            activeNav.classList.add('active');
        }
    }
    
    toggleUserDropdown() {
        const isVisible = elements.userDropdown.style.display === 'block';
        elements.userDropdown.style.display = isVisible ? 'none' : 'block';
        elements.notificationsPanel.style.display = 'none';
        elements.quickActionsPanel.style.display = 'none';
    }
    
    toggleNotificationsPanel() {
        const isVisible = elements.notificationsPanel.style.display === 'block';
        elements.notificationsPanel.style.display = isVisible ? 'none' : 'block';
        elements.userDropdown.style.display = 'none';
        elements.quickActionsPanel.style.display = 'none';
    }
    
    toggleQuickActionsPanel() {
        const isVisible = elements.quickActionsPanel.style.display === 'block';
        elements.quickActionsPanel.style.display = isVisible ? 'none' : 'block';
        elements.userDropdown.style.display = 'none';
        elements.notificationsPanel.style.display = 'none';
    }
    
    showLoginScreen() {
        elements.loginScreen.style.display = 'flex';
        elements.appContainer.style.display = 'none';
        elements.emailInput.value = '';
        elements.passwordInput.value = '';
        elements.loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        elements.loginBtn.disabled = false;
    }
    
    async logout() {
        const result = await AuthService.signOut();
        if (result.success) {
            currentUser = null;
            this.showLoginScreen();
            this.showToast('Logged out successfully', 'info');
        } else {
            this.showToast('Logout failed: ' + result.error, 'danger');
        }
    }
    
    // Placeholder methods for functionality that would be implemented
    approveLoan(loanId) {
        this.showToast(`Loan ${loanId} approved successfully`, 'success');
    }
    
    rejectLoan(loanId) {
        this.showToast(`Loan ${loanId} rejected`, 'warning');
    }
    
    viewLoanDetails(loanId) {
        this.showToast(`Viewing details for loan ${loanId}`, 'info');
    }
    
    filterLoans() {
        this.showToast('Applying loan filters', 'info');
    }
    
    resetLoanFilters() {
        this.showToast('Loan filters reset', 'info');
    }
    
    saveLoanSettings() {
        this.showToast('Loan settings saved successfully', 'success');
    }
    
    resetLoanSettings() {
        this.showToast('Loan settings reset to defaults', 'info');
    }
    
    generateReport(type = 'custom') {
        this.showToast(`Generating ${type} report...`, 'info');
    }
    
    generateCustomReport() {
        this.showToast('Custom report generated successfully', 'success');
    }
    
    previewReport() {
        this.showToast('Opening report preview', 'info');
    }
    
    makePayment() {
        this.showToast('Opening payment interface', 'info');
    }
    
    showPendingAgents() {
        this.showToast('Showing pending agents', 'info');
    }
    
    showPendingCustomers() {
        this.showToast('Showing pending customers', 'info');
    }
    
    showPendingLoans() {
        this.showToast('Showing pending loans', 'info');
    }
    
    showOverdueLoans() {
        this.showToast('Showing overdue loans', 'info');
    }
    
    showVerifyAgent() {
        this.showToast('Opening agent verification', 'info');
    }
    
    reviewCollateral() {
        this.showToast('Opening collateral review', 'info');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TruCashApp();
});
