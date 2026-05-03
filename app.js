// --- BACKEND CONNECTION ---
const SERVER_URL = "https://bookfair-server.onrender.com";

// --- STRIPE SECURE PAYMENT INITIALIZATION ---
const stripe = Stripe('pk_test_TYooMQauvdEDq54NiTphI7jx'); 
const elements = stripe.elements();

const elementStyles = {
    base: {
        iconColor: '#6366f1',
        color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#f8fafc' : '#0f172a',
        fontFamily: '"Exo 2", sans-serif',
        fontSize: '16px',
        '::placeholder': { color: '#aab7c4' }
    },
    invalid: { color: '#ff4757', iconColor: '#ff4757' }
};

const cardNumber = elements.create('cardNumber', { style: elementStyles });
const cardExpiry = elements.create('cardExpiry', { style: elementStyles });
const cardCvc = elements.create('cardCvc', { style: elementStyles });

// --- 1. STATE ROUTER & AUTHENTICATION ---
const vLanding = document.getElementById('view-landing');
const vAuth = document.getElementById('view-auth');
const vDashboard = document.getElementById('view-dashboard');
const btnNavAuth = document.getElementById('nav-auth-btn');
const btnLogout = document.getElementById('nav-logout-btn');
const btnProfile = document.getElementById('nav-profile-avatar');
const authForm = document.getElementById('auth-form');

const isProfilePage = document.getElementById('profile-page-marker') !== null;
const isIndexPage = vLanding !== null;

let currentAuthMode = 'signup'; 
let currentPayMethod = 'card'; 

function checkAuthState() {
    // We now store the entire User Object stringified!
    const activeUserData = localStorage.getItem('bookfair_user_data');
    
    if (activeUserData) {
        const user = JSON.parse(activeUserData);
        
        // Universal Nav Updates
        if (btnNavAuth) btnNavAuth.classList.add('hidden');
        if (btnLogout) btnLogout.classList.remove('hidden');
        if (btnProfile) btnProfile.classList.remove('hidden');

        if (isIndexPage) {
            const firstName = user.fullname.split(' ')[0];
            document.getElementById('dash-greeting').innerText = `Welcome back, ${firstName}.`;

            vLanding.classList.add('hidden');
            vAuth.classList.add('hidden');
            vDashboard.classList.remove('hidden');
            
            canvas.style.display = 'none';
            if(animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
        }

        if (isProfilePage) {
            // Populate the Profile HTML
            document.getElementById('prof-fullname').innerText = user.fullname;
            document.getElementById('prof-userid').innerText = `@${user.userid}`;
            document.getElementById('prof-wallet').innerText = `₹${user.wallet ? user.wallet.toFixed(2) : '0.00'}`;
            document.getElementById('prof-email').innerText = user.email || 'Not provided';
            document.getElementById('prof-phone').innerText = user.phone || 'Not provided';
            document.getElementById('prof-payment').innerText = user.paymentMethod || 'None';

            if (user.address && user.address.line1) {
                document.getElementById('prof-address').innerText = `${user.address.line1}, ${user.address.city}, ${user.address.state} ${user.address.zip}`;
            } else {
                document.getElementById('prof-address').innerText = 'Not provided';
            }
        }

    } else {
        // NOT LOGGED IN
        if (isProfilePage) {
            // Security kickout - prevent viewing profile without login
            window.location.href = 'index.html';
            return;
        }

        if (isIndexPage) {
            vDashboard.classList.add('hidden');
            vAuth.classList.add('hidden');
            btnLogout.classList.add('hidden');
            if (btnProfile) btnProfile.classList.add('hidden');
            vLanding.classList.remove('hidden');
            btnNavAuth.classList.remove('hidden');
            
            canvas.style.display = 'block';
            resize();
            if (!animationFrameId) animate();
        }
    }
}

function showAuth(mode) {
    if (isIndexPage) {
        vLanding.classList.add('hidden');
        vAuth.classList.remove('hidden');
        btnNavAuth.classList.add('hidden');
        if(mode && mode !== currentAuthMode) toggleAuthMode();
    }
}

function showLanding() {
    if (authForm) {
        authForm.reset(); 
        document.getElementById('auth-error').classList.add('hidden');
        document.getElementById('password').type = 'password'; 
        document.getElementById('eye-icon').classList.add('hidden');
        document.getElementById('eye-slash-icon').classList.remove('hidden');
        cardNumber.clear(); cardExpiry.clear(); cardCvc.clear();
        turnstile.reset();
    }
    checkAuthState();
}

function toggleAuthMode() {
    if (!authForm) return;

    const title = document.getElementById('auth-title');
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleLink = document.getElementById('auth-toggle-link');
    const signupOnlyFields = document.querySelectorAll('.signup-only');
    const signupInputIds = ['fullname', 'email', 'phone']; 

    authForm.reset();
    document.getElementById('auth-error').classList.add('hidden');
    document.getElementById('password').type = 'password'; 
    document.getElementById('eye-icon').classList.add('hidden');
    document.getElementById('eye-slash-icon').classList.remove('hidden');
    cardNumber.clear(); cardExpiry.clear(); cardCvc.clear();

    if (currentAuthMode === 'signup') {
        currentAuthMode = 'login';
        title.innerText = 'Welcome Back';
        submitBtn.innerText = 'Log In';
        toggleLink.innerText = "Don't have an account? Sign Up";
        signupOnlyFields.forEach(el => el.classList.add('hidden'));
        signupInputIds.forEach(id => document.getElementById(id).removeAttribute('required'));
    } else {
        currentAuthMode = 'signup';
        title.innerText = 'Create Account';
        submitBtn.innerText = 'Sign Up';
        toggleLink.innerText = "Already have an account? Log In";
        signupOnlyFields.forEach(el => el.classList.remove('hidden'));
        signupInputIds.forEach(id => document.getElementById(id).setAttribute('required', 'true'));
        turnstile.reset();
    }
}

// --- PAYMENT METHOD TOGGLE LOGIC ---
const payTabs = document.querySelectorAll('.pay-tab');
if (payTabs.length > 0) {
    const paySections = {
        card: document.getElementById('pay-card'),
        upi: document.getElementById('pay-upi'),
        netbanking: document.getElementById('pay-netbanking')
    };

    payTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            payTabs.forEach(t => t.classList.remove('active'));
            Object.values(paySections).forEach(s => s.classList.add('hidden'));
            this.classList.add('active');
            currentPayMethod = this.querySelector('input').value;
            paySections[currentPayMethod].classList.remove('hidden');
        });
    });
}

// --- OAUTH LOGIC SIMULATOR ---
function triggerOAuth(provider) {
    const errorBox = document.getElementById('auth-error');
    errorBox.style.color = "var(--primary)";
    errorBox.classList.remove('hidden');
    errorBox.innerText = `Requesting secure token from ${provider}...`;
    
    setTimeout(() => {
        errorBox.innerText = `Verifying ${provider} credentials...`;
        setTimeout(() => {
            const mockUser = {
                userid: `${provider.toLowerCase()}_user`,
                fullname: `${provider} User`,
                email: `user@${provider.toLowerCase()}.com`,
                phone: "Linked",
                paymentMethod: "Linked Provider",
                wallet: 500
            };
            localStorage.setItem('bookfair_user_data', JSON.stringify(mockUser));
            errorBox.style.color = "var(--error)"; 
            showLanding();
        }, 1000);
    }, 1000);
}

// --- PASSWORD VISIBILITY TOGGLE ---
const togglePasswordBtn = document.getElementById('toggle-password');
if (togglePasswordBtn) {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eye-icon');
    const eyeSlashIcon = document.getElementById('eye-slash-icon');

    togglePasswordBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        if (isPassword) {
            eyeIcon.classList.remove('hidden');
            eyeSlashIcon.classList.add('hidden');
        } else {
            eyeIcon.classList.add('hidden');
            eyeSlashIcon.classList.remove('hidden');
        }
    });
}

// --- LIVE BACKEND FETCH LOGIC ---
if (authForm) {
    authForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const uid = document.getElementById('userid').value.trim();
        const pass = document.getElementById('password').value;
        const errorBox = document.getElementById('auth-error');
        const submitBtn = document.getElementById('auth-submit-btn');
        errorBox.style.color = "var(--error)"; 

        if (currentAuthMode === 'signup') {
            const fname = document.getElementById('fullname').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            
            const locationData = {
                line1: document.getElementById('address1').value.trim(),
                line2: document.getElementById('address2').value.trim(),
                city: document.getElementById('city').value.trim(),
                state: document.getElementById('state').value.trim(),
                zip: document.getElementById('zip').value.trim()
            };
            
            const captchaToken = turnstile.getResponse();
            if (captchaToken === "") {
                errorBox.innerText = "Please complete the security check.";
                errorBox.classList.remove('hidden');
                return; 
            }

            submitBtn.innerText = "Encrypting..."; 
            submitBtn.disabled = true;

            const executeServerSignup = async (secureToken) => {
                try {
                    const response = await fetch(`${SERVER_URL}/api/signup`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userid: uid, password: pass, fullname: fname, email: email,
                            phone: phone, address: locationData, paymentMethod: currentPayMethod,
                            paymentToken: secureToken, captchaToken: captchaToken
                        })
                    });

                    const data = await response.json();

                    if (data.success) {
                        // Store the ENTIRE user object returned by the server
                        localStorage.setItem('bookfair_user_data', JSON.stringify(data.user));
                        authForm.reset();
                        cardNumber.clear(); cardExpiry.clear(); cardCvc.clear();
                        turnstile.reset();
                        checkAuthState();
                    } else {
                        errorBox.innerText = data.message;
                        errorBox.classList.remove('hidden');
                        turnstile.reset();
                    }
                } catch (error) {
                    errorBox.innerText = "Could not connect to the Bookfair server.";
                    errorBox.classList.remove('hidden');
                    turnstile.reset();
                } finally {
                    submitBtn.innerText = "Sign Up";
                    submitBtn.disabled = false;
                }
            };

            if (currentPayMethod === 'card') {
                stripe.createToken(cardNumber, {
                    name: fname, address_line1: locationData.line1, address_line2: locationData.line2,
                    address_city: locationData.city, address_state: locationData.state, address_zip: locationData.zip
                }).then(function(result) {
                    if (result.error) {
                        errorBox.innerText = result.error.message;
                        errorBox.classList.remove('hidden');
                        submitBtn.innerText = "Sign Up";
                        submitBtn.disabled = false;
                        turnstile.reset();
                    } else { executeServerSignup(result.token.id); }
                });
            } else if (currentPayMethod === 'upi') {
                const upiId = document.getElementById('upi-id').value.trim();
                if(!upiId.includes('@')) {
                    errorBox.innerText = "Please enter a valid UPI ID (e.g. name@bank)";
                    errorBox.classList.remove('hidden');
                    submitBtn.innerText = "Sign Up";
                    submitBtn.disabled = false;
                    turnstile.reset();
                    return;
                }
                executeServerSignup(`tok_upi_${btoa(upiId).substring(0,10)}`);
            } else if (currentPayMethod === 'netbanking') {
                const bank = document.getElementById('bank-select').value;
                if(!bank) {
                    errorBox.innerText = "Please select a bank for NetBanking.";
                    errorBox.classList.remove('hidden');
                    submitBtn.innerText = "Sign Up";
                    submitBtn.disabled = false;
                    turnstile.reset();
                    return;
                }
                executeServerSignup(`tok_netbank_${bank}`);
            }

        } else {
            // LOGIN LOGIC
            submitBtn.innerText = "Authenticating...";
            submitBtn.disabled = true;

            try {
                const response = await fetch(`${SERVER_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userid: uid, password: pass })
                });
                const data = await response.json();

                if (data.success) {
                    // Store the ENTIRE user object returned by the server
                    localStorage.setItem('bookfair_user_data', JSON.stringify(data.user));
                    authForm.reset();
                    document.getElementById('password').type = 'password';
                    document.getElementById('eye-icon').classList.add('hidden');
                    document.getElementById('eye-slash-icon').classList.remove('hidden');
                    checkAuthState();
                } else {
                    errorBox.innerText = data.message;
                    errorBox.classList.remove('hidden');
                }
            } catch (error) {
                errorBox.innerText = "Could not connect to the Bookfair server.";
                errorBox.classList.remove('hidden');
            } finally {
                submitBtn.innerText = "Log In";
                submitBtn.disabled = false;
            }
        }
    });
}

function signOut() {
    localStorage.removeItem('bookfair_user_data');
    
    if (authForm) {
        authForm.reset(); 
        document.getElementById('password').type = 'password';
        document.getElementById('eye-icon').classList.add('hidden');
        document.getElementById('eye-slash-icon').classList.remove('hidden');
        cardNumber.clear(); cardExpiry.clear(); cardCvc.clear();
    }
    
    if (isProfilePage) {
        window.location.href = 'index.html'; // Redirect to index if logging out from profile
    } else {
        if (currentAuthMode === 'login') toggleAuthMode(); 
        checkAuthState();
    }
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
    
    if (document.getElementById('card-number')) {
        const isDark = root.getAttribute('data-theme') === 'dark';
        const newStyle = { style: { base: { color: isDark ? '#f8fafc' : '#0f172a' } } };
        cardNumber.update(newStyle);
        cardExpiry.update(newStyle);
        cardCvc.update(newStyle);
    }
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
let ctx;
if (canvas) ctx = canvas.getContext('2d');
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
    if (!canvas) return;
    particles = []; updateParticleColors();
    const count = (window.innerWidth || 1000) < 768 ? 45 : 120;
    for (let i = 0; i < count; i++) particles.push(new Particle());
}

function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    initParticles();
}

function drawLines() {
    if (!canvas) return;
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
    if (!canvas || localStorage.getItem('bookfair_user_data')) return; 
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    drawLines();
    animationFrameId = requestAnimationFrame(animate);
}

// --- INITIALIZATION ---
window.addEventListener('resize', () => { if (!localStorage.getItem('bookfair_user_data')) resize(); });
window.addEventListener('load', () => { 
    updateParticleColors(); 
    if (canvas) {
        canvas.width = window.innerWidth; 
        canvas.height = window.innerHeight;
    }
    checkAuthState(); 
    
    if (document.getElementById('card-number')) {
        cardNumber.mount('#card-number');
        cardExpiry.mount('#card-expiry');
        cardCvc.mount('#card-cvc');
    }
});
