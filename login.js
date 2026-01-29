import { auth, database, ref, get, signInWithEmailAndPassword, onAuthStateChanged } from './firebase.js';

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('errorMessage');
    const rememberMe = document.getElementById('rememberMe');

    // Check for saved credentials
    if (localStorage.getItem('rememberMe') === 'true') {
        const savedEmail = localStorage.getItem('email');
        const savedPassword = localStorage.getItem('password');
        if (savedEmail) emailInput.value = savedEmail;
        if (savedPassword) passwordInput.value = savedPassword;
        rememberMe.checked = true;
    }

    // Toggle password visibility
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    });

    // Handle login form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        // Validate inputs
        if (!email || !password) {
            showError('Please fill in all fields');
            return;
        }
        
        // Save credentials if remember me is checked
        if (rememberMe.checked) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('email', email);
            localStorage.setItem('password', password);
        } else {
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('email');
            localStorage.removeItem('password');
        }
        
        // Show loading state
        loading.style.display = 'flex';
        errorMessage.style.display = 'none';
        
        try {
            // Sign in with Firebase
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Get user role from database
            const userRef = ref(database, 'users/' + user.uid);
            const snapshot = await get(userRef);
            
            if (snapshot.exists()) {
                const userData = snapshot.val();
                const role = userData.role;
                
                // Check if account is active
                if (userData.isActive === false) {
                    showError('Account is suspended. Please contact administrator.');
                    loading.style.display = 'none';
                    return;
                }
                
                // Redirect based on role
                switch(role) {
                    case 'sudo':
                        window.location.href = 'sudo.html';
                        break;
                    case 'admin':
                        window.location.href = 'admin.html';
                        break;
                    case 'agent':
                        window.location.href = 'agent.html';
                        break;
                    case 'customer':
                        window.location.href = 'customer.html';
                        break;
                    default:
                        showError('Invalid user role');
                        loading.style.display = 'none';
                }
            } else {
                showError('User data not found');
                loading.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Login error:', error);
            loading.style.display = 'none';
            
            // Show user-friendly error messages
            switch(error.code) {
                case 'auth/invalid-email':
                    showError('Invalid email address');
                    break;
                case 'auth/user-disabled':
                    showError('Account has been disabled');
                    break;
                case 'auth/user-not-found':
                    showError('No account found with this email');
                    break;
                case 'auth/wrong-password':
                    showError('Incorrect password');
                    break;
                case 'auth/too-many-requests':
                    showError('Too many failed attempts. Please try again later');
                    break;
                default:
                    showError('Login failed. Please try again');
            }
        }
    });

    // Check if user is already logged in
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userRef = ref(database, 'users/' + user.uid);
                const snapshot = await get(userRef);
                
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    const role = userData.role;
                    
                    if (userData.isActive !== false) {
                        // Redirect based on current page
                        const currentPage = window.location.pathname.split('/').pop();
                        if (currentPage === 'index.html' || currentPage === '') {
                            switch(role) {
                                case 'sudo':
                                    window.location.href = 'sudo.html';
                                    break;
                                case 'admin':
                                    window.location.href = 'admin.html';
                                    break;
                                case 'agent':
                                    window.location.href = 'agent.html';
                                    break;
                                case 'customer':
                                    window.location.href = 'customer.html';
                                    break;
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Auth state error:', error);
            }
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
        // Auto-hide error after 5 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }

    // Forgot password functionality
    document.querySelector('.forgot-password').addEventListener('click', function(e) {
        e.preventDefault();
        const email = prompt('Please enter your email address to reset password:');
        if (email) {
            alert('Password reset email sent to ' + email + '\n\nNote: Firebase password reset must be configured.');
        }
    });
});
