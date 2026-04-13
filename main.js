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

        // Game Cell Binding
        document.querySelectorAll('.ttt-cell').forEach(cell => {
            cell.addEventListener('click', (e) => this.handleCellClick(e));
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
        const identifier = document.getElementById('auth-identifier').value.trim();
        const password = document.getElementById('auth-password').value;
        const submitBtn = document.querySelector('#auth-form .cta-button');
        
        if (!identifier || !password) {
            this.showToast("Please enter your credentials.");
            return;
        }

        // Loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';
        
        console.log(`🔑 Attempting auth for: ${identifier}`);
        
        // Mock Auth Logic (Admin Check)
        setTimeout(() => {
            if (identifier === 'kingadmin@yap.com' && password === 'promo123456') {
                this.currentUser = { email: identifier, role: 'ADMIN' };
                this.showToast("👑 Welcome back, King Admin!");
                this.enterAdminMode();
            } else {
                this.currentUser = { email: identifier, role: 'USER' };
                this.showToast(`Welcome to YAP, ${identifier}!`);
                this.switchScene('chat-scene');
            }
            
            // Clean up button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enter YAP';
        }, 1200);
    },

    enterAdminMode() {
        this.switchScene('chat-scene');
        document.body.classList.add('admin-mode');
        this.showToast("🛠️ Admin Controls Enabled");
        
        // Add Admin Badge to Header
        const header = document.querySelector('.header-main');
        if (header && !document.querySelector('.admin-badge')) {
            const badge = document.createElement('span');
            badge.className = 'admin-badge';
            badge.textContent = 'ADMIN';
            header.appendChild(badge);
        }
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

        // Media Input Handling
        const mediaInput = document.getElementById('media-input');
        if (mediaInput) {
            mediaInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (re) => {
                        this.addMediaMessage(re.target.result, 'outgoing');
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    },

    toggleWatchModal() {
        const modal = document.getElementById('watch-modal');
        if (modal) modal.classList.toggle('active');
    },

    startWatchSession() {
        const link = document.getElementById('yt-link').value;
        const container = document.getElementById('yt-player-container');
        
        if (link.includes('youtube.com') || link.includes('youtu.be')) {
            const videoId = link.split('v=')[1] || link.split('/').pop();
            container.innerHTML = `<iframe width="100%" height="280" src="https://www.youtube.com/embed/${videoId.split('&')[0]}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="border-radius:12px;"></iframe>`;
            this.showToast("🎬 Session started! Syncing with others...");
        } else {
            this.showToast("Please enter a valid YouTube link.");
        }
    },

    // Mini Games Logic
    toggleGamesModal() {
        const modal = document.getElementById('games-modal');
        if (modal) modal.classList.toggle('active');
        if (modal.classList.contains('active')) this.resetGame();
    },

    gameActive: true,
    currentPlayer: "X",
    gameState: ["", "", "", "", "", "", "", "", ""],

    handleCellClick(clickedCellEvent) {
        const clickedCell = clickedCellEvent.target;
        const clickedCellIndex = parseInt(clickedCell.getAttribute('data-index'));

        if (this.gameState[clickedCellIndex] !== "" || !this.gameActive) return;

        this.gameState[clickedCellIndex] = this.currentPlayer;
        clickedCell.innerHTML = this.currentPlayer;
        clickedCell.classList.add(this.currentPlayer.toLowerCase());
        
        this.playTick();
        this.checkGameResult();
    },

    checkGameResult() {
        const winConditions = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];

        let roundWon = false;
        for (let i = 0; i < 8; i++) {
            const winCondition = winConditions[i];
            let a = this.gameState[winCondition[0]];
            let b = this.gameState[winCondition[1]];
            let c = this.gameState[winCondition[2]];
            if (a === '' || b === '' || c === '') continue;
            if (a === b && b === c) {
                roundWon = true;
                break;
            }
        }

        if (roundWon) {
            document.getElementById('game-status').innerHTML = `Winner: ${this.currentPlayer}!`;
            this.gameActive = false;
            this.showToast(`🏆 ${this.currentPlayer} Won the match!`);
            return;
        }

        let roundDraw = !this.gameState.includes("");
        if (roundDraw) {
            document.getElementById('game-status').innerHTML = "It's a Draw!";
            this.gameActive = false;
            return;
        }

        this.currentPlayer = this.currentPlayer === "X" ? "O" : "X";
        document.getElementById('game-status').innerHTML = `${this.currentPlayer}'s Turn`;
    },

    resetGame() {
        this.gameActive = true;
        this.currentPlayer = "X";
        this.gameState = ["", "", "", "", "", "", "", "", ""];
        document.getElementById('game-status').innerHTML = "X's Turn";
        document.querySelectorAll('.ttt-cell').forEach(cell => {
            cell.innerHTML = "";
            cell.classList.remove('x', 'o');
        });
    },

    playTick() {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.1);
    },

    addMessage(text, type) {
        const thread = document.getElementById('messages-thread');
        if (!thread) return;

        const msg = document.createElement('div');
        msg.className = `msg-bubble ${type}`;
        msg.textContent = text;
        this.animateIn(msg, thread);
    },

    addMediaMessage(src, type) {
        const thread = document.getElementById('messages-thread');
        if (!thread) return;

        const msg = document.createElement('div');
        msg.className = `msg-bubble media-bubble ${type}`;
        
        const img = document.createElement('img');
        img.src = src;
        img.className = 'chat-sent-img';
        
        msg.appendChild(img);
        this.animateIn(msg, thread);
    },

    animateIn(el, container) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        
        container.appendChild(el);
        
        // Trigger entrance animation
        requestAnimationFrame(() => {
            el.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
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
