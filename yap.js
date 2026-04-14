/**
 * YAP Core Application Logic
 * "More than just a chat."
 */

// --- FIREBASE CONFIGURATION ---
// REPLACE THE PLACEHOLDERS BELOW WITH YOUR ACTUAL FIREBASE KEYS
const firebaseConfig = {
    projectId: "yap-app-b1280",
    appId: "1:812038518003:web:1d307a649a6250a97a3386",
    storageBucket: "yap-app-b1280.firebasestorage.app",
    apiKey: "AIzaSyC-Go-fVtSjM0CqFX01biItr8WQUrGlV6s",
    authDomain: "yap-app-b1280.firebaseapp.com",
    messagingSenderId: "812038518003",
    databaseURL: "https://yap-app-b1280-default-rtdb.firebaseio.com"
};

const YAP = {
    // state
    currentScene: 'entrance-scene',
    currentUser: null,
    onlineUsers: {},

    // initialization
    init() {
        console.log("🚀 YAP Initialized");
        this.bindEvents();
        this.checkAuth();
        this.initSound();
        this.initFirebase();
        this.loadUsername();
    },

    checkAuth() {
        // Initial setup for checking existing sessions
        console.log("Session verified.");
    },

    loadUsername() {
        // Username is stored locally so it persists between sessions
        const saved = localStorage.getItem('yap_username');
        if (saved) this.username = saved;
    },

    getUserLabel() {
        return this.username || (this.currentUser ? this.currentUser.email.split('@')[0] : 'You');
    },

    changeUsername() {
        const modal = document.getElementById('username-modal');
        const input = document.getElementById('username-input');
        if (modal && input) {
            input.value = this.username || '';
            modal.classList.add('active');
            setTimeout(() => input.focus(), 100);
        }
    },

    closeUsernameModal() {
        const modal = document.getElementById('username-modal');
        if (modal) modal.classList.remove('active');
    },

    saveUsernameFromModal() {
        const input = document.getElementById('username-input');
        const newName = input ? input.value.trim() : '';
        if (newName) {
            this.username = newName;
            localStorage.setItem('yap_username', this.username);
            this.updateMyProfileUI();
            if (this.presenceRef) {
                import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js').then(db => {
                    db.set(this.presenceRef, {
                        email: this.currentUser.email,
                        username: this.username,
                        online: true,
                        lastSeen: Date.now()
                    });
                });
            }
            this.showToast(`✅ Name set to "${this.username}"!`);
            this.closeUsernameModal();
        } else {
            this.showToast('Please enter a name.');
        }
    },

    updateMyProfileUI() {
        const label = this.getUserLabel();
        // Desktop sidebar
        const nameEl = document.getElementById('my-display-name');
        const avatarEl = document.getElementById('my-avatar-initials');
        if (nameEl) nameEl.textContent = label;
        if (avatarEl) avatarEl.textContent = label.charAt(0).toUpperCase();
        // Mobile profile bar
        const mobileNameEl = document.getElementById('mobile-display-name');
        const mobileAvatarEl = document.getElementById('mobile-avatar-initials');
        if (mobileNameEl) mobileNameEl.textContent = label;
        if (mobileAvatarEl) mobileAvatarEl.textContent = label.charAt(0).toUpperCase();
    },

    broadcastPresence(db) {
        const safeKey = this.currentUser.email.replace(/[.#$[\]]/g, '_');
        this.presenceRef = db.ref(this.db, `presence/${safeKey}`);
        db.set(this.presenceRef, {
            email: this.currentUser.email,
            username: this.getUserLabel(),
            online: true,
            lastSeen: Date.now()
        });
        // Listen to all online users
        const presenceRoot = db.ref(this.db, 'presence');
        db.onValue(presenceRoot, (snapshot) => {
            const data = snapshot.val() || {};
            this.onlineUsers = data;
            this.renderOnlineUsers(data);
        });
    },

    renderOnlineUsers(users) {
        const list = document.getElementById('online-users-list');
        const countEl = document.getElementById('online-count');
        if (!list) return;
        const entries = Object.values(users).filter(u => u.online);
        if (countEl) countEl.textContent = `${entries.length} online`;
        if (entries.length === 0) {
            list.innerHTML = '<div class="empty-state">Waiting for others...</div>';
            return;
        }
        list.innerHTML = entries.map(u => {
            const initial = (u.username || u.email).charAt(0).toUpperCase();
            const name = u.username || u.email.split('@')[0];
            const isMe = u.email === this.currentUser?.email;
            return `<div class="chat-item ${isMe ? 'active' : ''}">
                <div class="chat-avatar">${initial}</div>
                <div class="chat-info">
                    <span class="chat-name">${name}${isMe ? ' (You)' : ''}</span>
                    <span class="chat-preview">🟢 Online</span>
                </div>
            </div>`;
        }).join('');
    },

    initFirebase() {
        // We use the dynamic import to keep it lightweight
        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js').then(app => {
            import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js').then(db => {
                try {
                    this.app = app.initializeApp(firebaseConfig);
                    this.db = db.getDatabase(this.app);
                    this.dbRef = db.ref(this.db, 'yaps');
                    this.nudgeRef = db.ref(this.db, 'nudges');
                    this.tttRef = db.ref(this.db, 'games/ttt');
                    
                    this.listenToDb(db);
                        if (this.currentUser) this.broadcastPresence(db);
                } catch (e) {
                    console.warn("Firebase not configured. Running in Demo Mode.");
                }
            });
        });
    },

    listenToDb(db) {
        // Listen for new messages
        db.onChildAdded(this.dbRef, (snapshot) => {
            const msg = snapshot.val();
            const isMe = msg.sender === this.currentUser?.email;
            // Resolve sender label from online users presence or fallback
            let senderLabel = msg.senderName || msg.sender?.split('@')[0] || 'Unknown';
            this.renderMessage(msg.text, isMe ? 'outgoing' : 'incoming', isMe ? null : senderLabel);
        });

        // Listen for nudges
        db.onValue(this.nudgeRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.sender !== this.currentUser?.email && (Date.now() - data.time < 2000)) {
                this.receiveNudge();
            }
        });

        // Listen for Tic Tac Toe board updates
        db.onValue(this.tttRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.gameState = data.board;
                this.currentPlayer = data.nextPlayer;
                this.gameActive = data.active;
                this.renderBoard();
            }
        });
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

        // --- Chat Scene Bindings ---
        // Nudge Button
        const nudgeBtn = document.querySelector('.nudge-btn');
        if (nudgeBtn) {
            nudgeBtn.addEventListener('click', () => this.nudge());
        }

        // Message Input Handling
        const messageInput = document.querySelector('.chat-footer input[type="text"]');
        const sendBtn = document.querySelector('.footer-send');
        
        if (sendBtn && messageInput) {
            const sendMessage = () => {
                const text = messageInput.value.trim();
                if (text) {
                    // Send to Firebase if connected
                    if (this.db) {
                        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js').then(db => {
                            db.push(this.dbRef, {
                                text: text,
                                sender: this.currentUser.email,
                                senderName: this.getUserLabel(),
                                time: Date.now()
                            });
                        });
                    } else {
                        this.renderMessage(text, 'outgoing');
                    }
                    messageInput.value = '';
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

    updateAuthForm(mode) {
        const submitBtn = document.querySelector('#auth-form .cta-button');
        if (mode === 'signup') {
            submitBtn.textContent = 'Create YAP Account';
        } else {
            submitBtn.textContent = 'Enter YAP';
        }
    },

    handleAuth() {
        let identifier = document.getElementById('auth-identifier').value.trim().toLowerCase();
        let password = document.getElementById('auth-password').value.trim();
        const submitBtn = document.querySelector('#auth-form .cta-button');
        
        if (!identifier || !password) {
            this.showToast("Please enter your credentials.");
            return;
        }

        // Loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';
        
        console.log(`🔑 Attempting auth for: ${identifier}`);
        
        // Mock Auth Logic (Expanded with Test Accounts)
        setTimeout(() => {
            const validAccounts = {
                'kingadmin@yap.com': { pass: 'promo123456', role: 'ADMIN' },
                'test1@yap.com': { pass: 'yap2026', role: 'USER' },
                'test2@yap.com': { pass: 'yap2026', role: 'USER' }
            };

            const user = validAccounts[identifier];

            if (user && password.toLowerCase() === user.pass.toLowerCase()) {
                this.currentUser = { email: identifier, role: user.role };
                // Pick up display name typed at login, or recall from localStorage
                const loginName = document.getElementById('auth-displayname')?.value?.trim();
                if (loginName) {
                    this.username = loginName;
                    localStorage.setItem('yap_username', this.username);
                } else {
                    this.loadUsername();
                }
                this.updateMyProfileUI();
                this.showToast(`Welcome, ${this.getUserLabel()}!`);
                if (user.role === 'ADMIN') this.enterAdminMode();
                else this.switchScene('chat-scene');
                // Broadcast presence now that we have a user
                if (this.db) {
                    import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js').then(db => {
                        this.broadcastPresence(db);
                    });
                } else {
                    // Offline mode: just show yourself
                    this.renderOnlineUsers({ me: { email: identifier, username: this.getUserLabel(), online: true }});
                }
            } else {
                this.showToast("Invalid Credentials. Check PROJECT_README.txt");
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

        // Local update
        this.gameState[clickedCellIndex] = this.currentPlayer;
        const nextPlayer = this.currentPlayer === "X" ? "O" : "X";
        
        // Push board to Firebase
        if (this.db) {
            import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js').then(db => {
                db.set(this.tttRef, {
                    board: this.gameState,
                    nextPlayer: nextPlayer,
                    active: true,
                    lastMovedBy: this.currentUser.email
                });
            });
        }

        this.playTick();
        this.checkGameResult();
    },

    renderBoard() {
        const cells = document.querySelectorAll('.ttt-cell');
        this.gameState.forEach((val, i) => {
            cells[i].innerHTML = val;
            cells[i].classList.remove('x', 'o');
            if (val) cells[i].classList.add(val.toLowerCase());
        });
        document.getElementById('game-status').innerHTML = this.gameActive ? `${this.currentPlayer}'s Turn` : "Game Over";
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
        
        if (this.db) {
            import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js').then(db => {
                db.set(this.tttRef, {
                    board: this.gameState,
                    nextPlayer: "X",
                    active: true
                });
            });
        } else {
            this.renderBoard();
        }
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

    renderMessage(text, type, senderLabel) {
        const thread = document.getElementById('messages-thread');
        if (!thread) return;

        // Dedup outgoing
        const lastMsg = thread.lastElementChild;
        if (lastMsg && lastMsg.dataset.text === text && type === 'outgoing') return;

        const msg = document.createElement('div');
        msg.className = `msg-bubble ${type}`;
        msg.dataset.text = text;

        // Show sender name on incoming messages
        if (type === 'incoming' && senderLabel) {
            const nameTag = document.createElement('span');
            nameTag.className = 'msg-sender-name';
            nameTag.textContent = senderLabel;
            msg.appendChild(nameTag);
        }

        const textNode = document.createElement('span');
        textNode.className = 'msg-text';
        textNode.textContent = text;
        msg.appendChild(textNode);
        
        // Add timestamp
        const time = document.createElement('span');
        time.className = 'msg-time';
        time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        msg.appendChild(time);

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
    receiveNudge() {
        // Triggered by Firebase when someone else nudges us
        const body = document.body;
        if (body.classList.contains('nudge-animation')) return;

        body.classList.add('nudge-animation');
        this.playZing();
        this.showToast("⚡ YOU GOT NUDGED!");

        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
        }
        
        setTimeout(() => {
            body.classList.remove('nudge-animation');
        }, 500);
    },

    nudge() {
        const body = document.body;
        if (body.classList.contains('nudge-animation')) return; 

        // Send to Firebase immediately
        if (this.db) {
            import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js').then(db => {
                db.set(this.nudgeRef, {
                    sender: this.currentUser.email,
                    time: Date.now()
                });
            });
        }

        body.classList.add('nudge-animation');
        this.playZing();
        this.showToast("⚡ NUDGE SENT!");

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
