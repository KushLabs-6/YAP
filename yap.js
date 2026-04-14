/**
 * YAP Core Application Logic
 * "More than just a chat."
 */

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
    currentScene: 'entrance-scene',
    currentUser: null,
    onlineUsers: {},
    authMode: 'login', // login | signup
    currentRoom: 'global', // 'global' or 'private_user1_user2'
    db: null,
    messagesListener: null,

    init() {
        console.log("🚀 YAP Advanced Initialized");
        this.bindEvents();
        this.initSound();
        this.initFirebase();
    },

    bindEvents() {
        // Auth Tabs
        const tabs = document.querySelectorAll('.auth-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.authMode = e.target.dataset.tab;
                
                const nameGroup = document.getElementById('auth-displayname-group');
                const submitBtn = document.querySelector('#auth-form .cta-button');
                
                if (this.authMode === 'signup') {
                    if(nameGroup) nameGroup.style.display = 'block';
                    submitBtn.textContent = 'Create Account';
                } else {
                    if(nameGroup) nameGroup.style.display = 'none';
                    submitBtn.textContent = 'Enter YAP';
                }
            });
        });

        // Auth Form
        const authForm = document.getElementById('auth-form');
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAuth();
            });
        }

        // Nudge
        const nudgeBtn = document.querySelector('.nudge-btn');
        if (nudgeBtn) {
            nudgeBtn.addEventListener('click', () => this.nudge());
        }

        // Message Sending
        const messageInput = document.querySelector('.chat-footer input[type="text"]');
        const sendBtn = document.querySelector('.footer-send');
        if (sendBtn && messageInput) {
            const send = () => {
                const text = messageInput.value.trim();
                if (text && this.db) {
                    import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js').then(db => {
                        const ref = db.ref(this.db, `messages/${this.currentRoom}`);
                        db.push(ref, {
                            text: text,
                            sender: this.currentUser.email,
                            senderName: this.currentUser.username,
                            time: Date.now()
                        });
                    });
                    messageInput.value = '';
                }
            };
            sendBtn.addEventListener('click', send);
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') send();
            });
        }
    },

    initSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            
            // Pre-warm audio on fist interaction
            document.body.addEventListener('click', () => {
                if(this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume();
                }
            }, { once: true });
        } catch(e) {
            console.log('Web Audio API not supported');
        }
    },

    initFirebase() {
        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js').then((app) => {
            const firebaseApp = app.initializeApp(firebaseConfig);
            import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js').then((db) => {
                this.dbConfig = db;
                this.db = db.getDatabase(firebaseApp);
                
                // Set up global nudge listener
                this.nudgeRef = db.ref(this.db, 'nudges');
                db.onChildAdded(this.nudgeRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data && this.currentUser && data.sender !== this.currentUser.email) {
                        // Nudge rules: If it's a global nudge, only admins could send it, but we already validated that before push
                        // However, let's check if the nudge was meant for the global room or private. For now, global nudges everybody.
                        if(data.room === 'global' && this.currentRoom === 'global') {
                            this.receiveNudge();
                        } else if (data.room === this.currentRoom) {
                            this.receiveNudge();
                        }
                    }
                });

                this.checkLocalAuth();
            });
        });
    },

    safeId(email) {
        return email.replace(/[.#$\[\]]/g, "_");
    },
    
    checkLocalAuth() {
        const token = localStorage.getItem('yap_token');
        if (token) {
            const [email, pass] = token.split("::");
            if (email && pass) {
                // Background verify
                this.dbConfig.get(this.dbConfig.ref(this.db, `registered_users/${this.safeId(email)}`)).then((snap) => {
                    const user = snap.val();
                    if(user && user.password === pass) {
                        this.currentUser = { email: user.email, username: user.username, role: user.role, safeId: this.safeId(user.email) };
                        this.finishLogin();
                    }
                });
            }
        }
    },

    handleAuth() {
        const identifier = document.getElementById('auth-identifier').value.trim().toLowerCase();
        let password = document.getElementById('auth-password').value.trim();
        const displayname = document.getElementById('auth-displayname')?.value?.trim();
        const submitBtn = document.querySelector('#auth-form .cta-button');

        if (!identifier || !password) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';

        const safeId = this.safeId(identifier);

        if (this.authMode === 'login') {
            this.dbConfig.get(this.dbConfig.ref(this.db, `registered_users/${safeId}`)).then((snap) => {
                const user = snap.val();
                if (user && user.password === password) {
                    this.currentUser = { email: user.email, username: user.username, role: user.role, safeId: safeId };
                    localStorage.setItem('yap_token', `${user.email}::${user.password}`);
                    this.finishLogin();
                } else {
                    this.showToast('Invalid Email or Password.');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Enter YAP';
                }
            });
        } else {
            // Signup logic
            if(!displayname) {
                this.showToast('Please enter a Unique Username.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';
                return;
            }
            
            const lowerName = displayname.toLowerCase();
            this.dbConfig.get(this.dbConfig.ref(this.db, `usernames/${lowerName}`)).then((snap) => {
                if (snap.exists() && snap.val() !== safeId) {
                    this.showToast('Username already taken!');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Create Account';
                } else {
                    // Check if email already registered
                    this.dbConfig.get(this.dbConfig.ref(this.db, `registered_users/${safeId}`)).then((userSnap) => {
                         if (userSnap.exists()) {
                             this.showToast('This email is already registered. Please Login.');
                             submitBtn.disabled = false;
                             submitBtn.textContent = 'Create Account';
                         } else {
                             // Create user
                             const role = identifier === 'kingadmin@yap.com' ? 'ADMIN' : 'USER';
                             const newUser = { email: identifier, password: password, username: displayname, role: role };
                             
                             this.dbConfig.set(this.dbConfig.ref(this.db, `registered_users/${safeId}`), newUser);
                             this.dbConfig.set(this.dbConfig.ref(this.db, `usernames/${lowerName}`), safeId);
                             
                             this.currentUser = { email: identifier, username: displayname, role: role, safeId: safeId };
                             localStorage.setItem('yap_token', `${identifier}::${password}`);
                             this.finishLogin();
                         }
                    });
                }
            });
        }
    },

    finishLogin() {
        this.updateProfileUI();
        this.switchScene('chat-scene');
        this.broadcastPresence();
        this.switchRoom('global', 'Global YAP Room');
    },

    updateProfileUI() {
        const label = this.currentUser.username;
        const nameEl = document.getElementById('my-display-name');
        const avatarEl = document.getElementById('my-avatar-initials');
        if (nameEl) nameEl.textContent = label;
        if (avatarEl) avatarEl.textContent = label.charAt(0).toUpperCase();

        const titleText = document.querySelector('.chat-header-titles h2');
        if(titleText) titleText.textContent = this.currentRoom === 'global' ? 'Global YAP Room' : 'Private YAP';
    },

    broadcastPresence() {
        if(!this.db || !this.currentUser) return;
        this.presenceRef = this.dbConfig.ref(this.db, `presence/${this.currentUser.safeId}`);
        this.dbConfig.onDisconnect(this.presenceRef).remove();
        this.dbConfig.set(this.presenceRef, {
            email: this.currentUser.email,
            username: this.currentUser.username,
            safeId: this.currentUser.safeId,
            online: true,
            lastSeen: Date.now()
        });

        // Listen for all users
        this.dbConfig.onValue(this.dbConfig.ref(this.db, 'presence'), (snap) => {
            this.onlineUsers = snap.val() || {};
            this.renderOnlineUsers();
        });
    },

    renderOnlineUsers() {
        const dList = document.getElementById('active-users-list');
        const mList = document.getElementById('mobile-active-users-list');
        const deskCount = document.getElementById('online-count');
        const mobCount = document.getElementById('mobile-directory-count');
        
        if (dList) dList.innerHTML = '';
        if (mList) mList.innerHTML = '';

        let count = 0;
        Object.keys(this.onlineUsers).forEach(key => {
            const user = this.onlineUsers[key];
            if (!user.online) return;
            count++;
            
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
                <div class="user-info">
                    <span class="user-name">${user.username}</span>
                    <span class="user-status">Online</span>
                </div>
            `;
            
            // Allow starting private chat
            if(user.safeId !== this.currentUser.safeId) {
                 li.onclick = () => this.startPrivateChat(user);
            } else {
                 li.style.cursor = 'default';
                 li.querySelector('.user-name').textContent = user.username + " (You)";
            }

            if(dList) dList.appendChild(li.cloneNode(true));
            if(mList) mList.appendChild(li); // actual element goes to one, clone to other. Fix:
        });
        
        // Fix for attaching event listeners to both desktop and mobile lists
        [dList, mList].forEach(list => {
             if(list) {
                 list.innerHTML = ''; // reset again
                 Object.keys(this.onlineUsers).forEach(key => {
                     const user = this.onlineUsers[key];
                     if (!user.online) return;
                     const li = document.createElement('li');
                     li.innerHTML = `
                        <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
                        <div class="user-info">
                            <span class="user-name">${user.username} ${user.safeId === this.currentUser.safeId ? '(You)' : ''}</span>
                            <span class="user-status">Online</span>
                        </div>
                    `;
                     if(user.safeId !== this.currentUser.safeId) {
                         li.onclick = () => {
                             this.toggleMobileDirectory(false); // close modal if open
                             this.startPrivateChat(user);
                         };
                     } else {
                         li.style.cursor = 'default';
                     }
                     list.appendChild(li);
                 });
             }
        });

        if (deskCount) deskCount.textContent = count;
        if (mobCount) mobCount.textContent = `🟢 ${count} Online`;
    },

    startPrivateChat(targetUser) {
        // Create unique room id by sorting safeIds
        const ids = [this.currentUser.safeId, targetUser.safeId].sort();
        const roomId = `private_${ids[0]}_${ids[1]}`;
        const roomName = `Chat with ${targetUser.username}`;
        this.switchRoom(roomId, roomName);
        this.updatePrivateChatsList(targetUser);
    },

    updatePrivateChatsList(targetUser) {
         // Optionally maintain a persistent list of private chats in Firebase for the user
         // For now, temporarily add it to UI
         const dChat = document.getElementById('private-chats-list');
         const mChat = document.getElementById('mobile-private-chats-list');
         const removeEmpty = (l) => { if(l.querySelector('.empty-state-list')) l.innerHTML = ''; }
         if(dChat) removeEmpty(dChat);
         if(mChat) removeEmpty(mChat);
         
         const liHTML = `
            <div class="user-avatar" style="background:var(--yap-accent)">${targetUser.username.charAt(0).toUpperCase()}</div>
            <div class="user-info">
                <span class="user-name">${targetUser.username}</span>
            </div>
         `;
         [dChat, mChat].forEach(list => {
             if(list) {
                 // Prevent duplicates in UI
                 let exists = false;
                 list.querySelectorAll('.user-name').forEach(n => { if(n.textContent === targetUser.username) exists = true; });
                 if(!exists) {
                     const li = document.createElement('li');
                     li.innerHTML = liHTML;
                     li.onclick = () => {
                          this.toggleMobileDirectory(false);
                          this.startPrivateChat(targetUser);
                     };
                     list.appendChild(li);
                 }
             }
         });
    },

    switchRoom(roomId, roomName) {
        this.currentRoom = roomId;
        const deskHeader = document.querySelector('.chat-header-titles h2');
        const mobHeader = document.getElementById('mobile-room-name');
        if(deskHeader) deskHeader.textContent = roomName;
        if(mobHeader) mobHeader.textContent = roomName;

        const thread = document.getElementById('messages-thread');
        if(thread) thread.innerHTML = '';

        if(this.messagesListener && this.dbListenerRef) {
            this.dbConfig.off(this.dbListenerRef, 'child_added', this.messagesListener);
        }

        this.dbListenerRef = this.dbConfig.ref(this.db, `messages/${this.currentRoom}`);
        // Fetch last 50
        const query = this.dbConfig.query(this.dbListenerRef, this.dbConfig.limitToLast(50));
        
        let initialLoad = true;
        this.dbConfig.get(query).then((snap) => {
            const msgs = snap.val();
            if(msgs) {
                Object.values(msgs).forEach(msg => {
                    const type = msg.sender === this.currentUser.email ? 'outgoing' : 'incoming';
                    this.renderMessage(msg.text, type, msg.senderName, msg.time);
                });
            }
            // Listen for new
            this.messagesListener = this.dbConfig.onChildAdded(query, (childSnap) => {
                if(!initialLoad) {
                    const msg = childSnap.val();
                    const type = msg.sender === this.currentUser.email ? 'outgoing' : 'incoming';
                    this.renderMessage(msg.text, type, msg.senderName, msg.time);
                    if(type === 'incoming') this.playTick();
                }
            });
            initialLoad = false;
        });
    },

    toggleMobileDirectory(forceClose = false) {
        const modal = document.getElementById('mobile-directory-modal');
        if(!modal) return;
        if(forceClose) {
            modal.style.display = 'none';
        } else {
            modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
        }
    },

    switchScene(sceneId) {
        document.querySelectorAll('.scene').forEach(el => el.classList.remove('active'));
        document.getElementById(sceneId).classList.add('active');
        this.currentScene = sceneId;
    },

    nudge() {
        const body = document.body;
        if (body.classList.contains('nudge-animation')) return; 

        if (this.currentRoom === 'global' && this.currentUser.role !== 'ADMIN') {
            this.showToast("Only Admins can nudge everyone in the Global Room!");
            return;
        }

        if (this.db) {
            const nudgeId = Date.now().toString();
            this.dbConfig.set(this.dbConfig.ref(this.db, `nudges/${nudgeId}`), {
                sender: this.currentUser.email,
                room: this.currentRoom,
                time: Date.now()
            });
        }

        body.classList.add('nudge-animation');
        this.playZing();
        this.showToast("⚡ NUDGE SENT!");

        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
        setTimeout(() => body.classList.remove('nudge-animation'), 500);
    },

    receiveNudge() {
        const body = document.body;
        if (body.classList.contains('nudge-animation')) return;
        body.classList.add('nudge-animation');
        this.playZing();
        this.showToast("⚡ YOU GOT NUDGED!");
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
        setTimeout(() => body.classList.remove('nudge-animation'), 500);
    },

    playTick() {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.1);
    },
    
    playZing() {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.3);
    },

    renderMessage(text, type, senderLabel, time) {
        const thread = document.getElementById('messages-thread');
        if (!thread) return;
        
        // Prevent dupe visual on initial load
        if(thread.lastElementChild && thread.lastElementChild.dataset.time == time) return;

        const msg = document.createElement('div');
        msg.className = \`msg-bubble \${type}\`;
        msg.dataset.time = time;
        
        if (type === 'incoming' && senderLabel) {
             const nameTag = document.createElement('span');
             nameTag.className = 'msg-sender-name';
             nameTag.textContent = senderLabel;
             msg.appendChild(nameTag);
        }
        
        const txt = document.createElement('span');
        txt.className = 'msg-text';
        txt.textContent = text;
        msg.appendChild(txt);
        
        const timeEl = document.createElement('span');
        timeEl.className = 'msg-time';
        const d = time ? new Date(time) : new Date();
        timeEl.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        msg.appendChild(timeEl);

        msg.style.opacity = '0';
        msg.style.transform = 'translateY(20px)';
        thread.appendChild(msg);
        
        requestAnimationFrame(() => {
            msg.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            msg.style.opacity = '1';
            msg.style.transform = 'translateY(0)';
        });
        thread.scrollTop = thread.scrollHeight;
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

document.addEventListener('DOMContentLoaded', () => {
    YAP.init();
    window.YAP = YAP;
});

export default YAP;
