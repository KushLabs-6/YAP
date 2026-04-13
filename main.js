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
        this.initSound();
    },

    initSound() {
        // Create an audio context for high-tech synthesized alerts
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    },

    playZing() {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, this.audioCtx.currentTime + 0.3);
        
        gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.3);
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
        const submitBtn = document.querySelector('#auth-form .cta-button');
        
        if (!identifier) {
            this.showToast("Please enter a phone or email.");
            return;
        }

        // Loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';
        
        console.log(`🔑 Attempting auth for: ${identifier}`);
        
        // Mock Auth Success Delay
        setTimeout(() => {
            this.showToast(`Welcome to YAP, ${identifier}!`);
            this.switchScene('chat-scene');
            
            // Clean up button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enter YAP';
        }, 1200);
    },

    switchScene(sceneId) {
        document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
        const nextScene = document.getElementById(sceneId);
        if (nextScene) {
            nextScene.classList.add('active');
            this.currentScene = sceneId;
        }
    },

        // Nudge Button
        const nudgeBtn = document.querySelector('.nudge-btn');
        if (nudgeBtn) {
            nudgeBtn.addEventListener('click', () => this.nudge());
        }

        // Message Input Handling
        const messageInput = document.querySelector('.chat-footer input');
        const sendBtn = document.querySelector('.footer-send');
        
        if (sendBtn && messageInput) {
            const sendMessage = () => {
                const text = messageInput.value.trim();
                if (text) {
                    this.addMessage(text, 'outgoing');
                    messageInput.value = '';
                    
                    // Mock reply delay
                    setTimeout(() => {
                        this.addMessage("That's deep. Let's YAP more about it.", 'incoming');
                    }, 1500);
                }
            };

            sendBtn.addEventListener('click', sendMessage);
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') sendMessage();
            });
        }
    },

    addMessage(text, type) {
        const thread = document.getElementById('messages-thread');
        if (!thread) return;

        const msg = document.createElement('div');
        msg.className = `msg-bubble ${type}`;
        msg.textContent = text;
        msg.style.opacity = '0';
        msg.style.transform = 'translateY(20px)';
        
        thread.appendChild(msg);
        
        // Trigger entrance animation
        requestAnimationFrame(() => {
            msg.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            msg.style.opacity = '1';
            msg.style.transform = 'translateY(0)';
        });

        // Scroll to bottom
        thread.scrollTop = thread.scrollHeight;
    },

    // Expressive Features
    nudge() {
        const body = document.body;
        if (body.classList.contains('nudge-animation')) return; // Cooldown (mindful of spam)

        body.classList.add('nudge-animation');
        this.playZing();
        this.showToast("⚡ NUDGE SENT!");

        // Haptic feel
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
