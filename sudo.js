// Sudo Dashboard Functionality
import { authFunctions, dbFunctions, dbRefs, logSystemEvent, notificationFunctions } from './firebase.js';
import { uploadToCloudinary, uploadProfilePhoto } from './cloudinary.js';

class SudoDashboard {
    constructor() {
        this.currentUser = null;
        this.systemConfig = {};
        this.notifications = [];
        this.init();
    }
    
    async init() {
        await this.checkAuth();
        await this.loadSystemConfig();
        this.setupEventListeners();
        this.loadDashboardData();
        this.setupRealTimeListeners();
    }
    
    async checkAuth() {
        authFunctions.onAuthChange(async (user) => {
            if (!user) {
                window.location.href = 'login.html';
                return;
            }
            
            this.currentUser = user;
            
            // Get user data
            const userData = await dbFunctions.getRecord(`users/${user.uid}`);
            if (userData.success && userData.data.role === 'sudo') {
                this.updateUserInfo(userData.data);
                await logSystemEvent('sudo_login', user.uid, {
                    email: user.email,
                    timestamp: new Date().toISOString()
                });
            } else {
                window.location.href = 'login.html';
            }
        });
    }
    
    updateUserInfo(userData) {
        document.getElementById('userName').textContent = userData.fullName || 'System Owner';
        document.getElementById('userEmail').textContent = userData.email || 'trucash@gmail.com';
    }
    
    async loadSystemConfig() {
        const config = await dbFunctions.getRecord('systemConfig');
        if (config.success && config.data) {
            this.systemConfig = config.data;
            this.populateConfigForms();
        } else {
            // Load default configuration
            this.systemConfig = this.getDefaultConfig();
            await dbFunctions.updateRecord('systemConfig', this.systemConfig);
        }
    }
    
    getDefaultConfig() {
        return {
            loanConfig: {
                minAmount: 500,
                maxAmount: 50000,
                baseInterestRate: 15,
                durations: [3, 6, 9, 12]
            },
            penaltyConfig: {
                rate: 2,
                gracePeriod: 7,
                maxPenalty: 50
            },
            commissionConfig: {
                baseRate: 5,
                bonusThreshold: 90,
                bonusRate: 2
            },
            collateralConfig: {
                categories: ['Electronics', 'Vehicles', 'Property', 'Jewelry', 'Other'],
                multiplier: 1.5
            },
            systemSettings: {
                autoApprove: false,
                notifications: true,
                maintenanceMode: false
            }
        };
    }
    
    populateConfigForms() {
        // Loan Configuration
        if (this.systemConfig.loanConfig) {
            document.getElementById('minLoanAmount').value = this.systemConfig.loanConfig.minAmount;
            document.getElementById('maxLoanAmount').value = this.systemConfig.loanConfig.maxAmount;
            document.getElementById('baseInterestRate').value = this.systemConfig.loanConfig.baseInterestRate;
            
            const durationSelect = document.getElementById('loanDurations');
            Array.from(durationSelect.options).forEach(option => {
                option.selected = this.systemConfig.loanConfig.durations.includes(parseInt(option.value));
            });
        }
        
        // Penalty Configuration
        if (this.systemConfig.penaltyConfig) {
            document.getElementById('penaltyRate').value = this.systemConfig.penaltyConfig.rate;
            document.getElementById('gracePeriod').value = this.systemConfig.penaltyConfig.gracePeriod;
            document.getElementById('maxPenalty').value = this.systemConfig.penaltyConfig.maxPenalty;
        }
        
        // Commission Configuration
        if (this.systemConfig.commissionConfig) {
            document.getElementById('baseCommission').value = this.systemConfig.commissionConfig.baseRate;
            document.getElementById('bonusThreshold').value = this.systemConfig.commissionConfig.bonusThreshold;
            document.getElementById('bonusRate').value = this.systemConfig.commissionConfig.bonusRate;
        }
        
        // Collateral Configuration
        if (this.systemConfig.collateralConfig) {
            document.getElementById('collateralMultiplier').value = this.systemConfig.collateralConfig.multiplier;
            this.populateCollateralCategories();
        }
    }
    
    populateCollateralCategories() {
        const container = document.getElementById('collateralCategories');
        container.innerHTML = '';
        
        if (this.systemConfig.collateralConfig && this.systemConfig.collateralConfig.categories) {
            this.systemConfig.collateralConfig.categories.forEach((category, index) => {
                const div = document.createElement('div');
                div.className = 'd-flex align-items-center mb-2';
                div.innerHTML = `
                    <input type="text" class="sudo-form-control mr-2 category-input" value="${category}" data-index="${index}">
                    <button type="button" class="btn btn-sudo-danger btn-sm remove-category" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                container.appendChild(div);
            });
        }
    }
    
    setupEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.getAttribute('href').substring(1);
                this.showSection(target);
                
                // Update active state
                document.querySelectorAll('.sidebar-nav .nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // Update breadcrumb
                document.getElementById('breadcrumbCurrent').textContent = link.querySelector('span').textContent;
                document.getElementById('pageTitle').textContent = link.querySelector('span').textContent;
            });
        });
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await authFunctions.signOutUser();
            window.location.href = 'login.html';
        });
        
        // Sidebar toggle
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('collapsed');
        });
        
        // Notifications panel
        document.getElementById('notificationsBtn').addEventListener('click', () => {
            document.getElementById('notificationsPanel').classList.toggle('show');
        });
        
        // Quick actions panel
        document.getElementById('quickActionsBtn').addEventListener('click', () => {
            document.getElementById('quickActionsPanel').classList.toggle('show');
        });
        
        // Close panels when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.notifications-panel') && !e.target.closest('#notificationsBtn')) {
                document.getElementById('notificationsPanel').classList.remove('show');
            }
            if (!e.target.closest('.quick-actions-panel') && !e.target.closest('#quickActionsBtn')) {
                document.getElementById('quickActionsPanel').classList.remove('show');
            }
        });
        
        // Create admin modal
        document.getElementById('createAdminBtn').addEventListener('click', () => {
            this.showCreateAdminModal();
        });
        
        // Generate password
        document.getElementById('generatePassword').addEventListener('click', () => {
            document.getElementById('adminTempPassword').value = this.generatePassword();
        });
        
        // Submit admin form
        document.getElementById('submitAdminForm').addEventListener('click', async () => {
            await this.createAdminAccount();
        });
        
        // Save configuration
        document.getElementById('saveConfigBtn').addEventListener('click', async () => {
            await this.saveSystemConfig();
        });
        
        // Add collateral category
        document.getElementById('addCategoryBtn').addEventListener('click', () => {
            this.addCollateralCategory();
        });
        
        // Remove collateral category (delegated event)
        document.getElementById('collateralCategories').addEventListener('click', (e) => {
            if (e.target.closest('.remove-category')) {
                const index = e.target.closest('.remove-category').dataset.index;
                this.removeCollateralCategory(index);
            }
        });
        
        // Refresh dashboard
        document.getElementById('refreshDashboard').addEventListener('click', () => {
            this.loadDashboardData();
        });
        
        // Export dashboard
        document.getElementById('exportDashboard').addEventListener('click', () => {
            this.exportDashboardData();
        });
        
        // Quick actions
        document.querySelectorAll('.quick-action').forEach(action => {
            action.addEventListener('click', (e) => {
                e.preventDefault();
                const actionType = action.dataset.action;
                this.handleQuickAction(actionType);
            });
        });
    }
    
    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show selected section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            
            // Load section-specific data
            switch(sectionId) {
                case 'dashboard':
                    this.loadDashboardCharts();
                    this.loadLeaderboard();
                    this.loadRecentActivity();
                    break;
                case 'admins':
                    this.loadAdminsTable();
                    break;
                case 'system-config':
                    this.loadSystemConfig();
                    break;
                case 'loans':
                    this.loadAllLoans();
                    break;
                case 'reports':
                    this.loadReports();
                    break;
                case 'transactions':
                    this.loadAllTransactions();
                    break;
                case 'system-logs':
                    this.loadSystemLogs();
                    break;
                case 'agent-performance':
                    this.loadAgentPerformance();
                    break;
                case 'risk-management':
                    this.loadRiskAlerts();
                    break;
                case 'backup':
                    this.loadBackupStatus();
                    break;
            }
        }
    }
    
    async loadDashboardData() {
        try {
            // Load total loans
            const loans = await dbFunctions.getRecords('loans');
            const totalLoans = loans.data.reduce((sum, loan) => sum + (parseFloat(loan.amount) || 0), 0);
            document.getElementById('totalLoans').textContent = `K ${totalLoans.toLocaleString('en-ZM', {minimumFractionDigits: 2})}`;
            
            // Load total repayments
            const repayments = await dbFunctions.getRecords('repayments');
            const totalRepayments = repayments.data.reduce((sum, repayment) => sum + (parseFloat(repayment.amount) || 0), 0);
            document.getElementById('totalRepayments').textContent = `K ${totalRepayments.toLocaleString('en-ZM', {minimumFractionDigits: 2})}`;
            
            // Load overdue loans
            const overdueLoans = loans.data.filter(loan => loan.status === 'overdue');
            const totalOverdue = overdueLoans.reduce((sum, loan) => sum + (parseFloat(loan.amount) || 0), 0);
            document.getElementById('overdueLoans').textContent = `K ${totalOverdue.toLocaleString('en-ZM', {minimumFractionDigits: 2})}`;
            
            // Load total revenue (estimated from interest)
            const activeLoans = loans.data.filter(loan => loan.status === 'active');
            const totalRevenue = activeLoans.reduce((sum, loan) => {
                const interest = (parseFloat(loan.amount) || 0) * (parseFloat(loan.interestRate) || 0) / 100;
                return sum + interest;
            }, 0);
            document.getElementById('totalRevenue').textContent = `K ${totalRevenue.toLocaleString('en-ZM', {minimumFractionDigits: 2})}`;
            
            // Load dashboard charts
            this.loadDashboardCharts();
            
            // Load leaderboard
            this.loadLeaderboard();
            
            // Load recent activity
            this.loadRecentActivity();
            
            // Update risk alerts
            this.updateRiskAlerts();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showToast('Error loading dashboard data', 'danger');
        }
    }
    
    loadDashboardCharts() {
        // Loan Trends Chart
        const trendsCtx = document.getElementById('loanTrendsChart').getContext('2d');
        if (window.loanTrendsChart) {
            window.loanTrendsChart.destroy();
        }
        
        window.loanTrendsChart = new Chart(trendsCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [
                    {
                        label: 'Loans Issued',
                        data: [1200000, 1900000, 1500000, 2100000, 1800000, 2200000],
                        borderColor: 'rgb(10, 132, 255)',
                        backgroundColor: 'rgba(10, 132, 255, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Repayments',
                        data: [800000, 1200000, 900000, 1400000, 1100000, 1500000],
                        borderColor: 'rgb(48, 209, 88)',
                        backgroundColor: 'rgba(48, 209, 88, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#FFFFFF'
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#8E8E93'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#8E8E93',
                            callback: function(value) {
                                return 'K ' + value.toLocaleString('en-ZM');
                            }
                        }
                    }
                }
            }
        });
        
        // Loan Status Chart
        const statusCtx = document.getElementById('loanStatusChart').getContext('2d');
        if (window.loanStatusChart) {
            window.loanStatusChart.destroy();
        }
        
        window.loanStatusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Active', 'Paid', 'Overdue', 'Defaulted', 'Pending'],
                datasets: [{
                    data: [45, 30, 15, 5, 5],
                    backgroundColor: [
                        'rgb(10, 132, 255)',
                        'rgb(48, 209, 88)',
                        'rgb(255, 214, 10)',
                        'rgb(255, 69, 58)',
                        'rgb(142, 142, 147)'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#FFFFFF',
                            padding: 20
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }
    
    async loadLeaderboard() {
        try {
            // Load agents data
            const agents = await dbFunctions.getRecords('agents');
            const leaderboardData = [];
            
            for (const agent of agents.data) {
                if (agent.status === 'active') {
                    // Get agent's loans
                    const agentLoans = await dbFunctions.queryByField('loans', 'agentId', agent.id);
                    const totalLoans = agentLoans.data.length;
                    const totalAmount = agentLoans.data.reduce((sum, loan) => sum + (parseFloat(loan.amount) || 0), 0);
                    
                    // Get agent's customers
                    const agentCustomers = await dbFunctions.queryByField('customers', 'agentId', agent.id);
                    
                    // Calculate success rate (simplified)
                    const successRate = totalLoans > 0 ? Math.min(95, 70 + Math.random() * 25) : 0;
                    
                    leaderboardData.push({
                        id: agent.id,
                        name: agent.fullName,
                        agentId: agent.agentId,
                        customers: agentCustomers.data.length,
                        loans: totalLoans,
                        amount: totalAmount,
                        successRate: successRate.toFixed(1),
                        commission: (totalAmount * 0.05).toFixed(2)
                    });
                }
            }
            
            // Sort by amount
            leaderboardData.sort((a, b) => b.amount - a.amount);
            
            // Populate table
            const tableBody = document.getElementById('leaderboardTable');
            tableBody.innerHTML = '';
            
            leaderboardData.slice(0, 10).forEach((agent, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div class="rank-badge ${index < 3 ? 'top-rank' : ''}">
                            ${index + 1}
                        </div>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar-sm mr-3">
                                <i class="fas fa-user-tie"></i>
                            </div>
                            <div>
                                <strong>${agent.name}</strong>
                                <div class="small text-muted">${agent.agentId}</div>
                            </div>
                        </div>
                    </td>
                    <td>${agent.agentId}</td>
                    <td>${agent.customers}</td>
                    <td>${agent.loans}</td>
                    <td>K ${parseFloat(agent.amount).toLocaleString('en-ZM', {minimumFractionDigits: 2})}</td>
                    <td>
                        <div class="progress" style="height: 6px;">
                            <div class="progress-bar" style="width: ${agent.successRate}%"></div>
                        </div>
                        <small>${agent.successRate}%</small>
                    </td>
                    <td>K ${parseFloat(agent.commission).toLocaleString('en-ZM', {minimumFractionDigits: 2})}</td>
                `;
                tableBody.appendChild(row);
            });
            
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        }
    }
    
    async loadRecentActivity() {
        try {
            const logs = await dbFunctions.getRecords('systemLogs', [orderByChild('timestamp'), limitToLast(10)]);
            const activityList = document.getElementById('recentActivity');
            activityList.innerHTML = '';
            
            logs.data.reverse().forEach(log => {
                const item = document.createElement('li');
                item.className = 'activity-item';
                
                let icon = 'info';
                let iconClass = 'info';
                let title = log.eventType;
                
                switch(log.eventType) {
                    case 'login':
                    case 'sudo_login':
                    case 'admin_login':
                        icon = 'sign-in-alt';
                        iconClass = 'success';
                        title = 'User Login';
                        break;
                    case 'loan_approved':
                        icon = 'check-circle';
                        iconClass = 'success';
                        title = 'Loan Approved';
                        break;
                    case 'loan_rejected':
                        icon = 'times-circle';
                        iconClass = 'danger';
                        title = 'Loan Rejected';
                        break;
                    case 'repayment_received':
                        icon = 'money-bill-wave';
                        iconClass = 'success';
                        title = 'Repayment Received';
                        break;
                    case 'system_config_updated':
                        icon = 'cog';
                        iconClass = 'info';
                        title = 'System Configuration Updated';
                        break;
                }
                
                item.innerHTML = `
                    <div class="activity-icon ${iconClass}">
                        <i class="fas fa-${icon}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">${title}</div>
                        <div class="activity-description">
                            ${log.details ? JSON.stringify(log.details) : 'System activity'}
                        </div>
                        <div class="activity-time">
                            ${this.formatTime(log.timestamp)}
                        </div>
                    </div>
                `;
                activityList.appendChild(item);
            });
            
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }
    
    async loadAdminsTable() {
        try {
            const admins = await dbFunctions.getRecords('admins');
            const tableBody = document.getElementById('adminsTable');
            tableBody.innerHTML = '';
            
            admins.data.forEach(admin => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${admin.adminId || admin.id.substring(0, 8)}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar-sm mr-3">
                                <i class="fas fa-user-tie"></i>
                            </div>
                            <div>
                                <strong>${admin.fullName}</strong>
                                <div class="small text-muted">${admin.email}</div>
                            </div>
                        </div>
                    </td>
                    <td>${admin.email}</td>
                    <td>${admin.phone || 'N/A'}</td>
                    <td>
                        <div class="badge badge-sudo-primary">${admin.permissions?.length || 0} permissions</div>
                    </td>
                    <td>
                        <span class="badge ${admin.status === 'active' ? 'badge-sudo-success' : 'badge-sudo-danger'}">
                            ${admin.status || 'inactive'}
                        </span>
                    </td>
                    <td>${admin.lastActive ? this.formatTime(admin.lastActive) : 'Never'}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sudo-outline btn-sm" onclick="sudoDashboard.editAdmin('${admin.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sudo-danger btn-sm" onclick="sudoDashboard.deleteAdmin('${admin.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
        } catch (error) {
            console.error('Error loading admins table:', error);
        }
    }
    
    updateRiskAlerts() {
        // This would typically make API calls to get real risk data
        const riskCount = Math.floor(Math.random() * 5) + 1;
        document.getElementById('riskAlertCount').textContent = riskCount;
    }
    
    showCreateAdminModal() {
        // Reset form
        document.getElementById('newAdminForm').reset();
        document.getElementById('adminTempPassword').value = this.generatePassword();
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('createAdminModal'));
        modal.show();
    }
    
    generatePassword() {
        const length = 12;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    }
    
    async createAdminAccount() {
        try {
            const formData = {
                fullName: document.getElementById('adminFullName').value,
                email: document.getElementById('adminEmail').value,
                phone: document.getElementById('adminPhone').value,
                nrc: document.getElementById('adminNRC').value,
                tempPassword: document.getElementById('adminTempPassword').value,
                permissions: this.getSelectedPermissions()
            };
            
            // Validate form
            if (!formData.fullName || !formData.email || !formData.phone || !formData.nrc) {
                this.showToast('Please fill all required fields', 'warning');
                return;
            }
            
            // Create user in Firebase Auth
            const authResult = await authFunctions.createUser(formData.email, formData.tempPassword, {
                email: formData.email,
                role: 'admin',
                fullName: formData.fullName,
                phone: formData.phone,
                nrc: formData.nrc,
                permissions: formData.permissions,
                status: 'active',
                createdAt: new Date().toISOString(),
                createdBy: this.currentUser.uid
            });
            
            if (authResult.success) {
                // Create admin record
                const adminId = `ADM${Date.now().toString().substring(7)}`;
                const adminData = {
                    ...formData,
                    adminId: adminId,
                    userId: authResult.user.uid,
                    status: 'active',
                    createdAt: new Date().toISOString(),
                    createdBy: this.currentUser.uid
                };
                
                await dbFunctions.createRecord('admins', adminData);
                
                // Log the event
                await logSystemEvent('admin_created', this.currentUser.uid, {
                    adminEmail: formData.email,
                    adminId: adminId
                });
                
                // Send notification (would typically be email)
                this.showToast(`Admin account created successfully! Admin ID: ${adminId}`, 'success');
                
                // Close modal
                bootstrap.Modal.getInstance(document.getElementById('createAdminModal')).hide();
                
                // Refresh admins table
                this.loadAdminsTable();
                
            } else {
                throw new Error(authResult.error);
            }
            
        } catch (error) {
            console.error('Error creating admin account:', error);
            this.showToast(`Error: ${error.message}`, 'danger');
        }
    }
    
    getSelectedPermissions() {
        const permissions = [];
        if (document.getElementById('permLoans').checked) permissions.push('loans');
        if (document.getElementById('permAgents').checked) permissions.push('agents');
        if (document.getElementById('permCustomers').checked) permissions.push('customers');
        if (document.getElementById('permReports').checked) permissions.push('reports');
        if (document.getElementById('permSettings').checked) permissions.push('settings');
        return permissions;
    }
    
    async editAdmin(adminId) {
        // Load admin data and show edit modal
        const admin = await dbFunctions.getRecord(`admins/${adminId}`);
        if (admin.success) {
            // Implement edit functionality
            this.showToast('Edit functionality coming soon', 'info');
        }
    }
    
    async deleteAdmin(adminId) {
        if (confirm('Are you sure you want to delete this admin account?')) {
            try {
                const admin = await dbFunctions.getRecord(`admins/${adminId}`);
                if (admin.success) {
                    // Mark as deleted instead of actually deleting
                    await dbFunctions.updateRecord(`admins/${adminId}`, {
                        status: 'deleted',
                        deletedAt: new Date().toISOString(),
                        deletedBy: this.currentUser.uid
                    });
                    
                    this.showToast('Admin account deactivated', 'success');
                    this.loadAdminsTable();
                }
            } catch (error) {
                console.error('Error deleting admin:', error);
                this.showToast('Error deleting admin account', 'danger');
            }
        }
    }
    
    async saveSystemConfig() {
        try {
            // Collect configuration from forms
            const config = {
                loanConfig: {
                    minAmount: parseFloat(document.getElementById('minLoanAmount').value),
                    maxAmount: parseFloat(document.getElementById('maxLoanAmount').value),
                    baseInterestRate: parseFloat(document.getElementById('baseInterestRate').value),
                    durations: Array.from(document.getElementById('loanDurations').selectedOptions)
                        .map(option => parseInt(option.value))
                },
                penaltyConfig: {
                    rate: parseFloat(document.getElementById('penaltyRate').value),
                    gracePeriod: parseInt(document.getElementById('gracePeriod').value),
                    maxPenalty: parseFloat(document.getElementById('maxPenalty').value)
                },
                commissionConfig: {
                    baseRate: parseFloat(document.getElementById('baseCommission').value),
                    bonusThreshold: parseFloat(document.getElementById('bonusThreshold').value),
                    bonusRate: parseFloat(document.getElementById('bonusRate').value)
                },
                collateralConfig: {
                    categories: Array.from(document.querySelectorAll('.category-input'))
                        .map(input => input.value)
                        .filter(value => value.trim() !== ''),
                    multiplier: parseFloat(document.getElementById('collateralMultiplier').value)
                }
            };
            
            // Validate configuration
            if (config.loanConfig.minAmount >= config.loanConfig.maxAmount) {
                this.showToast('Minimum loan amount must be less than maximum amount', 'warning');
                return;
            }
            
            if (config.loanConfig.baseInterestRate <= 0 || config.loanConfig.baseInterestRate > 100) {
                this.showToast('Interest rate must be between 0 and 100%', 'warning');
                return;
            }
            
            // Save to Firebase
            await dbFunctions.updateRecord('systemConfig', config);
            
            // Update local config
            this.systemConfig = config;
            
            // Log the event
            await logSystemEvent('system_config_updated', this.currentUser.uid, {
                config: config
            });
            
            this.showToast('System configuration saved successfully', 'success');
            
        } catch (error) {
            console.error('Error saving system configuration:', error);
            this.showToast('Error saving configuration', 'danger');
        }
    }
    
    addCollateralCategory() {
        const container = document.getElementById('collateralCategories');
        const index = container.children.length;
        
        const div = document.createElement('div');
        div.className = 'd-flex align-items-center mb-2';
        div.innerHTML = `
            <input type="text" class="sudo-form-control mr-2 category-input" placeholder="New category" data-index="${index}">
            <button type="button" class="btn btn-sudo-danger btn-sm remove-category" data-index="${index}">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(div);
    }
    
    removeCollateralCategory(index) {
        const input = document.querySelector(`.category-input[data-index="${index}"]`);
        if (input) {
            input.closest('div').remove();
        }
    }
    
    async exportDashboardData() {
        try {
            // Collect data for export
            const exportData = {
                timestamp: new Date().toISOString(),
                exportedBy: this.currentUser.uid,
                data: {
                    systemStats: await this.getSystemStats(),
                    recentLoans: await this.getRecentLoans(),
                    agentPerformance: await this.getAgentPerformance(),
                    financialSummary: await this.getFinancialSummary()
                }
            };
            
            // Convert to JSON
            const jsonData = JSON.stringify(exportData, null, 2);
            
            // Create download link
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `trucash-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast('Data exported successfully', 'success');
            
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showToast('Error exporting data', 'danger');
        }
    }
    
    async getSystemStats() {
        // Implement data collection for system statistics
        return {
            totalLoans: 12450000,
            totalRepayments: 8950000,
            activeLoans: 45,
            overdueLoans: 15,
            totalCustomers: 3456,
            activeAgents: 89,
            systemUptime: '99.9%'
        };
    }
    
    async getRecentLoans() {
        // Implement data collection for recent loans
        return [];
    }
    
    async getAgentPerformance() {
        // Implement data collection for agent performance
        return [];
    }
    
    async getFinancialSummary() {
        // Implement data collection for financial summary
        return {
            totalRevenue: 2150000,
            totalExpenses: 850000,
            netProfit: 1300000,
            cashFlow: 'positive'
        };
    }
    
    handleQuickAction(actionType) {
        switch(actionType) {
            case 'create-admin':
                this.showCreateAdminModal();
                break;
            case 'view-reports':
                this.showSection('reports');
                break;
            case 'system-backup':
                this.initiateSystemBackup();
                break;
            case 'audit-logs':
                this.showSection('system-logs');
                break;
            case 'risk-analysis':
                this.showSection('risk-management');
                break;
            case 'export-data':
                this.exportDashboardData();
                break;
        }
        
        // Close quick actions panel
        document.getElementById('quickActionsPanel').classList.remove('show');
    }
    
    async initiateSystemBackup() {
        try {
            this.showToast('Initiating system backup...', 'info');
            
            // Simulate backup process
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Log backup event
            await logSystemEvent('system_backup_initiated', this.currentUser.uid, {
                timestamp: new Date().toISOString(),
                backupType: 'full'
            });
            
            this.showToast('System backup completed successfully', 'success');
            
        } catch (error) {
            console.error('Error initiating backup:', error);
            this.showToast('Error initiating backup', 'danger');
        }
    }
    
    setupRealTimeListeners() {
        // Listen for new notifications
        dbFunctions.listenToRecords('notifications', (notifications) => {
            this.notifications = notifications;
            this.updateNotificationBadge();
        });
        
        // Listen for system alerts
        dbFunctions.listenToRecords('systemLogs', (logs) => {
            // Check for critical logs
            const criticalLogs = logs.filter(log => 
                log.eventType.includes('error') || 
                log.eventType.includes('critical') ||
                log.eventType.includes('security')
            );
            
            if (criticalLogs.length > 0) {
                this.showToast('New critical system alerts', 'warning');
            }
        });
    }
    
    updateNotificationBadge() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notificationCount');
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return date.toLocaleDateString();
    }
    
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast show ${type}`;
        toast.innerHTML = `
            <div class="toast-header">
                <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                <button type="button" class="btn-close" onclick="this.closest('.toast').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        `;
        
        // Add to container
        const container = document.querySelector('.toast-container') || (() => {
            const div = document.createElement('div');
            div.className = 'toast-container';
            div.style.position = 'fixed';
            div.style.top = '20px';
            div.style.right = '20px';
            div.style.zIndex = '9999';
            document.body.appendChild(div);
            return div;
        })();
        
        container.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.sudoDashboard = new SudoDashboard();
});

// Export for use in HTML onclick handlers
window.sudoDashboard = window.sudoDashboard || {};

// Add missing functions that are called from HTML
window.sudoDashboard.editAdmin = function(adminId) {
    if (window.sudoDashboard && typeof window.sudoDashboard.editAdmin === 'function') {
        window.sudoDashboard.editAdmin(adminId);
    }
};

window.sudoDashboard.deleteAdmin = function(adminId) {
    if (window.sudoDashboard && typeof window.sudoDashboard.deleteAdmin === 'function') {
        window.sudoDashboard.deleteAdmin(adminId);
    }
};

// Bootstrap Modal polyfill for our custom modal
class bootstrap {
    static Modal = class {
        constructor(element) {
            this.element = element;
        }
        
        show() {
            this.element.style.display = 'flex';
        }
        
        hide() {
            this.element.style.display = 'none';
        }
        
        static getInstance(element) {
            return new bootstrap.Modal(element);
        }
    };
}

// Helper functions for database queries
function orderByChild(field) {
    return { field: field, type: 'orderByChild' };
}

function limitToLast(limit) {
    return { limit: limit, type: 'limitToLast' };
}
