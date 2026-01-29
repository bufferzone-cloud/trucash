// Firebase Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get, update, remove, push, query, orderByChild, equalTo, onValue, off } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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

// Initialize Sudo account on first run
async function initializeSudoAccount() {
    const sudoRef = ref(database, 'system/sudoInitialized');
    const snapshot = await get(sudoRef);
    
    if (!snapshot.exists()) {
        try {
            // Create Sudo user in Firebase Auth
            await createUserWithEmailAndPassword(auth, 'trucash@gmail.com', '123456');
            
            // Store Sudo data in database
            const user = auth.currentUser;
            await set(ref(database, 'users/' + user.uid), {
                email: 'trucash@gmail.com',
                role: 'sudo',
                fullName: 'System Administrator',
                createdAt: new Date().toISOString(),
                isActive: true
            });
            
            await set(sudoRef, true);
            console.log('Sudo account initialized');
        } catch (error) {
            console.log('Sudo account already exists');
        }
    }
}

// Call initialization
initializeSudoAccount();

export { auth, database, storage, getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, ref, set, get, update, remove, push, query, orderByChild, equalTo, onValue, off, storageRef, uploadBytes, getDownloadURL };
