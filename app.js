// ===== FIREBASE CONFIGURATION =====
const firebaseConfig = {
    apiKey: "AIzaSyBrVtSAOckpj8_fRA3-0kI7vAzOpXDUqxs",
    authDomain: "zynapse-68181.firebaseapp.com",
    databaseURL: "https://zynapse-68181-default-rtdb.firebaseio.com",
    projectId: "zynapse-68181",
    storageBucket: "zynapse-68181.firebasestorage.app",
    messagingSenderId: "841353050519",
    appId: "1:841353050519:web:3b16d95d8f4cd3b9506cd2",
    measurementId: "G-4764XLL6WS"
};

// ===== CLOUDINARY ACCOUNT DETAILS =====
const CLOUDINARY_CONFIG = {
    cloudName: 'dd3lcymrk',
    apiKey: '489857926297197',
    uploadPreset: 'h3eyhc2o',
    folder: 'zynapse/users'
};

// Initialize Firebase
let firebaseApp, auth, database;
try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    auth = firebaseApp.auth();
    database = firebaseApp.database();
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// ===== GLOBAL VARIABLES =====
let currentUser = null;
let currentUserData = null;
let chatPartner = null;
let currentChatId = null;
let groupMembers = [];
let selectedFiles = [];
let typingTimeout = null;
let lastMessageDate = null;

// ===== UTILITY FUNCTIONS =====
function generateZynId() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `ZYN-${randomNum}`;
}

function showToast(message, type = 'info') {
    const container = document.querySelector('.toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function playNotificationSound() {
    const audio = document.getElementById('notificationSound') || document.getElementById('messageSound');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Audio play failed:", e));
    }
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: 'long' });
    } else {
        return date.toLocaleDateString();
    }
}

function formatMessageDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// ===== AUTHENTICATION FUNCTIONS =====
async function checkAuthState() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData(user.uid);
            
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                window.location.href = 'home.html';
            }
        } else {
            if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
                window.location.href = 'index.html';
            }
        }
    });
}

async function loadUserData(uid) {
    try {
        const userRef = database.ref(`users/${uid}`);
        userRef.on('value', (snapshot) => {
            currentUserData = snapshot.val();
            if (currentUserData) {
                updateUIWithUserData();
                startUserStatusListener();
                loadUserDataAsync();
            }
        });
    } catch (error) {
        console.error("Error loading user data:", error);
        showToast('Error loading user data', 'error');
    }
}

function updateUIWithUserData() {
    if (!currentUserData) return;
    
    // Update all user info elements
    document.querySelectorAll('#userName, #dropdownUserName').forEach(el => {
        if (el) el.textContent = currentUserData.name || 'User';
    });
    
    document.querySelectorAll('#userId, #dropdownUserId').forEach(el => {
        if (el) el.textContent = currentUserData.zynId || 'ZYN-0000';
    });
    
    // Update profile pictures
    const profilePic = currentUserData.profilePicture || 'https://via.placeholder.com/150';
    document.querySelectorAll('#headerProfilePic, #dropdownProfilePic, #chatProfilePic').forEach(el => {
        if (el) el.src = profilePic;
    });
}

async function signUp() {
    const name = document.getElementById('signupName')?.value.trim();
    const phone = document.getElementById('signupPhone')?.value.trim();
    const email = document.getElementById('signupEmail')?.value.trim();
    const password = document.getElementById('signupPassword')?.value;
    const confirmPassword = document.getElementById('signupConfirmPassword')?.value;
    const agreeTerms = document.getElementById('agreeTerms')?.checked;
    const profileFile = document.getElementById('profileUpload')?.files[0];
    
    // Validation
    if (!name || !phone || !email || !password) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (password.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (!agreeTerms) {
        showToast('Please agree to the terms and conditions', 'error');
        return;
    }
    
    // Zambian phone number validation
    const phoneRegex = /^0?(97|96|95|76)\d{7}$/;
    if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
        showToast('Please enter a valid Zambian phone number', 'error');
        return;
    }
    
    const signupBtn = document.getElementById('signupBtn');
    const originalText = signupBtn.innerHTML;
    signupBtn.innerHTML = '<div class="spinner"></div>';
    signupBtn.disabled = true;
    
    try {
        // Upload profile picture if exists
        let profileUrl = '';
        if (profileFile) {
            profileUrl = await uploadToCloudinary(profileFile, 'profile');
        }
        
        // Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Generate ZYN-ID
        const zynId = generateZynId();
        
        // Save user data to Firebase Database
        await database.ref(`users/${user.uid}`).set({
            uid: user.uid,
            name: name,
            email: email,
            phone: phone,
            zynId: zynId,
            profilePicture: profileUrl,
            createdAt: Date.now(),
            lastSeen: Date.now(),
            status: 'online',
            contacts: {},
            chatRequests: {},
            groups: {},
            settings: {
                notifications: true,
                theme: 'light',
                privacy: 'contacts'
            }
        });
        
        showToast('Account created successfully!', 'success');
        
        // Auto login
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1500);
        
    } catch (error) {
        console.error("Sign up error:", error);
        let errorMessage = 'Error creating account';
        
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email already in use';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address';
        }
        
        showToast(errorMessage, 'error');
        signupBtn.innerHTML = originalText;
        signupBtn.disabled = false;
    }
}

async function login() {
    const identifier = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    
    if (!identifier || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }
    
    const loginBtn = document.getElementById('loginBtn');
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<div class="spinner"></div>';
    loginBtn.disabled = true;
    
    try {
        let email = identifier;
        
        // Check if identifier is a ZYN-ID
        if (identifier.startsWith('ZYN-')) {
            // Find user by ZYN-ID
            const usersRef = database.ref('users');
            const snapshot = await usersRef.orderByChild('zynId').equalTo(identifier).once('value');
            if (snapshot.exists()) {
                const userData = Object.values(snapshot.val())[0];
                email = userData.email;
            } else {
                throw new Error('User not found');
            }
        }
        
        // Sign in with email and password
        await auth.signInWithEmailAndPassword(email, password);
        
        showToast('Signed in successfully!', 'success');
        
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1000);
        
    } catch (error) {
        console.error("Login error:", error);
        let errorMessage = 'Invalid credentials';
        
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Invalid email or password';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many failed attempts. Try again later';
        }
        
        showToast(errorMessage, 'error');
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

async function logout() {
    try {
        if (currentUserData) {
            // Update status to offline
            await database.ref(`users/${currentUser.uid}/status`).set('offline');
            await database.ref(`users/${currentUser.uid}/lastSeen`).set(Date.now());
        }
        
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Logout error:", error);
        showToast('Error signing out', 'error');
    }
}

// ===== CLOUDINARY UPLOAD FUNCTIONS =====
async function uploadToCloudinary(file, type = 'file') {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('folder', type === 'profile' ? 'zynapse/profiles' : 'zynapse/uploads');
        
        // Set max file size (50MB)
        if (file.size > 50 * 1024 * 1024) {
            reject(new Error('File size must be less than 50MB'));
            return;
        }
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/upload`);
        
        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                resolve(response.secure_url);
            } else {
                reject(new Error('Upload failed'));
            }
        };
        
        xhr.onerror = function() {
            reject(new Error('Upload failed'));
        };
        
        xhr.send(formData);
    });
}

// ===== PAGE NAVIGATION FUNCTIONS =====
function showWelcome() {
    document.getElementById('welcomeScreen').style.display = 'block';
    document.getElementById('signUpForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'none';
}

function showSignUp() {
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('signUpForm').style.display = 'block';
    document.getElementById('loginForm').style.display = 'none';
}

function showLogin() {
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('signUpForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(navItem => {
        navItem.classList.remove('active');
    });
    
    // Show selected page
    const pageElement = document.getElementById(`${pageId}Page`);
    if (pageElement) {
        pageElement.classList.add('active');
    }
    
    // Activate corresponding nav item
    const navItem = document.getElementById(`nav${pageId.charAt(0).toUpperCase() + pageId.slice(1)}`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    // Load page data
    switch(pageId) {
        case 'home':
            loadRecentChats();
            break;
        case 'zynes':
            loadZynes();
            break;
        case 'groups':
            loadGroups();
            break;
        case 'requests':
            loadChatRequests();
            break;
        case 'contacts':
            loadContacts();
            break;
    }
}

// ===== CHAT FUNCTIONS =====
function startNewChat() {
    const modal = document.getElementById('newChatModal');
    if (modal) {
        modal.classList.add('active');
        document.getElementById('searchUserId').focus();
    }
}

function closeNewChatModal() {
    const modal = document.getElementById('newChatModal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('searchUserId').value = '';
        document.getElementById('searchResult').style.display = 'none';
        document.getElementById('searchPlaceholder').style.display = 'block';
    }
}

async function searchUser() {
    const searchInput = document.getElementById('searchUserId');
    const searchTerm = searchInput.value.trim();
    const searchResult = document.getElementById('searchResult');
    const searchPlaceholder = document.getElementById('searchPlaceholder');
    
    if (!searchTerm) {
        searchResult.style.display = 'none';
        searchPlaceholder.style.display = 'block';
        return;
    }
    
    // Validate ZYN-ID format
    if (!searchTerm.startsWith('ZYN-') || searchTerm.length !== 8) {
        searchResult.innerHTML = `
            <div class="error">
                <p>Please enter a valid ZYN-ID (e.g., ZYN-1234)</p>
            </div>
        `;
        searchResult.style.display = 'block';
        searchPlaceholder.style.display = 'none';
        return;
    }
    
    try {
        // Search for user by ZYN-ID
        const usersRef = database.ref('users');
        const snapshot = await usersRef.orderByChild('zynId').equalTo(searchTerm).once('value');
        
        if (snapshot.exists()) {
            const userData = Object.values(snapshot.val())[0];
            
            // Check if it's the current user
            if (userData.zynId === currentUserData.zynId) {
                searchResult.innerHTML = `
                    <div class="error">
                        <p>You cannot send a chat request to yourself</p>
                    </div>
                `;
                searchResult.style.display = 'block';
                searchPlaceholder.style.display = 'none';
                return;
            }
            
            // Check if already in contacts
            const isContact = currentUserData.contacts && currentUserData.contacts[userData.uid];
            
            searchResult.innerHTML = `
                <div class="user-found">
                    <img src="${userData.profilePicture || 'https://via.placeholder.com/50'}" alt="Profile" class="profile-pic">
                    <div class="user-found-info">
                        <h4>${userData.name}</h4>
                        <p>${userData.zynId}</p>
                        ${isContact ? '<p class="already-contact"><i class="fas fa-check-circle"></i> Already in contacts</p>' : ''}
                    </div>
                    <div class="action-buttons">
                        ${!isContact ? `
                            <button class="btn-primary" onclick="sendChatRequest('${userData.uid}', '${userData.zynId}')">
                                <i class="fas fa-user-plus"></i> Send Request
                            </button>
                        ` : `
                            <button class="btn-primary" onclick="startChatWithUser('${userData.uid}')">
                                <i class="fas fa-comment"></i> Start Chat
                            </button>
                        `}
                    </div>
                </div>
            `;
            
            searchResult.style.display = 'block';
            searchPlaceholder.style.display = 'none';
            
        } else {
            searchResult.innerHTML = `
                <div class="error">
                    <p>User with ZYN-ID "${searchTerm}" not found</p>
                </div>
            `;
            searchResult.style.display = 'block';
            searchPlaceholder.style.display = 'none';
        }
        
    } catch (error) {
        console.error("Search error:", error);
        searchResult.innerHTML = `
            <div class="error">
                <p>Error searching for user</p>
            </div>
        `;
        searchResult.style.display = 'block';
        searchPlaceholder.style.display = 'none';
    }
}

async function sendChatRequest(recipientId, recipientZynId) {
    try {
        const requestId = `${currentUser.uid}_${recipientId}_${Date.now()}`;
        
        // Add to sender's outgoing requests
        await database.ref(`users/${currentUser.uid}/chatRequests/sent/${requestId}`).set({
            recipientId: recipientId,
            recipientZynId: recipientZynId,
            timestamp: Date.now(),
            status: 'pending'
        });
        
        // Add to recipient's incoming requests
        await database.ref(`users/${recipientId}/chatRequests/received/${requestId}`).set({
            senderId: currentUser.uid,
            senderZynId: currentUserData.zynId,
            senderName: currentUserData.name,
            senderProfile: currentUserData.profilePicture || '',
            timestamp: Date.now(),
            status: 'pending'
        });
        
        showToast('Chat request sent successfully!', 'success');
        closeNewChatModal();
        
    } catch (error) {
        console.error("Error sending chat request:", error);
        showToast('Error sending chat request', 'error');
    }
}

async function loadChatRequests() {
    if (!currentUserData) return;
    
    const incomingContainer = document.getElementById('incomingRequestsContainer');
    const outgoingContainer = document.getElementById('outgoingRequestsContainer');
    
    try {
        // Load incoming requests
        const incomingRef = database.ref(`users/${currentUser.uid}/chatRequests/received`);
        incomingRef.on('value', (snapshot) => {
            const requests = snapshot.val() || {};
            const requestsArray = Object.entries(requests);
            
            if (requestsArray.length === 0) {
                incomingContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-user-plus"></i>
                        <h3>No incoming requests</h3>
                        <p>When someone sends you a chat request, it will appear here</p>
                    </div>
                `;
                updateBadge('requests', requestsArray.length);
                return;
            }
            
            incomingContainer.innerHTML = '';
            requestsArray.forEach(([requestId, request]) => {
                if (request.status === 'pending') {
                    const requestCard = document.createElement('div');
                    requestCard.className = 'request-card';
                    requestCard.innerHTML = `
                        <img src="${request.senderProfile || 'https://via.placeholder.com/50'}" alt="Profile" class="profile-pic">
                        <div class="request-info">
                            <h4>${request.senderName}</h4>
                            <p>${request.senderZynId}</p>
                            <p class="time">${formatDate(request.timestamp)}</p>
                        </div>
                        <div class="request-actions">
                            <button class="action-btn accept-btn" onclick="acceptChatRequest('${requestId}', '${request.senderId}')">
                                <i class="fas fa-check"></i> Accept
                            </button>
                            <button class="action-btn reject-btn" onclick="rejectChatRequest('${requestId}', '${request.senderId}')">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        </div>
                    `;
                    incomingContainer.appendChild(requestCard);
                }
            });
            
            updateBadge('requests', requestsArray.filter(([_, r]) => r.status === 'pending').length);
        });
        
        // Load outgoing requests
        const outgoingRef = database.ref(`users/${currentUser.uid}/chatRequests/sent`);
        outgoingRef.on('value', (snapshot) => {
            const requests = snapshot.val() || {};
            const requestsArray = Object.entries(requests);
            
            if (requestsArray.length === 0) {
                outgoingContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-paper-plane"></i>
                        <h3>No outgoing requests</h3>
                        <p>Requests you've sent will appear here</p>
                    </div>
                `;
                return;
            }
            
            outgoingContainer.innerHTML = '';
            requestsArray.forEach(([requestId, request]) => {
                if (request.status === 'pending') {
                    const requestCard = document.createElement('div');
                    requestCard.className = 'request-card';
                    requestCard.innerHTML = `
                        <img src="https://via.placeholder.com/50" alt="Profile" class="profile-pic">
                        <div class="request-info">
                            <h4>${request.recipientZynId}</h4>
                            <p class="time">Sent ${formatDate(request.timestamp)}</p>
                            <p>Pending...</p>
                        </div>
                        <div class="request-actions">
                            <button class="action-btn reject-btn" onclick="cancelChatRequest('${requestId}', '${request.recipientId}')">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    `;
                    outgoingContainer.appendChild(requestCard);
                }
            });
        });
        
    } catch (error) {
        console.error("Error loading chat requests:", error);
        showToast('Error loading chat requests', 'error');
    }
}

async function acceptChatRequest(requestId, senderId) {
    try {
        // Update request status
        await database.ref(`users/${currentUser.uid}/chatRequests/received/${requestId}/status`).set('accepted');
        await database.ref(`users/${senderId}/chatRequests/sent/${requestId}/status`).set('accepted');
        
        // Add to contacts
        const senderRef = database.ref(`users/${senderId}`);
        const senderSnapshot = await senderRef.once('value');
        const senderData = senderSnapshot.val();
        
        // Add sender to current user's contacts
        await database.ref(`users/${currentUser.uid}/contacts/${senderId}`).set({
            zynId: senderData.zynId,
            name: senderData.name,
            profilePicture: senderData.profilePicture || '',
            addedAt: Date.now()
        });
        
        // Add current user to sender's contacts
        await database.ref(`users/${senderId}/contacts/${currentUser.uid}`).set({
            zynId: currentUserData.zynId,
            name: currentUserData.name,
            profilePicture: currentUserData.profilePicture || '',
            addedAt: Date.now()
        });
        
        // Create chat between users
        const chatId = [currentUser.uid, senderId].sort().join('_');
        await database.ref(`chats/${chatId}`).set({
            type: 'private',
            participants: {
                [currentUser.uid]: true,
                [senderId]: true
            },
            createdAt: Date.now(),
            lastMessage: {
                text: 'Chat started',
                timestamp: Date.now(),
                sender: currentUser.uid
            }
        });
        
        showToast('Chat request accepted!', 'success');
        
    } catch (error) {
        console.error("Error accepting chat request:", error);
        showToast('Error accepting chat request', 'error');
    }
}

async function rejectChatRequest(requestId, senderId) {
    try {
        // Update request status
        await database.ref(`users/${currentUser.uid}/chatRequests/received/${requestId}/status`).set('rejected');
        await database.ref(`users/${senderId}/chatRequests/sent/${requestId}/status`).set('rejected');
        
        showToast('Chat request rejected', 'info');
        
    } catch (error) {
        console.error("Error rejecting chat request:", error);
        showToast('Error rejecting chat request', 'error');
    }
}

function showRequestsTab(tab) {
    const incomingContainer = document.getElementById('incomingRequestsContainer');
    const outgoingContainer = document.getElementById('outgoingRequestsContainer');
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    if (tab === 'incoming') {
        incomingContainer.style.display = 'flex';
        outgoingContainer.style.display = 'none';
        tabButtons[0].classList.add('active');
    } else {
        incomingContainer.style.display = 'none';
        outgoingContainer.style.display = 'flex';
        tabButtons[1].classList.add('active');
    }
}

// ===== CONTACTS FUNCTIONS =====
async function loadContacts() {
    if (!currentUserData) return;
    
    const container = document.getElementById('contactsContainer');
    
    try {
        const contacts = currentUserData.contacts || {};
        const contactsArray = Object.entries(contacts);
        
        if (contactsArray.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-address-book"></i>
                    <h3>No contacts yet</h3>
                    <p>Add contacts by sending them chat requests</p>
                    <button class="btn-primary" onclick="startNewChat()">Add Your First Contact</button>
                </div>
            `;
            updateBadge('contacts', 0);
            return;
        }
        
        container.innerHTML = '';
        
        // Get online status for each contact
        for (const [contactId, contact] of contactsArray) {
            const contactRef = database.ref(`users/${contactId}`);
            contactRef.on('value', (snapshot) => {
                const contactData = snapshot.val();
                if (contactData) {
                    const contactCard = document.createElement('div');
                    contactCard.className = 'contact-card';
                    contactCard.innerHTML = `
                        <img src="${contact.profilePicture || 'https://via.placeholder.com/50'}" alt="Profile" class="profile-pic">
                        <div class="contact-info">
                            <h4>${contact.name}</h4>
                            <p>${contact.zynId}</p>
                            <p class="status ${contactData.status || 'offline'}">
                                ${contactData.status === 'online' ? 'Online' : `Last seen ${formatDate(contactData.lastSeen)}`}
                            </p>
                        </div>
                        <div class="contact-actions">
                            <button class="action-btn chat-btn" onclick="startChatWithUser('${contactId}')">
                                <i class="fas fa-comment"></i> Chat
                            </button>
                        </div>
                    `;
                    container.appendChild(contactCard);
                }
            });
        }
        
        updateBadge('contacts', contactsArray.length);
        
    } catch (error) {
        console.error("Error loading contacts:", error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error loading contacts</h3>
                <p>Please try again later</p>
            </div>
        `;
    }
}

function searchContacts() {
    const searchTerm = document.getElementById('contactSearch')?.value.toLowerCase().trim();
    const contactCards = document.querySelectorAll('.contact-card');
    
    contactCards.forEach(card => {
        const name = card.querySelector('h4')?.textContent.toLowerCase();
        const zynId = card.querySelector('p')?.textContent.toLowerCase();
        
        if (name?.includes(searchTerm) || zynId?.includes(searchTerm)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// ===== CHAT INTERFACE FUNCTIONS =====
async function startChatWithUser(userId) {
    // Navigate to chat page with user ID
    window.location.href = `chat.html?user=${userId}`;
}

function goBackToHome() {
    window.location.href = 'home.html';
}

async function loadChat() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user');
    
    if (!userId || !currentUser) return;
    
    try {
        // Load user data
        const userRef = database.ref(`users/${userId}`);
        userRef.on('value', (snapshot) => {
            chatPartner = snapshot.val();
            if (chatPartner) {
                // Update chat header
                document.getElementById('chatUserName').textContent = chatPartner.name;
                document.getElementById('chatProfilePic').src = chatPartner.profilePicture || 'https://via.placeholder.com/150';
                
                // Update status
                const statusDot = document.getElementById('chatStatusDot');
                const statusText = document.getElementById('chatStatusText');
                
                if (chatPartner.status === 'online') {
                    statusDot.className = 'status-dot online';
                    statusText.textContent = 'Online';
                } else {
                    statusDot.className = 'status-dot offline';
                    statusText.textContent = `Last seen ${formatDate(chatPartner.lastSeen)}`;
                }
            }
        });
        
        // Generate chat ID (sorted user IDs)
        currentChatId = [currentUser.uid, userId].sort().join('_');
        
        // Load messages
        loadMessages();
        
        // Listen for typing indicator
        database.ref(`chats/${currentChatId}/typing/${userId}`).on('value', (snapshot) => {
            const typingIndicator = document.getElementById('typingIndicator');
            if (snapshot.exists() && snapshot.val()) {
                typingIndicator.style.display = 'flex';
            } else {
                typingIndicator.style.display = 'none';
            }
        });
        
    } catch (error) {
        console.error("Error loading chat:", error);
        showToast('Error loading chat', 'error');
    }
}

async function loadMessages() {
    if (!currentChatId) return;
    
    const messagesContainer = document.getElementById('chatMessages');
    
    try {
        const messagesRef = database.ref(`chats/${currentChatId}/messages`);
        messagesRef.orderByChild('timestamp').on('child_added', (snapshot) => {
            const message = snapshot.val();
            displayMessage(message, snapshot.key);
        });
        
    } catch (error) {
        console.error("Error loading messages:", error);
        showToast('Error loading messages', 'error');
    }
}

function displayMessage(message, messageId) {
    const messagesContainer = document.getElementById('chatMessages');
    
    // Remove empty state if present
    const emptyState = messagesContainer.querySelector('.empty-chat');
    if (emptyState) {
        emptyState.remove();
    }
    
    // Check if we need to show date separator
    const messageDate = new Date(message.timestamp).toDateString();
    if (!lastMessageDate || lastMessageDate !== messageDate) {
        lastMessageDate = messageDate;
        const dateSeparator = document.createElement('div');
        dateSeparator.className = 'message-date';
        dateSeparator.textContent = formatMessageDate(message.timestamp);
        messagesContainer.appendChild(dateSeparator);
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.sender === currentUser.uid ? 'sent' : 'received'}`;
    
    let messageContent = '';
    if (message.type === 'text') {
        messageContent = `
            <div class="message-bubble">
                <p>${message.text}</p>
                <span class="message-time">${formatDate(message.timestamp)}</span>
            </div>
        `;
    } else if (message.type === 'image') {
        messageContent = `
            <div class="message-bubble media-message">
                <img src="${message.content}" alt="Image" class="chat-media" onclick="viewMedia('${message.content}')">
                ${message.text ? `<p>${message.text}</p>` : ''}
                <span class="message-time">${formatDate(message.timestamp)}</span>
            </div>
        `;
    } else if (message.type === 'video') {
        messageContent = `
            <div class="message-bubble media-message">
                <video src="${message.content}" controls class="chat-media" onclick="viewMedia('${message.content}')"></video>
                ${message.text ? `<p>${message.text}</p>` : ''}
                <span class="message-time">${formatDate(message.timestamp)}</span>
            </div>
        `;
    } else if (message.type === 'file') {
        const fileName = message.content.split('/').pop();
        messageContent = `
            <div class="message-bubble">
                <p><i class="fas fa-file"></i> ${fileName}</p>
                <p>${message.text || ''}</p>
                <a href="${message.content}" target="_blank" class="link">Download</a>
                <span class="message-time">${formatDate(message.timestamp)}</span>
            </div>
        `;
    }
    
    messageElement.innerHTML = messageContent;
    messagesContainer.appendChild(messageElement);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Play notification sound for received messages
    if (message.sender !== currentUser.uid) {
        playNotificationSound();
    }
}

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const text = messageInput.value.trim();
    
    if (!text && selectedFiles.length === 0) return;
    if (!currentChatId || !chatPartner) return;
    
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;
    
    try {
        const messageId = database.ref().child('messages').push().key;
        const timestamp = Date.now();
        
        let messageData = {
            sender: currentUser.uid,
            timestamp: timestamp,
            readBy: {
                [currentUser.uid]: true
            }
        };
        
        // Handle file attachments
        if (selectedFiles.length > 0) {
            const file = selectedFiles[0];
            const fileUrl = await uploadToCloudinary(file, file.type.split('/')[0]);
            
            messageData.type = file.type.startsWith('image') ? 'image' : 
                              file.type.startsWith('video') ? 'video' : 'file';
            messageData.content = fileUrl;
            messageData.fileName = file.name;
            messageData.fileSize = file.size;
            
            if (text) {
                messageData.text = text;
            }
            
            // Clear selected files
            selectedFiles = [];
            document.getElementById('mediaButtons').style.display = 'none';
            
        } else {
            messageData.type = 'text';
            messageData.text = text;
        }
        
        // Save message
        await database.ref(`chats/${currentChatId}/messages/${messageId}`).set(messageData);
        
        // Update last message
        await database.ref(`chats/${currentChatId}/lastMessage`).set({
            text: text || (selectedFiles.length > 0 ? 'Sent an attachment' : ''),
            timestamp: timestamp,
            sender: currentUser.uid
        });
        
        // Clear input
        messageInput.value = '';
        
        // Clear typing indicator
        await database.ref(`chats/${currentChatId}/typing/${currentUser.uid}`).set(false);
        
        showToast('Message sent', 'success');
        
    } catch (error) {
        console.error("Error sending message:", error);
        showToast('Error sending message', 'error');
    } finally {
        sendBtn.disabled = false;
    }
}

function handleMessageKeypress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

async function updateTypingIndicator() {
    if (!currentChatId || !chatPartner) return;
    
    // Set typing indicator
    await database.ref(`chats/${currentChatId}/typing/${currentUser.uid}`).set(true);
    
    // Clear previous timeout
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
    
    // Clear typing indicator after 2 seconds
    typingTimeout = setTimeout(async () => {
        await database.ref(`chats/${currentChatId}/typing/${currentUser.uid}`).set(false);
    }, 2000);
}

// ===== ATTACHMENT FUNCTIONS =====
function toggleAttachmentOptions() {
    const options = document.getElementById('attachmentOptions');
    options.classList.toggle('show');
}

function attachPhoto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => handleFileSelect(e, 'image');
    input.click();
}

function attachVideo() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => handleFileSelect(e, 'video');
    input.click();
}

function attachFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*';
    input.onchange = (e) => handleFileSelect(e, 'file');
    input.click();
}

function handleFileSelect(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
        showToast('File size must be less than 50MB', 'error');
        return;
    }
    
    selectedFiles = [file];
    
    // Show file preview
    const mediaButtons = document.getElementById('mediaButtons');
    const messageInput = document.getElementById('messageInput');
    
    let previewText = '';
    if (type === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewText = `<img src="${e.target.result}" style="width: 30px; height: 30px; border-radius: 5px; margin-right: 10px;"> ${file.name}`;
            mediaButtons.innerHTML = previewText + mediaButtons.innerHTML;
        };
        reader.readAsDataURL(file);
    } else {
        previewText = `<i class="fas fa-${type === 'video' ? 'video' : 'file'}" style="margin-right: 10px;"></i> ${file.name}`;
        mediaButtons.innerHTML = previewText + mediaButtons.innerHTML;
    }
    
    mediaButtons.style.display = 'flex';
    messageInput.placeholder = 'Add a caption...';
    
    // Hide attachment options
    document.getElementById('attachmentOptions').classList.remove('show');
}

function removeAttachment() {
    selectedFiles = [];
    document.getElementById('mediaButtons').style.display = 'none';
    document.getElementById('messageInput').placeholder = 'iMessage';
}

// ===== GROUPS FUNCTIONS =====
function createNewGroup() {
    const modal = document.getElementById('newGroupModal');
    if (modal) {
        modal.classList.add('active');
        groupMembers = [currentUser.uid];
        updateGroupMembersList();
    }
}

function closeNewGroupModal() {
    const modal = document.getElementById('newGroupModal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('groupName').value = '';
        document.getElementById('groupPhotoUrl').value = '';
        document.getElementById('addMemberInput').value = '';
        groupMembers = [];
        updateGroupMembersList();
    }
}

async function addGroupMember(event) {
    if (event.key !== 'Enter') return;
    
    const input = document.getElementById('addMemberInput');
    const zynId = input.value.trim();
    
    if (!zynId.startsWith('ZYN-')) {
        showToast('Please enter a valid ZYN-ID', 'error');
        return;
    }
    
    try {
        // Find user by ZYN-ID
        const usersRef = database.ref('users');
        const snapshot = await usersRef.orderByChild('zynId').equalTo(zynId).once('value');
        
        if (snapshot.exists()) {
            const userData = Object.values(snapshot.val())[0];
            
            if (groupMembers.includes(userData.uid)) {
                showToast('User already in group', 'info');
                return;
            }
            
            groupMembers.push(userData.uid);
            updateGroupMembersList();
            input.value = '';
            
        } else {
            showToast('User not found', 'error');
        }
        
    } catch (error) {
        console.error("Error adding group member:", error);
        showToast('Error adding member', 'error');
    }
}

function updateGroupMembersList() {
    const membersList = document.getElementById('groupMembersList');
    const membersCount = document.getElementById('membersCount');
    
    if (groupMembers.length === 1) {
        membersList.innerHTML = `
            <div class="empty-members">
                <i class="fas fa-user-plus"></i>
                <p>Add members using their ZYN-ID</p>
            </div>
        `;
        membersCount.textContent = '1 member';
        return;
    }
    
    membersList.innerHTML = '';
    
    // Load member details
    groupMembers.forEach(async (memberId) => {
        if (memberId === currentUser.uid) {
            const memberTag = document.createElement('div');
            memberTag.className = 'member-tag';
            memberTag.innerHTML = `
                <span>${currentUserData.name} (You)</span>
            `;
            membersList.appendChild(memberTag);
            return;
        }
        
        try {
            const userRef = database.ref(`users/${memberId}`);
            userRef.once('value').then((snapshot) => {
                const userData = snapshot.val();
                if (userData) {
                    const memberTag = document.createElement('div');
                    memberTag.className = 'member-tag';
                    memberTag.innerHTML = `
                        <span>${userData.name}</span>
                        <button class="remove-member" onclick="removeGroupMember('${memberId}')">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    membersList.appendChild(memberTag);
                }
            });
        } catch (error) {
            console.error("Error loading member:", error);
        }
    });
    
    membersCount.textContent = `${groupMembers.length} members`;
}

function removeGroupMember(memberId) {
    groupMembers = groupMembers.filter(id => id !== memberId);
    updateGroupMembersList();
}

async function createGroup() {
    const groupName = document.getElementById('groupName')?.value.trim();
    const groupPhotoUrl = document.getElementById('groupPhotoUrl')?.value.trim();
    
    if (!groupName) {
        showToast('Please enter a group name', 'error');
        return;
    }
    
    if (groupMembers.length < 2) {
        showToast('Add at least one member to create a group', 'error');
        return;
    }
    
    try {
        const groupId = database.ref().child('groups').push().key;
        const timestamp = Date.now();
        
        // Create group
        await database.ref(`groups/${groupId}`).set({
            name: groupName,
            photoUrl: groupPhotoUrl || '',
            admin: currentUser.uid,
            members: groupMembers.reduce((acc, memberId) => {
                acc[memberId] = true;
                return acc;
            }, {}),
            createdAt: timestamp
        });
        
        // Add group to each member's groups list
        for (const memberId of groupMembers) {
            await database.ref(`users/${memberId}/groups/${groupId}`).set(true);
        }
        
        // Create group chat
        await database.ref(`chats/${groupId}`).set({
            type: 'group',
            groupId: groupId,
            participants: groupMembers.reduce((acc, memberId) => {
                acc[memberId] = true;
                return acc;
            }, {}),
            createdAt: timestamp,
            lastMessage: {
                text: 'Group created',
                timestamp: timestamp,
                sender: currentUser.uid
            }
        });
        
        showToast('Group created successfully!', 'success');
        closeNewGroupModal();
        
        // Navigate to group chat
        setTimeout(() => {
            window.location.href = `chat.html?group=${groupId}`;
        }, 1000);
        
    } catch (error) {
        console.error("Error creating group:", error);
        showToast('Error creating group', 'error');
    }
}

async function loadGroups() {
    if (!currentUserData) return;
    
    const container = document.getElementById('groupsContainer');
    
    try {
        const groups = currentUserData.groups || {};
        const groupIds = Object.keys(groups);
        
        if (groupIds.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No groups yet</h3>
                    <p>Create a group to chat with multiple people</p>
                    <button class="btn-primary" onclick="createNewGroup()">Create Your First Group</button>
                </div>
            `;
            updateBadge('groups', 0);
            return;
        }
        
        container.innerHTML = '';
        
        for (const groupId of groupIds) {
            const groupRef = database.ref(`groups/${groupId}`);
            groupRef.on('value', (snapshot) => {
                const groupData = snapshot.val();
                if (groupData) {
                    const groupCard = document.createElement('div');
                    groupCard.className = 'group-card';
                    groupCard.onclick = () => window.location.href = `chat.html?group=${groupId}`;
                    
                    groupCard.innerHTML = `
                        <img src="${groupData.photoUrl || 'https://via.placeholder.com/50'}" alt="Group" class="profile-pic">
                        <div class="group-info">
                            <h4>${groupData.name}</h4>
                            <p>${Object.keys(groupData.members || {}).length} members</p>
                            <p class="time">Created ${formatDate(groupData.createdAt)}</p>
                        </div>
                        <div class="group-actions">
                            <button class="action-btn chat-btn" onclick="event.stopPropagation(); window.location.href='chat.html?group=${groupId}'">
                                <i class="fas fa-comment"></i> Chat
                            </button>
                        </div>
                    `;
                    container.appendChild(groupCard);
                }
            });
        }
        
        updateBadge('groups', groupIds.length);
        
    } catch (error) {
        console.error("Error loading groups:", error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error loading groups</h3>
                <p>Please try again later</p>
            </div>
        `;
    }
}

// ===== ZYNES FUNCTIONS =====
function createNewZyne() {
    const modal = document.getElementById('newZyneModal');
    if (modal) {
        modal.classList.add('active');
        document.getElementById('zyneText').focus();
    }
}

function closeNewZyneModal() {
    const modal = document.getElementById('newZyneModal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('zyneText').value = '';
        document.getElementById('zyneMediaPreview').innerHTML = '';
        selectedFiles = [];
    }
}

function addZynePhoto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => handleZyneMediaSelect(e, 'image');
    input.click();
}

function addZyneVideo() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => handleZyneMediaSelect(e, 'video');
    input.click();
}

function handleZyneMediaSelect(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
        showToast('File size must be less than 50MB', 'error');
        return;
    }
    
    selectedFiles = [file];
    
    const previewContainer = document.getElementById('zyneMediaPreview');
    
    if (type === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewContainer.innerHTML = `
                <div class="preview-item">
                    <img src="${e.target.result}" alt="Preview">
                    <button class="remove-preview" onclick="removeZyneMedia()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    } else {
        previewContainer.innerHTML = `
            <div class="preview-item">
                <video src="${URL.createObjectURL(file)}" controls></video>
                <button class="remove-preview" onclick="removeZyneMedia()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
}

function removeZyneMedia() {
    selectedFiles = [];
    document.getElementById('zyneMediaPreview').innerHTML = '';
}

async function postZyne() {
    const text = document.getElementById('zyneText')?.value.trim();
    
    if (!text && selectedFiles.length === 0) {
        showToast('Please add text or media to your Zyne', 'error');
        return;
    }
    
    try {
        const zyneId = database.ref().child('zynes').push().key;
        const timestamp = Date.now();
        
        let zyneData = {
            userId: currentUser.uid,
            userName: currentUserData.name,
            userProfile: currentUserData.profilePicture || '',
            timestamp: timestamp,
            expiresAt: timestamp + (24 * 60 * 60 * 1000) // 24 hours
        };
        
        // Handle media upload
        if (selectedFiles.length > 0) {
            const file = selectedFiles[0];
            const fileUrl = await uploadToCloudinary(file, file.type.split('/')[0]);
            
            zyneData.type = file.type.startsWith('image') ? 'image' : 'video';
            zyneData.mediaUrl = fileUrl;
        }
        
        if (text) {
            zyneData.text = text;
        }
        
        // Save Zyne
        await database.ref(`zynes/${zyneId}`).set(zyneData);
        
        // Add to user's Zynes
        await database.ref(`users/${currentUser.uid}/zynes/${zyneId}`).set(true);
        
        showToast('Zyne posted successfully!', 'success');
        closeNewZyneModal();
        
        // Reload Zynes
        loadZynes();
        
    } catch (error) {
        console.error("Error posting Zyne:", error);
        showToast('Error posting Zyne', 'error');
    }
}

async function loadZynes() {
    if (!currentUserData) return;
    
    const container = document.getElementById('zynesContainer');
    
    try {
        // Load user's own Zynes
        const userZynes = currentUserData.zynes || {};
        const zyneIds = Object.keys(userZynes);
        
        if (zyneIds.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-circle"></i>
                    <h3>No Zynes yet</h3>
                    <p>Share a photo, video, or text update with your contacts</p>
                    <button class="btn-primary" onclick="createNewZyne()">Create Your First Zyne</button>
                </div>
            `;
            updateBadge('zynes', 0);
            return;
        }
        
        container.innerHTML = '';
        
        for (const zyneId of zyneIds) {
            const zyneRef = database.ref(`zynes/${zyneId}`);
            zyneRef.on('value', (snapshot) => {
                const zyneData = snapshot.val();
                if (zyneData) {
                    // Check if Zyne has expired
                    if (Date.now() > zyneData.expiresAt) {
                        // Remove expired Zyne
                        database.ref(`zynes/${zyneId}`).remove();
                        database.ref(`users/${currentUser.uid}/zynes/${zyneId}`).remove();
                        return;
                    }
                    
                    const zyneElement = document.createElement('div');
                    zyneElement.className = 'zyne-card';
                    
                    let content = '';
                    if (zyneData.type === 'image') {
                        content = `
                            <img src="${zyneData.mediaUrl}" alt="Zyne" class="zyne-media">
                        `;
                    } else if (zyneData.type === 'video') {
                        content = `
                            <video src="${zyneData.mediaUrl}" controls class="zyne-media"></video>
                        `;
                    }
                    
                    if (zyneData.text) {
                        content += `<p class="zyne-text">${zyneData.text}</p>`;
                    }
                    
                    zyneElement.innerHTML = `
                        <div class="zyne-header">
                            <img src="${zyneData.userProfile || 'https://via.placeholder.com/40'}" alt="Profile" class="profile-pic">
                            <div>
                                <h4>${zyneData.userName}</h4>
                                <p class="time">${formatDate(zyneData.timestamp)} • Expires in ${Math.ceil((zyneData.expiresAt - Date.now()) / (60 * 60 * 1000))} hours</p>
                            </div>
                        </div>
                        ${content}
                        <div class="zyne-actions">
                            <button class="btn-media">
                                <i class="far fa-heart"></i>
                            </button>
                            <button class="btn-media">
                                <i class="far fa-comment"></i>
                            </button>
                            <button class="btn-media">
                                <i class="fas fa-share"></i>
                            </button>
                        </div>
                    `;
                    
                    container.appendChild(zyneElement);
                }
            });
        }
        
        updateBadge('zynes', zyneIds.length);
        
    } catch (error) {
        console.error("Error loading Zynes:", error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error loading Zynes</h3>
                <p>Please try again later</p>
            </div>
        `;
    }
}

// ===== USER STATUS FUNCTIONS =====
function startUserStatusListener() {
    if (!currentUser) return;
    
    // Update online status
    database.ref(`users/${currentUser.uid}/status`).set('online');
    database.ref(`users/${currentUser.uid}/lastSeen`).set(Date.now());
    
    // Handle user disconnect
    database.ref('.info/connected').on('value', (snapshot) => {
        if (!snapshot.val()) return;
        
        // Set offline when disconnected
        database.ref(`users/${currentUser.uid}/status`).onDisconnect().set('offline');
        database.ref(`users/${currentUser.uid}/lastSeen`).onDisconnect().set(Date.now());
    });
}

function toggleStatus() {
    if (!currentUserData) return;
    
    const newStatus = currentUserData.status === 'online' ? 'offline' : 'online';
    database.ref(`users/${currentUser.uid}/status`).set(newStatus);
    database.ref(`users/${currentUser.uid}/lastSeen`).set(Date.now());
}

// ===== UI HELPER FUNCTIONS =====
function copyUserId() {
    const userId = currentUserData?.zynId || 'ZYN-0000';
    navigator.clipboard.writeText(userId).then(() => {
        showToast('User ID copied to clipboard', 'success');
    }).catch(() => {
        showToast('Failed to copy User ID', 'error');
    });
}

function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.toggle('show');
}

function toggleChatMenu() {
    const dropdown = document.getElementById('chatMenuDropdown');
    dropdown.classList.toggle('show');
}

function updateBadge(type, count) {
    const badge = document.getElementById(`${type}Badge`);
    if (!badge) return;
    
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// ===== INITIALIZATION =====
function init() {
    // Check authentication state
    checkAuthState();
    
    // Initialize page based on current URL
    if (window.location.pathname.includes('chat.html')) {
        loadChat();
    } else if (window.location.pathname.includes('home.html')) {
        // Home page initialization
        showPage('home');
    }
    
    // Hide loading screen
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }, 1000);
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', init);

// Close dropdowns when clicking outside
document.addEventListener('click', (event) => {
    // Profile dropdown
    const profileDropdown = document.getElementById('profileDropdown');
    const profileBtn = document.querySelector('.profile-btn');
    if (profileDropdown && profileBtn && !profileBtn.contains(event.target) && !profileDropdown.contains(event.target)) {
        profileDropdown.classList.remove('show');
    }
    
    // Chat menu dropdown
    const chatMenuDropdown = document.getElementById('chatMenuDropdown');
    const chatMenuBtn = document.querySelector('.chat-header-actions .icon-btn');
    if (chatMenuDropdown && chatMenuBtn && !chatMenuBtn.contains(event.target) && !chatMenuDropdown.contains(event.target)) {
        chatMenuDropdown.classList.remove('show');
    }
    
    // Attachment options
    const attachmentOptions = document.getElementById('attachmentOptions');
    const attachmentBtn = document.querySelector('.message-input-area .icon-btn');
    if (attachmentOptions && attachmentBtn && !attachmentBtn.contains(event.target) && !attachmentOptions.contains(event.target)) {
        attachmentOptions.classList.remove('show');
    }
});

// ===== PROFILE UPLOAD FUNCTIONS =====
function triggerProfileUpload() {
    document.getElementById('profileUpload').click();
}

function previewProfileImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image must be less than 5MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('profilePreview');
        preview.innerHTML = `<img src="${e.target.result}" alt="Profile Preview">`;
    };
    reader.readAsDataURL(file);
}

function togglePassword(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// ===== LOAD USER DATA ASYNC =====
async function loadUserDataAsync() {
    if (!currentUserData) return;
    
    // Load recent chats
    loadRecentChats();
    
    // Update badges
    updateBadge('requests', Object.keys(currentUserData.chatRequests?.received || {}).length);
    updateBadge('contacts', Object.keys(currentUserData.contacts || {}).length);
    updateBadge('groups', Object.keys(currentUserData.groups || {}).length);
    updateBadge('zynes', Object.keys(currentUserData.zynes || {}).length);
}

async function loadRecentChats() {
    if (!currentUserData) return;
    
    const container = document.getElementById('recentChatsList');
    if (!container) return;
    
    try {
        // Get all chats where user is a participant
        const chatsRef = database.ref('chats');
        chatsRef.orderByChild('lastMessage/timestamp').limitToLast(10).on('value', (snapshot) => {
            const chats = snapshot.val() || {};
            const recentChats = [];
            
            for (const [chatId, chatData] of Object.entries(chats)) {
                if (chatData.participants && chatData.participants[currentUser.uid]) {
                    recentChats.push({ chatId, ...chatData });
                }
            }
            
            // Sort by last message timestamp
            recentChats.sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));
            
            if (recentChats.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-comments"></i>
                        <h3>No chats yet</h3>
                        <p>Start a conversation by clicking "New Chat"</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = '';
            
            for (const chat of recentChats.slice(0, 5)) {
                const chatCard = document.createElement('div');
                chatCard.className = 'contact-card';
                
                if (chat.type === 'private') {
                    // Find the other participant
                    const otherParticipantId = Object.keys(chat.participants).find(id => id !== currentUser.uid);
                    
                    if (otherParticipantId) {
                        const userRef = database.ref(`users/${otherParticipantId}`);
                        userRef.once('value').then((userSnapshot) => {
                            const userData = userSnapshot.val();
                            if (userData) {
                                chatCard.onclick = () => window.location.href = `chat.html?user=${otherParticipantId}`;
                                chatCard.innerHTML = `
                                    <img src="${userData.profilePicture || 'https://via.placeholder.com/50'}" alt="Profile" class="profile-pic">
                                    <div class="contact-info">
                                        <h4>${userData.name}</h4>
                                        <p>${chat.lastMessage?.text || 'No messages yet'}</p>
                                        <p class="time">${formatDate(chat.lastMessage?.timestamp)}</p>
                                    </div>
                                `;
                            }
                        });
                    }
                } else if (chat.type === 'group') {
                    const groupRef = database.ref(`groups/${chat.groupId}`);
                    groupRef.once('value').then((groupSnapshot) => {
                        const groupData = groupSnapshot.val();
                        if (groupData) {
                            chatCard.onclick = () => window.location.href = `chat.html?group=${chat.groupId}`;
                            chatCard.innerHTML = `
                                <img src="${groupData.photoUrl || 'https://via.placeholder.com/50'}" alt="Group" class="profile-pic">
                                <div class="contact-info">
                                    <h4>${groupData.name}</h4>
                                    <p>${chat.lastMessage?.text || 'No messages yet'}</p>
                                    <p class="time">${formatDate(chat.lastMessage?.timestamp)}</p>
                                </div>
                            `;
                        }
                    });
                }
                
                container.appendChild(chatCard);
            }
            
        });
        
    } catch (error) {
        console.error("Error loading recent chats:", error);
    }
}

// ===== ADDITIONAL CHAT FUNCTIONS =====
function viewMedia(url) {
    window.open(url, '_blank');
}

function viewSharedMedia() {
    const modal = document.getElementById('sharedMediaModal');
    if (modal) {
        modal.classList.add('active');
        loadSharedMedia();
    }
}

function closeSharedMediaModal() {
    const modal = document.getElementById('sharedMediaModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function loadSharedMedia() {
    if (!currentChatId) return;
    
    const container = document.getElementById('sharedMediaContainer');
    
    try {
        const messagesRef = database.ref(`chats/${currentChatId}/messages`);
        messagesRef.orderByChild('timestamp').once('value').then((snapshot) => {
            const messages = snapshot.val() || {};
            const mediaMessages = Object.values(messages).filter(msg => 
                msg.type === 'image' || msg.type === 'video' || msg.type === 'file'
            );
            
            if (mediaMessages.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-photo-video"></i>
                        <h3>No shared media</h3>
                        <p>Photos, videos, and files shared in this chat will appear here</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = '';
            
            mediaMessages.forEach((message, index) => {
                const mediaItem = document.createElement('div');
                mediaItem.className = 'preview-item';
                
                if (message.type === 'image') {
                    mediaItem.innerHTML = `
                        <img src="${message.content}" alt="Media ${index + 1}" onclick="viewMedia('${message.content}')">
                    `;
                } else if (message.type === 'video') {
                    mediaItem.innerHTML = `
                        <video src="${message.content}" onclick="viewMedia('${message.content}')"></video>
                    `;
                } else {
                    mediaItem.innerHTML = `
                        <div class="file-preview">
                            <i class="fas fa-file fa-3x"></i>
                            <p>${message.fileName || 'File'}</p>
                        </div>
                    `;
                }
                
                container.appendChild(mediaItem);
            });
        });
        
    } catch (error) {
        console.error("Error loading shared media:", error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error loading media</h3>
                <p>Please try again later</p>
            </div>
        `;
    }
}

function blockUser() {
    const modal = document.getElementById('blockReportModal');
    const title = document.getElementById('blockReportTitle');
    const blockConfirmation = document.getElementById('blockConfirmation');
    const reportForm = document.getElementById('reportForm');
    const blockUserName = document.getElementById('blockUserName');
    
    if (modal && blockConfirmation && reportForm && blockUserName && chatPartner) {
        modal.classList.add('active');
        title.textContent = 'Block User';
        blockUserName.textContent = chatPartner.name;
        blockConfirmation.style.display = 'block';
        reportForm.style.display = 'none';
    }
}

function reportUser() {
    const modal = document.getElementById('blockReportModal');
    const title = document.getElementById('blockReportTitle');
    const blockConfirmation = document.getElementById('blockConfirmation');
    const reportForm = document.getElementById('reportForm');
    
    if (modal && blockConfirmation && reportForm) {
        modal.classList.add('active');
        title.textContent = 'Report User';
        blockConfirmation.style.display = 'none';
        reportForm.style.display = 'block';
    }
}

function closeBlockReportModal() {
    const modal = document.getElementById('blockReportModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function confirmBlock() {
    if (!chatPartner) return;
    
    try {
        // Add to blocked users
        await database.ref(`users/${currentUser.uid}/blocked/${chatPartner.uid}`).set({
            blockedAt: Date.now(),
            reason: 'user_blocked'
        });
        
        showToast(`${chatPartner.name} has been blocked`, 'success');
        closeBlockReportModal();
        
        // Go back to home
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1000);
        
    } catch (error) {
        console.error("Error blocking user:", error);
        showToast('Error blocking user', 'error');
    }
}

async function submitReport() {
    const reason = document.getElementById('reportReason')?.value;
    const details = document.getElementById('reportDetails')?.value.trim();
    
    if (!chatPartner) return;
    
    try {
        const reportId = database.ref().child('reports').push().key;
        
        await database.ref(`reports/${reportId}`).set({
            reporterId: currentUser.uid,
            reporterName: currentUserData.name,
            reportedUserId: chatPartner.uid,
            reportedUserName: chatPartner.name,
            reason: reason,
            details: details || '',
            timestamp: Date.now(),
            status: 'pending'
        });
        
        showToast('Report submitted successfully', 'success');
        closeBlockReportModal();
        
    } catch (error) {
        console.error("Error submitting report:", error);
        showToast('Error submitting report', 'error');
    }
}

function addNickname() {
    const nickname = prompt('Enter nickname for this contact:');
    if (nickname && chatPartner) {
        // Save nickname
        database.ref(`users/${currentUser.uid}/contacts/${chatPartner.uid}/nickname`).set(nickname);
        showToast('Nickname added', 'success');
    }
}

function addToFavorites() {
    if (chatPartner) {
        database.ref(`users/${currentUser.uid}/favorites/${chatPartner.uid}`).set(true);
        showToast('Added to favorites', 'success');
    }
}

function clearChat() {
    if (confirm('Are you sure you want to clear this chat? This action cannot be undone.')) {
        if (currentChatId) {
            database.ref(`chats/${currentChatId}/messages`).remove();
            showToast('Chat cleared', 'info');
        }
    }
}

function viewChatProfile() {
    if (chatPartner) {
        alert(`Profile: ${chatPartner.name}\nZYN-ID: ${chatPartner.zynId}\nPhone: ${chatPartner.phone || 'Not provided'}`);
    }
}

// ===== GOOGLE SIGN IN =====
async function signInWithGoogle() {
    showToast('Google sign-in coming soon', 'info');
}

// ===== FORGOT PASSWORD =====
function showForgotPassword() {
    const email = prompt('Enter your email address to reset password:');
    if (email) {
        auth.sendPasswordResetEmail(email).then(() => {
            showToast('Password reset email sent', 'success');
        }).catch((error) => {
            console.error("Password reset error:", error);
            showToast('Error sending reset email', 'error');
        });
    }
}

// ===== SETTINGS FUNCTIONS =====
function showSettings() {
    alert('Settings page coming soon');
}

function showThemeOptions() {
    alert('Theme options coming soon');
}

function viewMyProfile() {
    if (currentUserData) {
        alert(`My Profile:\nName: ${currentUserData.name}\nZYN-ID: ${currentUserData.zynId}\nEmail: ${currentUserData.email}\nPhone: ${currentUserData.phone || 'Not provided'}`);
    }
}

// ===== WINDOW UNLOAD =====
window.addEventListener('beforeunload', () => {
    if (currentUser) {
        // Update status to offline
        database.ref(`users/${currentUser.uid}/status`).set('offline');
        database.ref(`users/${currentUser.uid}/lastSeen`).set(Date.now());
    }
});
