// Firebase configuration and database operations
const firebaseConfig = {
    apiKey: "AIzaSyCWm9yvg5he7Lncy3h51n7ytOq7AZrA9gs",
    authDomain: "trucash-9fee8.firebaseapp.com",
    databaseURL: "https://trucash-9fee8-default-rtdb.firebaseio.com",
    projectId: "trucash-9fee8",
    storageBucket: "trucash-9fee8.firebasestorage.app",
    messagingSenderId: "622416212225",
    appId: "1:622416212225:web:07418a9b16f955c330ab00",
    measurementId: "G-6TEZFNFDBK"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
const analytics = firebase.analytics();

// Firebase Database Operations
class FirebaseOperations {
    constructor() {
        this.db = database;
        this.auth = auth;
    }

    // User Management
    async createUser(email, password, userData) {
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const userId = userCredential.user.uid;
            
            // Store user data in database
            await this.db.ref('users/' + userId).set({
                ...userData,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                email: email
            });
            
            return { success: true, userId };
        } catch (error) {
            console.error('Error creating user:', error);
            return { success: false, error: error.message };
        }
    }

    async getUserData(userId) {
        const snapshot = await this.db.ref('users/' + userId).once('value');
        return snapshot.val();
    }

    async updateUser(userId, updates) {
        try {
            await this.db.ref('users/' + userId).update(updates);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Loan Operations
    async createLoan(loanData) {
        try {
            const loanId = this.generateId('loan');
            await this.db.ref('loans/' + loanId).set({
                ...loanData,
                loanId: loanId,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                status: 'pending'
            });
            
            // Update user's loan reference
            await this.db.ref('users/' + loanData.customerId + '/loans').push(loanId);
            
            return { success: true, loanId };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async updateLoan(loanId, updates) {
        try {
            await this.db.ref('loans/' + loanId).update(updates);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getLoan(loanId) {
        const snapshot = await this.db.ref('loans/' + loanId).once('value');
        return snapshot.val();
    }

    async getAllLoans(filters = {}) {
        const snapshot = await this.db.ref('loans').once('value');
        let loans = snapshot.val() || {};
        
        // Apply filters
        if (Object.keys(filters).length > 0) {
            loans = Object.fromEntries(
                Object.entries(loans).filter(([id, loan]) => {
                    return Object.entries(filters).every(([key, value]) => {
                        return loan[key] === value;
                    });
                })
            );
        }
        
        return loans;
    }

    // Repayment Operations
    async createRepayment(repaymentData) {
        try {
            const repaymentId = this.generateId('repayment');
            await this.db.ref('repayments/' + repaymentId).set({
                ...repaymentData,
                repaymentId: repaymentId,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                verified: false
            });
            
            return { success: true, repaymentId };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async verifyRepayment(repaymentId, adminId) {
        try {
            await this.db.ref('repayments/' + repaymentId).update({
                verified: true,
                verifiedBy: adminId,
                verifiedAt: firebase.database.ServerValue.TIMESTAMP
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Collateral Management
    async addCollateral(collateralData) {
        try {
            const collateralId = this.generateId('collateral');
            await this.db.ref('collaterals/' + collateralId).set({
                ...collateralData,
                collateralId: collateralId,
                uploadedAt: firebase.database.ServerValue.TIMESTAMP,
                status: 'pending_verification'
            });
            return { success: true, collateralId };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async verifyCollateral(collateralId, adminId, status) {
        try {
            await this.db.ref('collaterals/' + collateralId).update({
                status: status,
                verifiedBy: adminId,
                verifiedAt: firebase.database.ServerValue.TIMESTAMP
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Agent Operations
    async createAgent(agentData) {
        try {
            const agentId = this.generateAgentId();
            await this.db.ref('agents/' + agentId).set({
                ...agentData,
                agentId: agentId,
                status: 'pending',
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                totalCustomers: 0,
                activeLoans: 0,
                totalCommission: 0
            });
            return { success: true, agentId };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async approveAgent(agentId, adminId) {
        try {
            await this.db.ref('agents/' + agentId).update({
                status: 'approved',
                approvedBy: adminId,
                approvedAt: firebase.database.ServerValue.TIMESTAMP
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Audit Logging
    async logActivity(userId, action, details) {
        try {
            const logId = this.generateId('log');
            await this.db.ref('auditLogs/' + logId).set({
                userId: userId,
                action: action,
                details: details,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                ip: await this.getClientIP()
            });
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    // Helper Methods
    generateId(prefix) {
        return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateAgentId() {
        return 'AG' + Date.now().toString().substr(-6) + Math.random().toString(36).substr(2, 4).toUpperCase();
    }

    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }

    // Real-time Listeners
    listenToUserData(userId, callback) {
        return this.db.ref('users/' + userId).on('value', (snapshot) => {
            callback(snapshot.val());
        });
    }

    listenToLoans(callback, filters = {}) {
        return this.db.ref('loans').on('value', (snapshot) => {
            let loans = snapshot.val() || {};
            
            if (Object.keys(filters).length > 0) {
                loans = Object.fromEntries(
                    Object.entries(loans).filter(([id, loan]) => {
                        return Object.entries(filters).every(([key, value]) => {
                            return loan[key] === value;
                        });
                    })
                );
            }
            
            callback(loans);
        });
    }

    listenToAgentData(agentId, callback) {
        return this.db.ref('agents/' + agentId).on('value', (snapshot) => {
            callback(snapshot.val());
        });
    }

    // Statistics and Analytics
    async getSystemStatistics() {
        const loans = await this.getAllLoans();
        const users = await this.getAllUsers();
        const agents = await this.getAllAgents();
        
        const totalLoans = Object.keys(loans).length;
        const activeLoans = Object.values(loans).filter(loan => loan.status === 'active').length;
        const overdueLoans = Object.values(loans).filter(loan => loan.status === 'overdue').length;
        const defaultedLoans = Object.values(loans).filter(loan => loan.status === 'defaulted').length;
        
        const totalAmount = Object.values(loans).reduce((sum, loan) => sum + (loan.amount || 0), 0);
        const totalRepaid = Object.values(loans).reduce((sum, loan) => sum + (loan.repaidAmount || 0), 0);
        const totalRevenue = Object.values(loans).reduce((sum, loan) => sum + (loan.interestAmount || 0), 0);
        
        return {
            totalLoans,
            activeLoans,
            overdueLoans,
            defaultedLoans,
            totalAmount,
            totalRepaid,
            totalRevenue,
            totalUsers: Object.keys(users).length,
            totalAgents: Object.keys(agents).length,
            approvedAgents: Object.values(agents).filter(agent => agent.status === 'approved').length
        };
    }

    async getAllUsers() {
        const snapshot = await this.db.ref('users').once('value');
        return snapshot.val() || {};
    }

    async getAllAgents() {
        const snapshot = await this.db.ref('agents').once('value');
        return snapshot.val() || {};
    }

    // Search functionality
    async searchUsers(query, field = 'email') {
        const users = await this.getAllUsers();
        return Object.entries(users)
            .filter(([id, user]) => 
                user[field] && user[field].toLowerCase().includes(query.toLowerCase()))
            .map(([id, user]) => ({ id, ...user }));
    }

    async searchLoans(query, field = 'loanId') {
        const loans = await this.getAllLoans();
        return Object.entries(loans)
            .filter(([id, loan]) => 
                loan[field] && loan[field].toString().toLowerCase().includes(query.toLowerCase()))
            .map(([id, loan]) => ({ id, ...loan }));
    }
}

// Initialize Firebase Operations
const db = new FirebaseOperations();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { db, auth, database };
}
