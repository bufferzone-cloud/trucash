import { auth, database, storage, getAuth, createUserWithEmailAndPassword, signOut, ref, set, get, update, push, onValue, off, query, orderByChild, equalTo } from './firebase.js';
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const logoutBtn = document.getElementById('logoutBtn');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    const pageTitle = document.getElementById('pageTitle');
    const currentDate = document.getElementById('currentDate');
    const refreshBtn = document.getElementById('refreshBtn');
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    const sections = document.querySelectorAll('.section-content');
    const createAdminBtn = document.getElementById('createAdminBtn');
    const createAdminModal = document.getElementById('createAdminModal');
    const closeAdminModal = document.getElementById('closeAdminModal');
    const cancelAdminCreate = document.getElementById('cancelAdminCreate');
    const createAdminForm = document.getElementById('createAdminForm');
    const refreshAdmins = document.getElementById('refreshAdmins');
    const saveConfigBtn = document.getElementById('saveConfigBtn');
    const exportLeaderboard = document.getElementById('exportLeaderboard');
    const generatePDF = document.getElementById('generatePDF');
    const generateExcel = document.getElementById('generateExcel');
    const markAllRead = document.getElementById('markAllRead');
    const clearAlerts = document.getElementById('clearAlerts');
    
    // Charts
    let loanDistributionChart = null;
    let revenueTrendChart = null;
    
    // Current User
    let currentUser = null;
    let currentUserId = null;
    let systemConfig = {};
    let allLoans = [];
    let allUsers = [];
    let allTransactions = [];

    // Initialize Date
    updateCurrentDate();

    // Initialize System
    initializeSystem();

    // Event Listeners
    menuToggle.addEventListener('click', toggleSidebar);
    logoutBtn.addEventListener('click', handleLogout);
    refreshBtn.addEventListener('click', refreshDashboard);
    
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            switchSection(section);
            updateActiveMenuItem(item);
        });
    });

    createAdminBtn.addEventListener('click', () => showModal(createAdminModal));
    closeAdminModal.addEventListener('click', () => hideModal(createAdminModal));
    cancelAdminCreate.addEventListener('click', () => hideModal(createAdminModal));
    
    createAdminForm.addEventListener('submit', handleCreateAdmin);
    refreshAdmins.addEventListener('click', loadAdmins);
    saveConfigBtn.addEventListener('click', saveSystemConfig);
    exportLeaderboard.addEventListener('click', exportLeaderboardData);
    generatePDF.addEventListener('click', generatePDFReport);
    generateExcel.addEventListener('click', generateExcelReport);
    markAllRead.addEventListener('click', markAllAlertsRead);
    clearAlerts.addEventListener('click', clearAllAlerts);

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === createAdminModal) {
            hideModal(createAdminModal);
        }
    });

    // Functions
    function updateCurrentDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        currentDate.textContent = now.toLocaleDateString('en-US', options);
    }

    function toggleSidebar() {
        sidebar.classList.toggle('active');
    }

    function updateActiveMenuItem(selectedItem) {
        menuItems.forEach(item => item.classList.remove('active'));
        selectedItem.classList.add('active');
    }

    function switchSection(section) {
        // Update page title
        const titleMap = {
            'dashboard': 'Dashboard',
            'admins': 'Admin Management',
            'system-config': 'System Configuration',
            'reports': 'Reports & Analytics',
            'loans-overview': 'All Loans',
            'transactions': 'Transactions',
            'revenue': 'Revenue Analysis',
            'risk-alerts': 'Risk Alerts',
            'audit-log': 'Audit Log',
            'agent-performance': 'Agent Performance'
        };
        
        pageTitle.textContent = titleMap[section] || 'Dashboard';
        
        // Show selected section
        sections.forEach(sec => {
            sec.classList.remove('active');
            if (sec.id === section + 'Section') {
                sec.classList.add('active');
            }
        });

        // Load section data
        switch(section) {
            case 'dashboard':
                loadDashboardData();
                break;
            case 'admins':
                loadAdmins();
                break;
            case 'system-config':
                loadSystemConfig();
                break;
            case 'reports':
                initializeReports();
                break;
            case 'risk-alerts':
                loadRiskAlerts();
                break;
        }
    }

    async function initializeSystem() {
        try {
            // Wait for auth state
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    currentUser = user;
                    currentUserId = user.uid;
                    
                    // Load user data
                    await loadUserData();
                    
                    // Load initial data
                    await loadSystemConfig();
                    await loadDashboardData();
                    await initializeCharts();
                    
                    // Start real-time listeners
                    startRealtimeListeners();
                } else {
                    // Redirect to login if not authenticated
                    window.location.href = 'index.html';
                }
            });
        } catch (error) {
            console.error('System initialization error:', error);
            showError('Failed to initialize system');
        }
    }

    async function loadUserData() {
        try {
            const userRef = ref(database, 'users/' + currentUserId);
            const snapshot = await get(userRef);
            
            if (snapshot.exists()) {
                const userData = snapshot.val();
                userName.textContent = userData.fullName || 'System Administrator';
                userEmail.textContent = userData.email || currentUser.email;
                
                // Verify sudo role
                if (userData.role !== 'sudo') {
                    showError('Unauthorized access');
                    await handleLogout();
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    async function loadSystemConfig() {
        try {
            const configRef = ref(database, 'system/config');
            const snapshot = await get(configRef);
            
            if (snapshot.exists()) {
                systemConfig = snapshot.val();
                populateConfigForm();
            } else {
                // Create default config
                systemConfig = {
                    loan: {
                        minAmount: 500,
                        maxAmount: 50000,
                        baseInterestRate: 15,
                        durations: [3, 6, 9, 12, 18, 24]
                    },
                    penalty: {
                        dailyRate: 0.5,
                        gracePeriod: 7,
                        maxPenalty: 25
                    },
                    agent: {
                        commissionRate: 2.5,
                        minCustomersForBonus: 10,
                        bonusRate: 0.5
                    },
                    collateral: {
                        categories: ['Vehicle', 'Electronics', 'Jewelry', 'Real Estate', 'Machinery', 'Other Valuables'],
                        minPhotos: 3,
                        assessmentRate: 70
                    },
                    modules: {
                        sms: true,
                        email: true,
                        otp: true,
                        autoApprove: true,
                        penaltyAuto: true
                    }
                };
                await set(configRef, systemConfig);
                populateConfigForm();
            }
        } catch (error) {
            console.error('Error loading system config:', error);
        }
    }

    function populateConfigForm() {
        if (!systemConfig) return;
        
        // Loan Configuration
        document.getElementById('minLoanAmount').value = systemConfig.loan?.minAmount || 500;
        document.getElementById('maxLoanAmount').value = systemConfig.loan?.maxAmount || 50000;
        document.getElementById('baseInterestRate').value = systemConfig.loan?.baseInterestRate || 15;
        document.getElementById('loanDurations').value = systemConfig.loan?.durations?.join(',') || '3,6,9,12,18,24';
        
        // Penalty Configuration
        document.getElementById('dailyPenaltyRate').value = systemConfig.penalty?.dailyRate || 0.5;
        document.getElementById('gracePeriod').value = systemConfig.penalty?.gracePeriod || 7;
        document.getElementById('maxPenalty').value = systemConfig.penalty?.maxPenalty || 25;
        
        // Agent Configuration
        document.getElementById('agentCommission').value = systemConfig.agent?.commissionRate || 2.5;
        document.getElementById('minCustomersForBonus').value = systemConfig.agent?.minCustomersForBonus || 10;
        document.getElementById('bonusRate').value = systemConfig.agent?.bonusRate || 0.5;
        
        // Collateral Configuration
        document.getElementById('collateralCategories').value = systemConfig.collateral?.categories?.join(', ') || '';
        document.getElementById('minCollateralPhotos').value = systemConfig.collateral?.minPhotos || 3;
        document.getElementById('collateralAssessmentRate').value = systemConfig.collateral?.assessmentRate || 70;
        
        // System Modules
        document.getElementById('moduleSMS').checked = systemConfig.modules?.sms !== false;
        document.getElementById('moduleEmail').checked = systemConfig.modules?.email !== false;
        document.getElementById('moduleOTP').checked = systemConfig.modules?.otp !== false;
        document.getElementById('moduleAutoApprove').checked = systemConfig.modules?.autoApprove !== false;
        document.getElementById('modulePenaltyAuto').checked = systemConfig.modules?.penaltyAuto !== false;
    }

    async function saveSystemConfig() {
        try {
            const config = {
                loan: {
                    minAmount: parseInt(document.getElementById('minLoanAmount').value) || 500,
                    maxAmount: parseInt(document.getElementById('maxLoanAmount').value) || 50000,
                    baseInterestRate: parseFloat(document.getElementById('baseInterestRate').value) || 15,
                    durations: document.getElementById('loanDurations').value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d))
                },
                penalty: {
                    dailyRate: parseFloat(document.getElementById('dailyPenaltyRate').value) || 0.5,
                    gracePeriod: parseInt(document.getElementById('gracePeriod').value) || 7,
                    maxPenalty: parseFloat(document.getElementById('maxPenalty').value) || 25
                },
                agent: {
                    commissionRate: parseFloat(document.getElementById('agentCommission').value) || 2.5,
                    minCustomersForBonus: parseInt(document.getElementById('minCustomersForBonus').value) || 10,
                    bonusRate: parseFloat(document.getElementById('bonusRate').value) || 0.5
                },
                collateral: {
                    categories: document.getElementById('collateralCategories').value.split(',').map(c => c.trim()).filter(c => c),
                    minPhotos: parseInt(document.getElementById('minCollateralPhotos').value) || 3,
                    assessmentRate: parseFloat(document.getElementById('collateralAssessmentRate').value) || 70
                },
                modules: {
                    sms: document.getElementById('moduleSMS').checked,
                    email: document.getElementById('moduleEmail').checked,
                    otp: document.getElementById('moduleOTP').checked,
                    autoApprove: document.getElementById('moduleAutoApprove').checked,
                    penaltyAuto: document.getElementById('modulePenaltyAuto').checked
                }
            };

            const configRef = ref(database, 'system/config');
            await set(configRef, config);
            
            systemConfig = config;
            showSuccess('System configuration saved successfully');
            
            // Log activity
            logActivity('System configuration updated', 'config_update');
            
        } catch (error) {
            console.error('Error saving system config:', error);
            showError('Failed to save configuration');
        }
    }

    async function loadDashboardData() {
        try {
            // Load all loans
            const loansRef = ref(database, 'loans');
            const loansSnapshot = await get(loansRef);
            allLoans = [];
            
            if (loansSnapshot.exists()) {
                loansSnapshot.forEach(childSnapshot => {
                    const loan = childSnapshot.val();
                    loan.id = childSnapshot.key;
                    allLoans.push(loan);
                });
            }
            
            // Calculate statistics
            calculateLoanStatistics();
            updateLeaderboard();
            loadRecentActivity();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    function calculateLoanStatistics() {
        let totalLoans = 0;
        let totalRepayments = 0;
        let overdueAmount = 0;
        let overdueCount = 0;
        let defaultedAmount = 0;
        let defaultedCount = 0;
        let totalRevenue = 0;
        
        allLoans.forEach(loan => {
            totalLoans += loan.amount || 0;
            
            if (loan.repayments) {
                Object.values(loan.repayments).forEach(repayment => {
                    totalRepayments += repayment.amount || 0;
                    totalRevenue += repayment.interest || 0;
                });
            }
            
            if (loan.status === 'overdue') {
                overdueAmount += loan.amount || 0;
                overdueCount++;
            } else if (loan.status === 'defaulted') {
                defaultedAmount += loan.amount || 0;
                defaultedCount++;
            }
        });
        
        // Update UI
        document.getElementById('totalLoans').textContent = `K ${formatNumber(totalLoans)}`;
        document.getElementById('totalRepayments').textContent = `K ${formatNumber(totalRepayments)}`;
        document.getElementById('overdueLoans').textContent = `K ${formatNumber(overdueAmount)}`;
        document.getElementById('overdueCount').textContent = `${overdueCount} loans`;
        document.getElementById('defaultedLoans').textContent = `K ${formatNumber(defaultedAmount)}`;
        document.getElementById('defaultedCount').textContent = `${defaultedCount} loans`;
        document.getElementById('totalRevenue').textContent = `K ${formatNumber(totalRevenue)}`;
        
        // Update risk badge
        document.getElementById('riskBadge').textContent = overdueCount + defaultedCount;
    }

    async function updateLeaderboard() {
        try {
            // Load all agents
            const agentsRef = query(ref(database, 'users'), orderByChild('role'), equalTo('agent'));
            const agentsSnapshot = await get(agentsRef);
            const agents = [];
            
            if (agentsSnapshot.exists()) {
                agentsSnapshot.forEach(childSnapshot => {
                    const agent = childSnapshot.val();
                    agent.id = childSnapshot.key;
                    agents.push(agent);
                });
            }
            
            // Update active agents count
            document.getElementById('activeAgents').textContent = agents.length;
            document.getElementById('totalAgents').textContent = `${agents.length} total`;
            
            // Calculate agent performance
            const agentPerformance = agents.map(agent => {
                const agentLoans = allLoans.filter(loan => loan.agentId === agent.id);
                const activeLoans = agentLoans.filter(loan => loan.status === 'active').length;
                const totalVolume = agentLoans.reduce((sum, loan) => sum + (loan.amount || 0), 0);
                
                return {
                    name: agent.fullName || 'Unknown Agent',
                    id: agent.agentId || agent.id.substring(0, 8),
                    customers: agent.customers ? Object.keys(agent.customers).length : 0,
                    activeLoans,
                    totalVolume,
                    recoveryRate: calculateRecoveryRate(agentLoans),
                    commission: calculateCommission(agentLoans)
                };
            });
            
            // Sort by total volume
            agentPerformance.sort((a, b) => b.totalVolume - a.totalVolume);
            
            // Update leaderboard table
            const leaderboardBody = document.getElementById('leaderboardBody');
            leaderboardBody.innerHTML = '';
            
            if (agentPerformance.length === 0) {
                leaderboardBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="empty-state">
                            <i class="fas fa-chart-bar"></i>
                            <p>No agent data available</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            agentPerformance.forEach((agent, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <span class="rank-badge ${index < 3 ? 'top-rank' : ''}">${index + 1}</span>
                    </td>
                    <td><strong>${agent.name}</strong></td>
                    <td><code>${agent.id}</code></td>
                    <td>${agent.customers}</td>
                    <td>${agent.activeLoans}</td>
                    <td>K ${formatNumber(agent.totalVolume)}</td>
                    <td>
                        <span class="progress-text">${agent.recoveryRate}%</span>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${agent.recoveryRate}%"></div>
                        </div>
                    </td>
                    <td>K ${formatNumber(agent.commission)}</td>
                `;
                leaderboardBody.appendChild(row);
            });
            
        } catch (error) {
            console.error('Error updating leaderboard:', error);
        }
    }

    function calculateRecoveryRate(loans) {
        if (loans.length === 0) return 0;
        
        let totalExpected = 0;
        let totalPaid = 0;
        
        loans.forEach(loan => {
            totalExpected += loan.totalPayable || loan.amount || 0;
            
            if (loan.repayments) {
                Object.values(loan.repayments).forEach(repayment => {
                    totalPaid += repayment.amount || 0;
                });
            }
        });
        
        return totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;
    }

    function calculateCommission(loans) {
        if (!systemConfig.agent) return 0;
        
        const commissionRate = systemConfig.agent.commissionRate || 2.5;
        const bonusRate = systemConfig.agent.bonusRate || 0.5;
        const minCustomers = systemConfig.agent.minCustomersForBonus || 10;
        
        let totalCommission = 0;
        
        loans.forEach(loan => {
            if (loan.status === 'approved' || loan.status === 'active' || loan.status === 'repaid') {
                const loanCommission = (loan.amount || 0) * (commissionRate / 100);
                totalCommission += loanCommission;
            }
        });
        
        // Apply bonus if eligible
        const uniqueCustomers = new Set(loans.map(loan => loan.customerId)).size;
        if (uniqueCustomers >= minCustomers) {
            totalCommission += totalCommission * (bonusRate / 100);
        }
        
        return Math.round(totalCommission);
    }

    async function loadAdmins() {
        try {
            const adminsRef = query(ref(database, 'users'), orderByChild('role'), equalTo('admin'));
            const snapshot = await get(adminsRef);
            const adminsTableBody = document.getElementById('adminsTableBody');
            adminsTableBody.innerHTML = '';
            
            if (!snapshot.exists()) {
                adminsTableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="empty-state">
                            <i class="fas fa-user-shield"></i>
                            <p>No admin accounts found</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            snapshot.forEach(childSnapshot => {
                const admin = childSnapshot.val();
                const row = document.createElement('tr');
                
                const statusClass = admin.isActive === false ? 'text-danger' : 'text-success';
                const statusText = admin.isActive === false ? 'Suspended' : 'Active';
                
                const permissions = admin.permissions || ['all'];
                const permissionsText = permissions.includes('all') ? 'All' : permissions.join(', ');
                
                row.innerHTML = `
                    <td><code>${childSnapshot.key.substring(0, 8)}</code></td>
                    <td><strong>${admin.fullName || 'Unknown'}</strong></td>
                    <td>${admin.email}</td>
                    <td>${formatDate(admin.createdAt)}</td>
                    <td><span class="${statusClass}">${statusText}</span></td>
                    <td><small>${permissionsText}</small></td>
                    <td>${admin.lastLogin ? formatDate(admin.lastLogin) : 'Never'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn edit" data-id="${childSnapshot.key}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn ${admin.isActive === false ? 'activate' : 'suspend'}" 
                                    data-id="${childSnapshot.key}" 
                                    data-action="${admin.isActive === false ? 'activate' : 'suspend'}"
                                    title="${admin.isActive === false ? 'Activate' : 'Suspend'}">
                                <i class="fas fa-${admin.isActive === false ? 'check-circle' : 'pause-circle'}"></i>
                            </button>
                            <button class="action-btn delete" data-id="${childSnapshot.key}" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                adminsTableBody.appendChild(row);
            });
            
            // Add event listeners to action buttons
            document.querySelectorAll('.action-btn').forEach(button => {
                button.addEventListener('click', handleAdminAction);
            });
            
        } catch (error) {
            console.error('Error loading admins:', error);
            showError('Failed to load admin accounts');
        }
    }

    async function handleAdminAction(e) {
        const button = e.currentTarget;
        const adminId = button.dataset.id;
        const action = button.dataset.action;
        
        try {
            const adminRef = ref(database, 'users/' + adminId);
            
            switch(action) {
                case 'suspend':
                    await update(adminRef, { isActive: false });
                    showSuccess('Admin account suspended');
                    logActivity(`Suspended admin account: ${adminId}`, 'admin_suspend');
                    break;
                    
                case 'activate':
                    await update(adminRef, { isActive: true });
                    showSuccess('Admin account activated');
                    logActivity(`Activated admin account: ${adminId}`, 'admin_activate');
                    break;
                    
                default:
                    // Edit or delete
                    if (button.classList.contains('delete')) {
                        if (confirm('Are you sure you want to delete this admin account? This action cannot be undone.')) {
                            await set(adminRef, null);
                            showSuccess('Admin account deleted');
                            logActivity(`Deleted admin account: ${adminId}`, 'admin_delete');
                        }
                    } else if (button.classList.contains('edit')) {
                        // TODO: Implement edit functionality
                        showInfo('Edit functionality coming soon');
                    }
            }
            
            // Refresh admin list
            loadAdmins();
            
        } catch (error) {
            console.error('Error performing admin action:', error);
            showError('Failed to perform action');
        }
    }

    async function handleCreateAdmin(e) {
        e.preventDefault();
        
        const fullName = document.getElementById('adminFullName').value.trim();
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value;
        const confirmPassword = document.getElementById('adminConfirmPassword').value;
        
        // Validation
        if (!fullName || !email || !password || !confirmPassword) {
            showError('Please fill in all fields');
            return;
        }
        
        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }
        
        if (password.length < 8) {
            showError('Password must be at least 8 characters');
            return;
        }
        
        // Get selected permissions
        const permissions = Array.from(document.querySelectorAll('input[name="permissions"]:checked'))
            .map(checkbox => checkbox.value);
        
        try {
            // Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newAdminId = userCredential.user.uid;
            
            // Create admin record in database
            const adminData = {
                fullName,
                email,
                role: 'admin',
                permissions: permissions.length > 0 ? permissions : ['all'],
                isActive: true,
                createdAt: new Date().toISOString(),
                createdBy: currentUserId
            };
            
            await set(ref(database, 'users/' + newAdminId), adminData);
            
            // Clear form and close modal
            createAdminForm.reset();
            hideModal(createAdminModal);
            
            showSuccess('Admin account created successfully');
            
            // Log activity
            logActivity(`Created new admin account: ${fullName} (${email})`, 'admin_create');
            
            // Refresh admin list
            loadAdmins();
            
        } catch (error) {
            console.error('Error creating admin:', error);
            
            switch(error.code) {
                case 'auth/email-already-in-use':
                    showError('Email address is already in use');
                    break;
                case 'auth/invalid-email':
                    showError('Invalid email address');
                    break;
                case 'auth/operation-not-allowed':
                    showError('Operation not allowed');
                    break;
                case 'auth/weak-password':
                    showError('Password is too weak');
                    break;
                default:
                    showError('Failed to create admin account');
            }
        }
    }

    function initializeCharts() {
        // Loan Distribution Chart
        const loanDistributionCtx = document.getElementById('loanDistributionChart').getContext('2d');
        loanDistributionChart = new Chart(loanDistributionCtx, {
            type: 'doughnut',
            data: {
                labels: ['Active', 'Pending', 'Overdue', 'Defaulted', 'Rejected', 'Repaid'],
                datasets: [{
                    data: [0, 0, 0, 0, 0, 0],
                    backgroundColor: [
                        '#10b981',
                        '#3b82f6',
                        '#f59e0b',
                        '#ef4444',
                        '#6b7280',
                        '#8b5cf6'
                    ],
                    borderWidth: 2,
                    borderColor: var(--sudo-bg)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw}`;
                            }
                        }
                    }
                }
            }
        });
        
        // Revenue Trend Chart
        const revenueTrendCtx = document.getElementById('revenueTrendChart').getContext('2d');
        revenueTrendChart = new Chart(revenueTrendCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Revenue',
                    data: [0, 0, 0, 0, 0, 0],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.6)'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.6)',
                            callback: function(value) {
                                return 'K ' + value;
                            }
                        }
                    }
                }
            }
        });
        
        // Update charts with real data
        updateCharts();
    }

    function updateCharts() {
        if (!loanDistributionChart || !revenueTrendChart) return;
        
        // Update loan distribution
        const loanCounts = {
            active: allLoans.filter(l => l.status === 'active').length,
            pending: allLoans.filter(l => l.status === 'pending').length,
            overdue: allLoans.filter(l => l.status === 'overdue').length,
            defaulted: allLoans.filter(l => l.status === 'defaulted').length,
            rejected: allLoans.filter(l => l.status === 'rejected').length,
            repaid: allLoans.filter(l => l.status === 'repaid').length
        };
        
        loanDistributionChart.data.datasets[0].data = Object.values(loanCounts);
        loanDistributionChart.update();
        
        // Update revenue trend (mock data for now)
        const revenueData = [15000, 18000, 22000, 19000, 25000, 30000];
        revenueTrendChart.data.datasets[0].data = revenueData;
        revenueTrendChart.update();
    }

    async function loadRecentActivity() {
        try {
            const activityRef = ref(database, 'system/activity');
            const snapshot = await get(activityRef);
            const activityList = document.getElementById('recentActivity');
            activityList.innerHTML = '';
            
            if (!snapshot.exists()) {
                activityList.innerHTML = `
                    <div class="activity-item">
                        <div class="activity-icon">
                            <i class="fas fa-info-circle"></i>
                        </div>
                        <div class="activity-content">
                            <p>No recent activity</p>
                            <span class="activity-time">Just now</span>
                        </div>
                    </div>
                `;
                return;
            }
            
            const activities = [];
            snapshot.forEach(childSnapshot => {
                activities.push(childSnapshot.val());
            });
            
            // Sort by timestamp (newest first)
            activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Show last 5 activities
            activities.slice(0, 5).forEach(activity => {
                const item = document.createElement('div');
                item.className = 'activity-item';
                
                const iconMap = {
                    'loan_approve': 'fa-check-circle',
                    'loan_reject': 'fa-times-circle',
                    'payment': 'fa-money-check',
                    'admin_create': 'fa-user-plus',
                    'admin_suspend': 'fa-user-slash',
                    'admin_activate': 'fa-user-check',
                    'admin_delete': 'fa-user-minus',
                    'config_update': 'fa-cogs',
                    'system_alert': 'fa-exclamation-triangle'
                };
                
                const icon = iconMap[activity.type] || 'fa-info-circle';
                const timeAgo = getTimeAgo(activity.timestamp);
                
                item.innerHTML = `
                    <div class="activity-icon">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="activity-content">
                        <p>${activity.message}</p>
                        <span class="activity-time">${timeAgo}</span>
                    </div>
                `;
                activityList.appendChild(item);
            });
            
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    async function loadRiskAlerts() {
        try {
            const alertsRef = ref(database, 'system/alerts');
            const snapshot = await get(alertsRef);
            
            let criticalCount = 0;
            let warningCount = 0;
            let infoCount = 0;
            
            const criticalAlerts = document.getElementById('criticalAlerts');
            const warningAlerts = document.getElementById('warningAlerts');
            const infoAlerts = document.getElementById('infoAlerts');
            
            criticalAlerts.innerHTML = '';
            warningAlerts.innerHTML = '';
            infoAlerts.innerHTML = '';
            
            if (!snapshot.exists()) {
                criticalAlerts.innerHTML = `
                    <div class="empty-alerts">
                        <i class="fas fa-check-circle"></i>
                        <p>No critical alerts</p>
                    </div>
                `;
                warningAlerts.innerHTML = `
                    <div class="empty-alerts">
                        <i class="fas fa-check-circle"></i>
                        <p>No high risk alerts</p>
                    </div>
                `;
                infoAlerts.innerHTML = `
                    <div class="empty-alerts">
                        <i class="fas fa-check-circle"></i>
                        <p>No medium risk alerts</p>
                    </div>
                `;
                return;
            }
            
            snapshot.forEach(childSnapshot => {
                const alert = childSnapshot.val();
                const alertElement = createAlertElement(alert);
                
                switch(alert.severity) {
                    case 'critical':
                        criticalCount++;
                        criticalAlerts.appendChild(alertElement);
                        break;
                    case 'warning':
                        warningCount++;
                        warningAlerts.appendChild(alertElement);
                        break;
                    case 'info':
                        infoCount++;
                        infoAlerts.appendChild(alertElement);
                        break;
                }
            });
            
            // Update counts
            document.getElementById('criticalCount').textContent = criticalCount;
            document.getElementById('warningCount').textContent = warningCount;
            document.getElementById('infoCount').textContent = infoCount;
            
            // Update risk metrics
            updateRiskMetrics();
            
        } catch (error) {
            console.error('Error loading risk alerts:', error);
        }
    }

    function createAlertElement(alert) {
        const div = document.createElement('div');
        div.className = `alert-item ${alert.severity}`;
        
        const iconMap = {
            'critical': 'fa-skull-crossbones',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        
        const timeAgo = getTimeAgo(alert.timestamp);
        
        div.innerHTML = `
            <div class="alert-item-header">
                <i class="fas ${iconMap[alert.severity] || 'fa-info-circle'}"></i>
                <span class="alert-item-title">${alert.title}</span>
                <span class="alert-item-time">${timeAgo}</span>
            </div>
            <div class="alert-item-message">${alert.message}</div>
            ${alert.loanId ? `<div class="alert-item-actions">
                <button class="btn-small" data-loan="${alert.loanId}">View Loan</button>
            </div>` : ''}
        `;
        
        return div;
    }

    function updateRiskMetrics() {
        // Calculate risk metrics based on loan data
        const totalLoans = allLoans.length;
        const defaultedLoans = allLoans.filter(l => l.status === 'defaulted').length;
        const overdueLoans = allLoans.filter(l => l.status === 'overdue').length;
        const activeLoans = allLoans.filter(l => l.status === 'active').length;
        
        const defaultRate = totalLoans > 0 ? (defaultedLoans / totalLoans * 100) : 0;
        const overdueRate = totalLoans > 0 ? (overdueLoans / totalLoans * 100) : 0;
        const recoveryRate = calculateRecoveryRate(allLoans);
        const collateralCoverage = calculateCollateralCoverage();
        
        document.getElementById('defaultRate').textContent = defaultRate.toFixed(1) + '%';
        document.getElementById('overdueRate').textContent = overdueRate.toFixed(1) + '%';
        document.getElementById('recoveryRate').textContent = recoveryRate + '%';
        document.getElementById('collateralCoverage').textContent = collateralCoverage + '%';
    }

    function calculateCollateralCoverage() {
        if (allLoans.length === 0) return 0;
        
        let totalLoanAmount = 0;
        let totalCollateralValue = 0;
        
        allLoans.forEach(loan => {
            totalLoanAmount += loan.amount || 0;
            totalCollateralValue += loan.collateralValue || 0;
        });
        
        return totalLoanAmount > 0 ? Math.round((totalCollateralValue / totalLoanAmount) * 100) : 0;
    }

    function startRealtimeListeners() {
        // Listen for new loans
        const loansRef = ref(database, 'loans');
        onValue(loansRef, (snapshot) => {
            allLoans = [];
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const loan = childSnapshot.val();
                    loan.id = childSnapshot.key;
                    allLoans.push(loan);
                });
                calculateLoanStatistics();
                updateCharts();
                updateLeaderboard();
            }
        });
        
        // Listen for system activity
        const activityRef = ref(database, 'system/activity');
        onValue(activityRef, () => {
            loadRecentActivity();
        });
        
        // Listen for alerts
        const alertsRef = ref(database, 'system/alerts');
        onValue(alertsRef, () => {
            loadRiskAlerts();
        });
    }

    async function logActivity(message, type = 'system') {
        try {
            const activityRef = ref(database, 'system/activity');
            const newActivityRef = push(activityRef);
            
            await set(newActivityRef, {
                message,
                type,
                timestamp: new Date().toISOString(),
                userId: currentUserId,
                userName: userName.textContent
            });
            
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    async function handleLogout() {
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
            showError('Failed to logout');
        }
    }

    function refreshDashboard() {
        loadDashboardData();
        loadRecentActivity();
        loadRiskAlerts();
        updateCurrentDate();
        showSuccess('Dashboard refreshed');
    }

    function exportLeaderboardData() {
        // TODO: Implement CSV export
        showInfo('Export functionality coming soon');
    }

    function generatePDFReport() {
        // TODO: Implement PDF generation
        showInfo('PDF generation coming soon');
    }

    function generateExcelReport() {
        // TODO: Implement Excel export
        showInfo('Excel export coming soon');
    }

    function markAllAlertsRead() {
        // TODO: Implement mark all as read
        showInfo('Mark all as read coming soon');
    }

    function clearAllAlerts() {
        if (confirm('Are you sure you want to clear all alerts?')) {
            // TODO: Implement clear all alerts
            showInfo('Clear all alerts coming soon');
        }
    }

    function initializeReports() {
        // Initialize date range picker
        flatpickr("#reportDateRange", {
            mode: "range",
            dateFormat: "Y-m-d",
            defaultDate: ["today-30d", "today"]
        });
        
        // Initialize report type functionality
        document.getElementById('applyReportFilters').addEventListener('click', generateReport);
    }

    async function generateReport() {
        const reportType = document.getElementById('reportType').value;
        const dateRange = document.getElementById('reportDateRange').value;
        const format = document.getElementById('reportFormat').value;
        
        // TODO: Implement report generation based on filters
        showInfo('Report generation with filters coming soon');
    }

    // Utility Functions
    function formatNumber(num) {
        return new Intl.NumberFormat('en-ZM').format(num);
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
        return formatDate(dateString);
    }

    function showModal(modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }

    function hideModal(modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    }

    function showSuccess(message) {
        showNotification(message, 'success');
    }

    function showError(message) {
        showNotification(message, 'error');
    }

    function showInfo(message) {
        showNotification(message, 'info');
    }

    function showNotification(message, type = 'info') {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 
                    type === 'error' ? 'fa-times-circle' : 
                    'fa-info-circle';
        
        notification.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
        
        // Add CSS for notification
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: var(--sudo-card-bg);
                    border: 1px solid var(--sudo-border);
                    border-radius: 12px;
                    padding: 16px 24px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    z-index: 3000;
                    transform: translateX(150%);
                    transition: transform 0.3s ease;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    max-width: 400px;
                }
                .notification.show {
                    transform: translateX(0);
                }
                .notification.success {
                    border-left: 4px solid var(--sudo-success);
                }
                .notification.error {
                    border-left: 4px solid var(--sudo-danger);
                }
                .notification.info {
                    border-left: 4px solid var(--sudo-info);
                }
                .notification i {
                    font-size: 20px;
                }
                .notification.success i {
                    color: var(--sudo-success);
                }
                .notification.error i {
                    color: var(--sudo-danger);
                }
                .notification.info i {
                    color: var(--sudo-info);
                }
                .notification span {
                    color: var(--sudo-text);
                    font-size: 14px;
                    font-weight: 500;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Initialize system on load
    initializeSystem();
});
