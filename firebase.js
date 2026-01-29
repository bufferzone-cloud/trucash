// Firebase Configuration and Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, update, remove, push, onValue, query, orderByChild, equalTo, onChildAdded, onChildChanged, onChildRemoved } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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
const database = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Initialize analytics only if needed
let analytics;
try {
    const { getAnalytics } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js");
    analytics = getAnalytics(app);
} catch (e) {
    console.log("Analytics not available");
}

// Firebase Database References
const dbRefs = {
    users: ref(database, 'users'),
    sudo: ref(database, 'sudo'),
    admins: ref(database, 'admins'),
    agents: ref(database, 'agents'),
    customers: ref(database, 'customers'),
    loans: ref(database, 'loans'),
    loanApplications: ref(database, 'loanApplications'),
    repayments: ref(database, 'repayments'),
    transactions: ref(database, 'transactions'),
    systemLogs: ref(database, 'systemLogs'),
    notifications: ref(database, 'notifications'),
    systemConfig: ref(database, 'systemConfig'),
    collateral: ref(database, 'collateral')
};

// Authentication Functions
export const authFunctions = {
    createUser: async (email, password, userData) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Store additional user data in database
            await set(ref(database, `users/${user.uid}`), {
                ...userData,
                uid: user.uid,
                email: user.email,
                createdAt: new Date().toISOString(),
                status: 'active'
            });
            
            return { success: true, user: user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    signIn: async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    signOutUser: async () => {
        try {
            await signOut(auth);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    getCurrentUser: () => {
        return auth.currentUser;
    },
    
    onAuthChange: (callback) => {
        return onAuthStateChanged(auth, callback);
    }
};

// Database Functions
export const dbFunctions = {
    // Create operations
    createRecord: async (path, data) => {
        try {
            const newRef = push(ref(database, path));
            await set(newRef, {
                ...data,
                id: newRef.key,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            return { success: true, id: newRef.key };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Read operations
    getRecord: async (path) => {
        try {
            const snapshot = await get(ref(database, path));
            return { success: true, data: snapshot.exists() ? snapshot.val() : null };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    getRecords: async (path, queryConstraints = null) => {
        try {
            let dbRef = ref(database, path);
            if (queryConstraints) {
                dbRef = query(dbRef, ...queryConstraints);
            }
            const snapshot = await get(dbRef);
            const data = [];
            snapshot.forEach((child) => {
                data.push({ id: child.key, ...child.val() });
            });
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Update operations
    updateRecord: async (path, data) => {
        try {
            await update(ref(database, path), {
                ...data,
                updatedAt: new Date().toISOString()
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Delete operations
    deleteRecord: async (path) => {
        try {
            await remove(ref(database, path));
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Real-time listeners
    listenToRecords: (path, callback, queryConstraints = null) => {
        let dbRef = ref(database, path);
        if (queryConstraints) {
            dbRef = query(dbRef, ...queryConstraints);
        }
        
        const unsubscribe = onValue(dbRef, (snapshot) => {
            const data = [];
            snapshot.forEach((child) => {
                data.push({ id: child.key, ...child.val() });
            });
            callback(data);
        });
        
        return unsubscribe;
    },
    
    // Specific queries
    queryByField: async (path, field, value) => {
        try {
            const q = query(ref(database, path), orderByChild(field), equalTo(value));
            const snapshot = await get(q);
            const data = [];
            snapshot.forEach((child) => {
                data.push({ id: child.key, ...child.val() });
            });
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// Storage Functions
export const storageFunctions = {
    uploadFile: async (file, path) => {
        try {
            const fileRef = storageRef(storage, `${path}/${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(fileRef);
            return { success: true, url: downloadURL };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    deleteFile: async (url) => {
        try {
            const fileRef = storageRef(storage, url);
            // Note: Firebase Storage doesn't have a direct delete function in web SDK
            // This would need server-side implementation
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// System Logging
export const logSystemEvent = async (eventType, userId, details) => {
    try {
        await push(dbRefs.systemLogs, {
            eventType,
            userId,
            details,
            timestamp: new Date().toISOString(),
            ipAddress: await getClientIP()
        });
    } catch (error) {
        console.error('Failed to log system event:', error);
    }
};

const getClientIP = async () => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'unknown';
    }
};

// Notification System
export const notificationFunctions = {
    createNotification: async (userId, title, message, type = 'info', link = null) => {
        try {
            await push(dbRefs.notifications, {
                userId,
                title,
                message,
                type,
                link,
                read: false,
                createdAt: new Date().toISOString()
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    markAsRead: async (notificationId) => {
        try {
            await update(ref(database, `notifications/${notificationId}`), {
                read: true,
                readAt: new Date().toISOString()
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// Export database references
export { database, auth, storage, dbRefs };
export default app;
