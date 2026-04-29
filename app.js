// --- 0. UaaO (User-as-an-Object) ARCHITECTURE ---
// Hardcoded user database replacing MongoDB/localStorage for now.
const UaaODatabase = {
    "alekhyo_0812": { 
        pass: "bookfair@test", 
        name: "Alekhyo Biswas",
        wallet: 1450,
        unsettledBooks: 4,
        inbox: 2
    }
};

// --- 1. STATE ROUTER & AUTHENTICATION ---
const vLanding = document.getElementById('view-landing');
const vAuth = document.getElementById('view-auth');
const vDashboard = document.getElementById('view-dashboard');
const btnNavAuth = document.getElementById('nav-auth-btn');
const btnLogout = document.getElementById('nav-logout-btn');
const authForm = document.getElementById('auth-form');

let currentAuthMode = 'signup'; 

function checkAuthState() {
    const activeUser = localStorage.getItem('bookfair_active_user');
    
    if (activeUser) {
        // Determine First Name
        const firstName = activeUser.split(' ')[0];
        document.getElementById('dash-greeting').innerText = `Welcome back, ${firstName}.`;

        // DASHBOARD MODE
        vLanding.classList.add('hidden');
        vAuth.classList.add('hidden');
        btnNavAuth.classList.add('hidden');
        vDashboard.classList.remove('hidden');
        btnLogout.classList.remove('hidden');
        
        // PERFORMANCE: Kill particles
        canvas.style.display = 'none';
        if(animationFrameId) {
            cancelAnimationFrame(animationFrameId); 
            animationFrameId = null;
        }
    } else {
        // LANDING MODE
        vDashboard.classList.add('hidden');
        vAuth.classList.add('hidden');
        btnLogout.classList.add('hidden');
        vLanding.classList.remove('hidden');
        btnNavAuth.classList.remove('hidden');
        
        // START/RESTART Particles securely
        canvas.style.display = 'block';
        resize();
        if (!animationFrameId) animate();
    }
}

function showAuth(mode) {
    vLanding.classList.add('hidden');
    vAuth.classList.remove('hidden');
    btnNavAuth.classList.add('hidden');
    
    if(mode && mode !== currentAuthMode) {
        toggleAuthMode();
    }
}

function showLanding() {
    authForm.reset(); // WIPE DATA
    document.getElementById('auth-error').classList.add('hidden');
    document.getElementById('password').type = 'password'; // Reset to hidden
    document.getElementById('eye-icon').classList.add('hidden');
    document.getElementById('eye-slash-icon').classList.remove('hidden');
    checkAuthState();
}

function toggleAuthMode() {
    const title = document.getElementById('auth-title');
    const nameGroup = document.getElementById('name-group');
    const captchaGroup = document.getElementById('captcha-container');
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleLink = document.getElementById('auth-toggle-link');

    // SECURITY: Wipe form on toggle
    authForm.reset();
    document.getElementById('auth-error').classList.add('hidden');
    document.getElementById('password').type = 'password'; // Reset visibility on toggle
    document.getElementById('eye-icon').classList.add('hidden');
    document.getElementById('eye-slash-icon').classList.remove('hidden');

    if (currentAuthMode === 'signup') {
        // Switch to LOGIN
        currentAuthMode = 'login';
        title.innerText = 'Welcome Back';
        nameGroup.classList.add('hidden');
        captchaGroup.classList.add('hidden'); // Hide captcha on login
        document.getElementById('fullname').removeAttribute('required');
        submitBtn.innerText = 'Log In';
        toggleLink.innerText = "Don't have an account? Sign Up";
    } else {
        // Switch to SIGNUP
        currentAuthMode = 'signup';
        title.innerText = 'Create Account';
        nameGroup.classList.remove('hidden');
        captchaGroup.classList.remove('hidden'); // Show captcha
        document.getElementById('fullname').setAttribute('required', 'true');
        submitBtn.innerText = 'Sign Up';
        toggleLink.innerText = "Already have an account? Log In";
    }
}

// --- PASSWORD VISIBILITY TOGGLE ---
const togglePasswordBtn = document.getElementById('toggle-password');
const passwordInput = document.getElementById('password');
const eyeIcon = document.getElementById('eye-icon');
const eyeSlashIcon = document.getElementById('eye-slash-icon');

togglePasswordBtn.addEventListener('click', () => {
    // Check current state
    const isPassword = passwordInput.type === 'password';
    
    // Toggle type
    passwordInput.type = isPassword ? 'text' : 'password';
    
    // Toggle icons
    if (isPassword) {
        eyeIcon.classList.remove('hidden');
        eyeSlashIcon.classList.add('hidden');
    } else {
        eyeIcon.classList.add('hidden');
        eyeSlashIcon.classList.remove('hidden');
    }
});

// Handle Form Submission Logic using UaaO Architecture
authForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const uid = document.getElementById('userid').value.trim();
    const pass = document.getElementById('password').value;
    const errorBox = document.getElementById('auth-error');
    const submitBtn = document.getElementById('auth-submit-btn');

    if (currentAuthMode === 'signup') {
        const fname = document.getElementById('fullname').value.trim();
        
        // 1. Check hCaptcha token locally
        const captchaToken = hcaptcha.getResponse();
        
        if (captchaToken === "") {
            errorBox.innerText = "Please complete the security check.";
            errorBox.classList.remove('hidden');
            return; 
        }

        // 2. Check the UaaO Database
        if (UaaODatabase[uid]) {
            errorBox.innerText = "User ID already exists.";
            errorBox.classList.remove('hidden');
            hcaptcha.reset(); 
            return;
        }

        submitBtn.innerText = "Verifying..."; 
        submitBtn.disabled = true;

        // Simulate server communication latency
        setTimeout(() => {
            // Save to UaaO Object
            UaaODatabase[uid] = { pass: pass, name: fname, wallet: 0, unsettledBooks: 0, inbox: 0 };
            
            // Keep user session active
            localStorage.setItem('bookfair_active_user', fname);
            
            authForm.reset();
            document.getElementById('password').type = 'password';
            document.getElementById('eye-icon').classList.add('hidden');
            document.getElementById('eye-slash-icon').classList.remove('hidden');
            hcaptcha.reset(); 
            submitBtn.innerText = "Sign Up";
            submitBtn.disabled = false;
            checkAuthState();
        }, 1200);

    } else {
        // Login Flow (Checking UaaO Object instead of MongoDB)
        if (UaaODatabase[uid] && UaaODatabase[uid].pass === pass) {
            localStorage.setItem('bookfair_active_user', UaaODatabase[uid].name);
            authForm.reset();
            document.getElementById('password').type = 'password';
            document.getElementById('eye-icon').classList.add('hidden');
            document.getElementById('eye-slash-icon').classList.remove('hidden');
            checkAuthState();
        } else {
            errorBox.innerText = "Invalid User ID or Password.";
            errorBox.classList.remove('hidden');
        }
    }
});

// WIPE DATA ON LOGOUT
function signOut() {
    localStorage.removeItem('bookfair_active_user');
    authForm.reset(); 
    document.getElementById('password').type = 'password';
    document.getElementById('eye-icon').classList.add('hidden');
    document.getElementById('eye-slash-icon').classList.remove('hidden');
    if (currentAuthMode === 'login') toggleAuthMode(); // Reset to default Signup state
    checkAuthState();
}

// --- 2. THEME LOGIC ---
function toggleTheme() {
    const root = document.documentElement;
    const btn = document.getElementById('theme-toggle');
    if (root.getAttribute('data-theme') === 'dark') {
        root.setAttribute('data-theme', 'light');
        btn.innerText = 'Dark Mode';
    } else {
        root.setAttribute('data-theme', 'dark');
        btn.innerText = 'Light Mode';
    }
    updateParticleColors();
}

// --- 3. 3D TILT & SCROLL OBSERVER ---
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('active'); });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const cards = document.querySelectorAll('.tilt-card');
cards.forEach(card => {
    if (window.matchMedia("(hover: none)").matches) return;
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left; const y = e.clientY - rect.top;
        const centerX = rect.width / 2; const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -4; const rotateY = ((x - centerX) / centerX) * 4;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`; });
});

// --- 4. SECURE PARTICLE ENGINE ---
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let pColor, lColor;
let animationFrameId = null;

function updateParticleColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    pColor = isDark ? 'rgba(168, 85, 247, 0.95)' : 'rgba(99, 102, 241, 0.95)';
    lColor = isDark ? '168, 85, 247' : '99, 102, 241';
}

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2.5 + 1;
        this.speedX = (Math.random() - 0.5) * 1.2; this.speedY = (Math.random() - 0.5) * 1.2;
    }
    update() {
        this.x += this.speedX; this.y += this.speedY;
        if (this.x > canvas.width) this.x = 0; if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0; if (this.y < 0) this.y = canvas.height;
    }
    draw() { ctx.fillStyle = pColor; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); }
}

function initParticles() {
    particles = []; updateParticleColors();
    const count = (window.innerWidth || 1000) < 768 ? 45 : 120;
    for (let i = 0; i < count; i++) particles.push(new Particle());
}

function resize() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    initParticles();
}

function drawLines() {
    for (let i = 0; i < particles.length; i++) {
        for (let j = i; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x; const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 130) {
                ctx.strokeStyle = `rgba(${lColor}, ${1 - dist/130})`; ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke();
            }
        }
    }
}

function animate() {
    if (localStorage.getItem('bookfair_active_user')) return; 
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    drawLines();
    animationFrameId = requestAnimationFrame(animate);
}

// --- INITIALIZATION ---
window.addEventListener('resize', () => { if (!localStorage.getItem('bookfair_active_user')) resize(); });
window.addEventListener('load', () => { 
    updateParticleColors(); 
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight;
    checkAuthState(); 
});
