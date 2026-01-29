// Authentication and role management
class AuthManager {
    constructor() {
        this.auth = firebase.auth();
        this.db = database;
        this.currentUser = null;
        this.userRole = null;
        this.userData = null;
        
        // Initialize auth state listener
        this.initAuthListener();
    }

    initAuthListener() {
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.loadUserData(user.uid);
                
                // Log login activity
                await db.logActivity(user.uid, 'LOGIN', {
                    email: user.email,
                    timestamp: new Date().toISOString()
                });
                
                // Redirect based on role if not on login page
                if (!window.location.pathname.includes('login.html') && 
                    !window.location.pathname.includes('index.html')) {
                    this.redirectBasedOnRole();
                }
            } else {
                this.currentUser = null;
                this.userRole = null;
                this.userData = null;
                
                // Redirect to login if not on login page
                if (!window.location.pathname.includes('login.html') && 
                    !window.location.pathname.includes('index.html')) {
                    window.location.href = 'login.html';
                }
            }
        });
    }

    async loadUserData(userId) {
        try {
            const userData = await db.getUserData(userId);
            if (userData) {
                this.userData = userData;
                this.userRole = userData.role;
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    async login(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Check if user exists in database
            const userData = await db.getUserData(user.uid);
            
            if (!userData) {
                throw new Error('User account not found in system');
            }
            
            // Check if account is suspended
            if (userData.status === 'suspended') {
                throw new Error('Account is suspended. Please contact administrator.');
            }
            
            return {
                success: true,
                user: user,
                role: userData.role
            };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: this.getErrorMessage(error.code)
            };
        }
    }

    async logout() {
        try {
            // Log logout activity
            if (this.currentUser) {
                await db.logActivity(this.currentUser.uid, 'LOGOUT', {
                    timestamp: new Date().toISOString()
                });
            }
            
            await this.auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    async register(email, password, userData, role) {
        try {
            // Check if email already exists
            const existingUser = await this.findUserByEmail(email);
            if (existingUser) {
                throw new Error('Email already registered');
            }

            // Create user in Firebase Auth
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const userId = userCredential.user.uid;

            // Prepare user data for database
            const completeUserData = {
                ...userData,
                email: email,
                role: role,
                status: 'pending',
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                lastLogin: null,
                isActive: true
            };

            // Save to database
            await db.createUser(userId, completeUserData);

            // Log registration
            await db.logActivity(userId, 'REGISTER', {
                email: email,
                role: role,
                timestamp: new Date().toISOString()
            });

            return {
                success: true,
                userId: userId
            };
        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                error: this.getErrorMessage(error.code)
            };
        }
    }

    async findUserByEmail(email) {
        try {
            const usersRef = this.db.ref('users');
            const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Error finding user:', error);
            return null;
        }
    }

    async updateProfile(userId, updates) {
        try {
            await db.updateUser(userId, updates);
            
            // Update local data
            if (userId === this.currentUser?.uid) {
                this.userData = { ...this.userData, ...updates };
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async changePassword(currentPassword, newPassword) {
        try {
            const user = this.auth.currentUser;
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            
            // Reauthenticate user
            await user.reauthenticateWithCredential(credential);
            
            // Update password
            await user.updatePassword(newPassword);
            
            // Log password change
            await db.logActivity(user.uid, 'PASSWORD_CHANGE', {
                timestamp: new Date().toISOString()
            });
            
            return { success: true };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    async resetPassword(email) {
        try {
            await this.auth.sendPasswordResetEmail(email);
            return { success: true };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    redirectBasedOnRole() {
        if (!this.userRole) {
            window.location.href = 'login.html';
            return;
        }

        const currentPage = window.location.pathname.split('/').pop();
        let targetPage = '';

        switch (this.userRole) {
            case 'sudo':
                targetPage = 'sudo.html';
                break;
            case 'admin':
                targetPage = 'admin.html';
                break;
            case 'agent':
                targetPage = 'agent.html';
                break;
            case 'customer':
                targetPage = 'customer.html';
                break;
            default:
                targetPage = 'login.html';
        }

        // Redirect if not on correct page
        if (currentPage !== targetPage && !currentPage.includes('login')) {
            window.location.href = targetPage;
        }
    }

    getErrorMessage(errorCode) {
        const errorMessages = {
            'auth/invalid-email': 'Invalid email address',
            'auth/user-disabled': 'Account is disabled',
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/email-already-in-use': 'Email already registered',
            'auth/weak-password': 'Password should be at least 6 characters',
            'auth/network-request-failed': 'Network error. Please check your connection',
            'auth/too-many-requests': 'Too many attempts. Try again later',
            'auth/requires-recent-login': 'Please login again to perform this action'
        };

        return errorMessages[errorCode] || 'An error occurred. Please try again.';
    }

    // Role-based permissions
    hasPermission(requiredPermission) {
        if (!this.userRole) return false;

        const rolePermissions = {
            'sudo': ['all'],
            'admin': ['view_users', 'manage_agents', 'manage_customers', 'approve_loans', 'verify_documents'],
            'agent': ['create_customers', 'view_customers', 'submit_loans', 'track_repayments'],
            'customer': ['apply_loan', 'view_loan', 'make_repayment', 'upload_documents']
        };

        const permissions = rolePermissions[this.userRole] || [];
        return permissions.includes('all') || permissions.includes(requiredPermission);
    }

    // Session management
    async checkSession() {
        const user = this.auth.currentUser;
        if (!user) return false;

        // Check if user data exists
        const userData = await db.getUserData(user.uid);
        if (!userData) {
            await this.logout();
            return false;
        }

        // Check if account is active
        if (userData.status !== 'active' && userData.status !== 'approved') {
            await this.logout();
            return false;
        }

        return true;
    }

    // Get current user info
    getUserInfo() {
        return {
            uid: this.currentUser?.uid,
            email: this.currentUser?.email,
            role: this.userRole,
            data: this.userData
        };
    }
}

// Initialize Auth Manager
const authManager = new AuthManager();

// Initialize SUDO account on first load
async function initializeSudoAccount() {
    try {
        // Check if SUDO account exists
        const sudoEmail = 'trucash@gmail.com';
        const sudoPassword = '123456';
        
        // Try to login with SUDO credentials
        const result = await authManager.login(sudoEmail, sudoPassword);
        
        if (!result.success && result.error.includes('not found')) {
            // Create SUDO account
            const sudoData = {
                role: 'sudo',
                fullName: 'System Administrator',
                phone: '+260000000000',
                status: 'active',
                permissions: ['all'],
                isSudo: true,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };
            
            await authManager.register(sudoEmail, sudoPassword, sudoData, 'sudo');
            console.log('SUDO account created successfully');
        }
    } catch (error) {
        console.error('Error initializing SUDO account:', error);
    }
}

// Call initialization on page load
if (window.location.pathname.includes('login.html') || 
    window.location.pathname.includes('index.html')) {
    initializeSudoAccount();
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = authManager;
}
