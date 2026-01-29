// firebase.js - Firebase Configuration and Authentication
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    update, 
    remove, 
    push, 
    query, 
    orderByChild, 
    equalTo,
    onValue,
    off,
    orderByValue,
    limitToLast,
    increment,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Firebase configuration
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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Firebase Database References
const dbRefs = {
    users: ref(database, 'users'),
    agents: ref(database, 'agents'),
    customers: ref(database, 'customers'),
    loans: ref(database, 'loans'),
    repayments: ref(database, 'repayments'),
    transactions: ref(database, 'transactions'),
    notifications: ref(database, 'notifications'),
    system: ref(database, 'system'),
    settings: ref(database, 'settings'),
    audit: ref(database, 'audit')
};

// Initialize Sudo Account if not exists
async function initializeSudoAccount() {
    try {
        const sudoRef = ref(database, 'users/sudo');
        const sudoSnapshot = await get(sudoRef);
        
        if (!sudoSnapshot.exists()) {
            // Create Sudo account
            const sudoData = {
                email: "trucash@gmail.com",
                password: "123456", // Will be hashed by Firebase
                role: "sudo",
                fullName: "System Administrator",
                phone: "+260 000 000 000",
                createdAt: Date.now(),
                lastLogin: null,
                status: "active",
                permissions: {
                    createAdmin: true,
                    deleteAdmin: true,
                    modifySettings: true,
                    viewAllData: true,
                    approveEverything: true
                }
            };
            
            await set(sudoRef, sudoData);
            console.log("Sudo account initialized successfully");
        }
    } catch (error) {
        console.error("Error initializing sudo account:", error);
    }
}

// User Authentication Functions
class AuthService {
    // Sign in with email and password
    static async signIn(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Get user data from database
            const userRef = ref(database, `users/${user.uid}`);
            const snapshot = await get(userRef);
            
            if (snapshot.exists()) {
                const userData = snapshot.val();
                
                // Update last login
                await update(userRef, {
                    lastLogin: Date.now()
                });
                
                // Create audit log
                await this.createAuditLog({
                    action: 'USER_LOGIN',
                    userId: user.uid,
                    userEmail: email,
                    timestamp: Date.now(),
                    ip: await this.getClientIP(),
                    userAgent: navigator.userAgent
                });
                
                return {
                    success: true,
                    user: {
                        uid: user.uid,
                        email: user.email,
                        ...userData
                    }
                };
            } else {
                // User exists in auth but not in database
                await signOut(auth);
                return {
                    success: false,
                    error: "User account not found in system database"
                };
            }
        } catch (error) {
            console.error("Sign in error:", error);
            return {
                success: false,
                error: this.getErrorMessage(error.code)
            };
        }
    }
    
    // Sign out
    static async signOut() {
        try {
            const user = auth.currentUser;
            if (user) {
                // Create audit log
                await this.createAuditLog({
                    action: 'USER_LOGOUT',
                    userId: user.uid,
                    timestamp: Date.now()
                });
            }
            
            await signOut(auth);
            return { success: true };
        } catch (error) {
            console.error("Sign out error:", error);
            return { success: false, error: error.message };
        }
    }
    
    // Create new user (Admin, Agent, Customer)
    static async createUser(userData) {
        try {
            // Create authentication account
            const userCredential = await createUserWithEmailAndPassword(
                auth, 
                userData.email, 
                userData.password
            );
            
            const user = userCredential.user;
            
            // Prepare database data
            const dbData = {
                uid: user.uid,
                email: userData.email,
                role: userData.role,
                fullName: userData.fullName,
                phone: userData.phone || '',
                status: userData.status || 'pending',
                createdAt: Date.now(),
                lastLogin: null,
                ...userData.metadata
            };
            
            // Save to database based on role
            let dbRef;
            switch(userData.role) {
                case 'admin':
                    dbRef = ref(database, `users/admins/${user.uid}`);
                    break;
                case 'agent':
                    dbRef = ref(database, `agents/${user.uid}`);
                    // Generate agent ID
                    dbData.agentId = await this.generateAgentId();
                    break;
                case 'customer':
                    dbRef = ref(database, `customers/${user.uid}`);
                    dbData.agentId = userData.agentId;
                    break;
                default:
                    dbRef = ref(database, `users/${user.uid}`);
            }
            
            await set(dbRef, dbData);
            
            // Create audit log
            await this.createAuditLog({
                action: 'USER_CREATE',
                userId: auth.currentUser?.uid,
                targetUserId: user.uid,
                targetUserRole: userData.role,
                timestamp: Date.now()
            });
            
            // Send notification to user
            await this.createNotification({
                userId: user.uid,
                type: 'account_created',
                title: 'Account Created',
                message: `Your ${userData.role} account has been created successfully.`,
                priority: 'high'
            });
            
            return {
                success: true,
                user: dbData
            };
            
        } catch (error) {
            console.error("Create user error:", error);
            return {
                success: false,
                error: this.getErrorMessage(error.code)
            };
        }
    }
    
    // Generate unique agent ID
    static async generateAgentId() {
        const prefix = 'TRU';
        const year = new Date().getFullYear().toString().slice(-2);
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        
        let agentId = `${prefix}${year}${randomNum}`;
        
        // Check if agent ID already exists
        const agentsRef = ref(database, 'agents');
        const snapshot = await get(agentsRef);
        const agents = snapshot.val() || {};
        
        // Ensure uniqueness
        const agentIds = Object.values(agents).map(a => a.agentId);
        while (agentIds.includes(agentId)) {
            const newRandomNum = Math.floor(1000 + Math.random() * 9000);
            agentId = `${prefix}${year}${newRandomNum}`;
        }
        
        return agentId;
    }
    
    // Get current user data
    static async getCurrentUser() {
        const user = auth.currentUser;
        if (!user) return null;
        
        try {
            // Check all user collections
            const collections = ['users', 'agents', 'customers', 'users/admins'];
            for (const collection of collections) {
                const userRef = ref(database, `${collection}/${user.uid}`);
                const snapshot = await get(userRef);
                
                if (snapshot.exists()) {
                    return {
                        uid: user.uid,
                        email: user.email,
                        ...snapshot.val()
                    };
                }
            }
            
            return null;
        } catch (error) {
            console.error("Get current user error:", error);
            return null;
        }
    }
    
    // Update user profile
    static async updateUserProfile(userId, updates) {
        try {
            const userRef = ref(database, `users/${userId}`);
            await update(userRef, updates);
            
            // Create audit log
            await this.createAuditLog({
                action: 'USER_UPDATE',
                userId: auth.currentUser?.uid,
                targetUserId: userId,
                updates: updates,
                timestamp: Date.now()
            });
            
            return { success: true };
        } catch (error) {
            console.error("Update user error:", error);
            return { success: false, error: error.message };
        }
    }
    
    // Create audit log
    static async createAuditLog(logData) {
        try {
            const auditRef = push(dbRefs.audit);
            await set(auditRef, {
                ...logData,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error("Create audit log error:", error);
        }
    }
    
    // Create notification
    static async createNotification(notificationData) {
        try {
            const notificationRef = push(dbRefs.notifications);
            await set(notificationRef, {
                ...notificationData,
                read: false,
                createdAt: Date.now()
            });
        } catch (error) {
            console.error("Create notification error:", error);
        }
    }
    
    // Get error message from Firebase error code
    static getErrorMessage(errorCode) {
        const errorMessages = {
            'auth/invalid-email': 'Invalid email address',
            'auth/user-disabled': 'Account has been disabled',
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/email-already-in-use': 'Email already registered',
            'auth/weak-password': 'Password must be at least 6 characters',
            'auth/operation-not-allowed': 'Operation not allowed',
            'auth/network-request-failed': 'Network error. Please check your connection'
        };
        
        return errorMessages[errorCode] || 'An error occurred. Please try again.';
    }
    
    // Get client IP (simplified)
    static async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }
    
    // Listen for auth state changes
    static onAuthStateChanged(callback) {
        return onAuthStateChanged(auth, callback);
    }
}

// Database Service
class DatabaseService {
    // Loan Management
    static async createLoan(loanData) {
        try {
            const loanRef = push(dbRefs.loans);
            const loanId = loanRef.key;
            
            const loanWithMeta = {
                loanId,
                ...loanData,
                createdAt: Date.now(),
                status: 'pending',
                statusHistory: [{
                    status: 'pending',
                    timestamp: Date.now(),
                    changedBy: loanData.createdBy || 'system'
                }]
            };
            
            await set(loanRef, loanWithMeta);
            
            // Create transaction record
            await this.createTransaction({
                type: 'loan_application',
                amount: loanData.amount,
                loanId: loanId,
                customerId: loanData.customerId,
                agentId: loanData.agentId,
                description: `Loan application submitted - ${loanData.amount} ZMW`,
                timestamp: Date.now()
            });
            
            // Create audit log
            await AuthService.createAuditLog({
                action: 'LOAN_CREATE',
                userId: loanData.createdBy,
                loanId: loanId,
                amount: loanData.amount,
                timestamp: Date.now()
            });
            
            // Create notification for admin
            await AuthService.createNotification({
                userId: 'admin', // This would be sent to all admins in real implementation
                type: 'loan_pending',
                title: 'New Loan Application',
                message: `New loan application for ${loanData.amount} ZMW from customer ${loanData.customerId}`,
                priority: 'high',
                data: { loanId }
            });
            
            return { success: true, loanId };
        } catch (error) {
            console.error("Create loan error:", error);
            return { success: false, error: error.message };
        }
    }
    
    static async updateLoanStatus(loanId, status, updatedBy, notes = '') {
        try {
            const loanRef = ref(database, `loans/${loanId}`);
            const snapshot = await get(loanRef);
            
            if (!snapshot.exists()) {
                return { success: false, error: "Loan not found" };
            }
            
            const loanData = snapshot.val();
            const updates = {
                status: status,
                updatedAt: Date.now(),
                updatedBy: updatedBy,
                notes: notes
            };
            
            // Add to status history
            if (!loanData.statusHistory) {
                loanData.statusHistory = [];
            }
            
            loanData.statusHistory.push({
                status: status,
                timestamp: Date.now(),
                changedBy: updatedBy,
                notes: notes
            });
            
            updates.statusHistory = loanData.statusHistory;
            
            await update(loanRef, updates);
            
            // Create transaction record
            await this.createTransaction({
                type: `loan_${status}`,
                amount: loanData.amount,
                loanId: loanId,
                customerId: loanData.customerId,
                agentId: loanData.agentId,
                description: `Loan ${status} - ${loanData.amount} ZMW`,
                timestamp: Date.now()
            });
            
            // Create audit log
            await AuthService.createAuditLog({
                action: 'LOAN_STATUS_UPDATE',
                userId: updatedBy,
                loanId: loanId,
                oldStatus: loanData.status,
                newStatus: status,
                notes: notes,
                timestamp: Date.now()
            });
            
            // Create notification for customer and agent
            const notificationData = {
                type: `loan_${status}`,
                title: `Loan ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                message: `Your loan application for ${loanData.amount} ZMW has been ${status}`,
                priority: 'high',
                data: { loanId }
            };
            
            await AuthService.createNotification({
                userId: loanData.customerId,
                ...notificationData
            });
            
            await AuthService.createNotification({
                userId: loanData.agentId,
                ...notificationData
            });
            
            return { success: true };
        } catch (error) {
            console.error("Update loan status error:", error);
            return { success: false, error: error.message };
        }
    }
    
    static async getLoans(filters = {}) {
        try {
            let loansRef = dbRefs.loans;
            
            // Apply filters
            if (filters.status) {
                loansRef = query(loansRef, orderByChild('status'), equalTo(filters.status));
            }
            
            if (filters.agentId) {
                loansRef = query(loansRef, orderByChild('agentId'), equalTo(filters.agentId));
            }
            
            if (filters.customerId) {
                loansRef = query(loansRef, orderByChild('customerId'), equalTo(filters.customerId));
            }
            
            const snapshot = await get(loansRef);
            if (!snapshot.exists()) {
                return [];
            }
            
            const loans = [];
            snapshot.forEach((childSnapshot) => {
                loans.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            return loans;
        } catch (error) {
            console.error("Get loans error:", error);
            return [];
        }
    }
    
    // Repayment Management
    static async createRepayment(repaymentData) {
        try {
            const repaymentRef = push(dbRefs.repayments);
            const repaymentId = repaymentRef.key;
            
            const repaymentWithMeta = {
                repaymentId,
                ...repaymentData,
                createdAt: Date.now(),
                verified: false
            };
            
            await set(repaymentRef, repaymentWithMeta);
            
            // Create transaction record
            await this.createTransaction({
                type: 'repayment',
                amount: repaymentData.amount,
                loanId: repaymentData.loanId,
                customerId: repaymentData.customerId,
                agentId: repaymentData.agentId,
                description: `Repayment received - ${repaymentData.amount} ZMW`,
                timestamp: Date.now()
            });
            
            // Update loan balance
            const loanRef = ref(database, `loans/${repaymentData.loanId}`);
            const loanSnapshot = await get(loanRef);
            
            if (loanSnapshot.exists()) {
                const loanData = loanSnapshot.val();
                const newBalance = (loanData.balance || loanData.amount) - repaymentData.amount;
                
                await update(loanRef, {
                    balance: newBalance,
                    lastRepayment: Date.now(),
                    totalRepaid: (loanData.totalRepaid || 0) + repaymentData.amount
                });
            }
            
            // Create audit log
            await AuthService.createAuditLog({
                action: 'REPAYMENT_CREATE',
                userId: repaymentData.createdBy,
                repaymentId: repaymentId,
                loanId: repaymentData.loanId,
                amount: repaymentData.amount,
                timestamp: Date.now()
            });
            
            return { success: true, repaymentId };
        } catch (error) {
            console.error("Create repayment error:", error);
            return { success: false, error: error.message };
        }
    }
    
    static async verifyRepayment(repaymentId, verifiedBy, notes = '') {
        try {
            const repaymentRef = ref(database, `repayments/${repaymentId}`);
            await update(repaymentRef, {
                verified: true,
                verifiedBy: verifiedBy,
                verifiedAt: Date.now(),
                verificationNotes: notes
            });
            
            // Create audit log
            await AuthService.createAuditLog({
                action: 'REPAYMENT_VERIFY',
                userId: verifiedBy,
                repaymentId: repaymentId,
                timestamp: Date.now(),
                notes: notes
            });
            
            return { success: true };
        } catch (error) {
            console.error("Verify repayment error:", error);
            return { success: false, error: error.message };
        }
    }
    
    // Transaction Management
    static async createTransaction(transactionData) {
        try {
            const transactionRef = push(dbRefs.transactions);
            await set(transactionRef, {
                transactionId: transactionRef.key,
                ...transactionData
            });
            
            return { success: true };
        } catch (error) {
            console.error("Create transaction error:", error);
            return { success: false, error: error.message };
        }
    }
    
    // Statistics and Analytics
    static async getDashboardStats(userRole, userId) {
        try {
            const stats = {
                totalLoans: 0,
                totalAmount: 0,
                totalRepaid: 0,
                activeLoans: 0,
                overdueLoans: 0,
                pendingLoans: 0,
                defaultedLoans: 0,
                totalCustomers: 0,
                totalAgents: 0,
                totalRevenue: 0
            };
            
            // Get all loans
            const loans = await this.getLoans();
            
            // Calculate loan statistics
            loans.forEach(loan => {
                if (userRole === 'agent' && loan.agentId !== userId) return;
                if (userRole === 'customer' && loan.customerId !== userId) return;
                
                stats.totalLoans++;
                stats.totalAmount += loan.amount;
                stats.totalRepaid += loan.totalRepaid || 0;
                
                if (loan.status === 'active') stats.activeLoans++;
                if (loan.status === 'overdue') stats.overdueLoans++;
                if (loan.status === 'pending') stats.pendingLoans++;
                if (loan.status === 'defaulted') stats.defaultedLoans++;
            });
            
            // Get total customers
            if (userRole === 'sudo' || userRole === 'admin') {
                const customersSnapshot = await get(dbRefs.customers);
                if (customersSnapshot.exists()) {
                    stats.totalCustomers = Object.keys(customersSnapshot.val()).length;
                }
            } else if (userRole === 'agent') {
                const customersSnapshot = await get(dbRefs.customers);
                if (customersSnapshot.exists()) {
                    const customers = customersSnapshot.val();
                    stats.totalCustomers = Object.values(customers).filter(
                        customer => customer.agentId === userId
                    ).length;
                }
            }
            
            // Get total agents
            if (userRole === 'sudo' || userRole === 'admin') {
                const agentsSnapshot = await get(dbRefs.agents);
                if (agentsSnapshot.exists()) {
                    stats.totalAgents = Object.keys(agentsSnapshot.val()).length;
                }
            }
            
            // Calculate revenue (interest earned)
            stats.totalRevenue = stats.totalAmount * 0.15; // Assuming 15% interest
            
            return stats;
        } catch (error) {
            console.error("Get dashboard stats error:", error);
            return null;
        }
    }
    
    // Real-time Listeners
    static listenToCollection(collection, callback) {
        const collectionRef = ref(database, collection);
        const listener = onValue(collectionRef, (snapshot) => {
            const data = snapshot.val();
            callback(data);
        });
        
        return () => off(collectionRef, 'value', listener);
    }
}

// Export services
export { 
    AuthService, 
    DatabaseService, 
    dbRefs, 
    auth, 
    database, 
    initializeSudoAccount 
};
