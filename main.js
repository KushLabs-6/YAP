/**
 * YAP Core Application Logic
 * "More than just a chat."
 */

const YAP = {
    // state
    currentScene: 'entrance-scene',
    currentUser: null,

    // initialization
    init() {
        console.log("🚀 YAP Initialized");
        this.bindEvents();
        this.checkAuth();
    },

    bindEvents() {
        // Tab Switching Logic
        const tabs = document.querySelectorAll('.auth-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.updateAuthForm(tab.dataset.tab);
            });
        });

        // Form Submission
        const authForm = document.getElementById('auth-form');
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAuth();
        });
    },

    updateAuthForm(mode) {
        const submitBtn = document.querySelector('#auth-form .cta-button');
        if (mode === 'signup') {
            submitBtn.textContent = 'Create YAP Account';
        } else {
            submitBtn.textContent = 'Enter YAP';
        }
    },

    handleAuth() {
        const identifier = document.getElementById('auth-identifier').value;
        console.log(`🔑 Attempting auth for: ${identifier}`);
        
        // Mock Auth Success
        this.showToast(`Welcome to YAP, ${identifier}!`);
        this.switchScene('chat-scene');
    },

    switchScene(sceneId) {
        document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
        const nextScene = document.getElementById(sceneId);
        if (nextScene) {
            nextScene.classList.add('active');
            this.currentScene = sceneId;
        }
    },

    checkAuth() {
        // Future Firebase integration
    },

    // Expressive Features
    nudge() {
        const body = document.body;
        body.classList.add('nudge-animation');
        
        // Haptic feel via CSS and shaking
        if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]);
        }
        
        setTimeout(() => {
            body.classList.remove('nudge-animation');
        }, 500);
    },

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'yap-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('visible');
            setTimeout(() => {
                toast.classList.remove('visible');
                setTimeout(() => toast.remove(), 400);
            }, 3000);
        }, 100);
    }
};

// Start the app
document.addEventListener('DOMContentLoaded', () => {
    YAP.init();
    window.YAP = YAP; // Make global for UI event handlers
});

export default YAP;
