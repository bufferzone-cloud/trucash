// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getDatabase, ref, set, get, update, remove, query, orderByChild, equalTo, onValue, push } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

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
const storage = getStorage(app);

// Initialize Sudo Account if not exists
const initializeSudoAccount = async () => {
    const sudoRef = ref(database, 'system/sudo');
    const sudoSnapshot = await get(sudoRef);
    
    if (!sudoSnapshot.exists()) {
        // Create sudo account
        const sudoData = {
            email: "trucash@gmail.com",
            password: "123456", // Will be hashed by Firebase
            created_at: Date.now(),
            last_login: null,
            system_initialized: true
        };
        
        await set(sudoRef, sudoData);
        console.log("Sudo account initialized");
    }
};

// Export Firebase services
export { 
    auth, 
    database, 
    storage, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    ref, 
    set, 
    get, 
    update, 
    remove, 
    query, 
    orderByChild, 
    equalTo, 
    onValue, 
    push,
    storageRef,
    uploadBytes,
    getDownloadURL,
    initializeSudoAccount
};
