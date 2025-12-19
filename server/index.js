/**
 * Duduk Sebentar - Server
 * Node.js + Express + Socket.io + WebRTC Signaling
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// ==================== Room Management ====================
const rooms = new Map();

// Question cards for the game - 30 pertanyaan mendalam tentang hubungan
const questionCards = [
    // Level 1 – Ringan & Reflektif
    { id: 1, question: "Apa arti kata \"Maaf\" bagi kamu?", category: "reflection" },
    { id: 2, question: "Apa satu hal yang aku lakukan yang membuatmu merasa paling dicintai, tapi jarang kamu ungkapkan?", category: "love-language" },
    { id: 3, question: "Hal kecil apa yang aku lakukan tapi sebenarnya berarti banyak bagi kamu?", category: "appreciation" },
    { id: 4, question: "Selama bersama, apakah ada momen di mana aku tidak mendengarkan ucapan dan ceritamu?", category: "listening" },
    { id: 5, question: "Bagaimana cara kamu menilai kalau aku benar-benar mendengar perasaanmu?", category: "communication" },
    
    // Level 2 – Reflektif & Emosional
    { id: 6, question: "Topik apa yang paling kamu takutin buat diomongin ke aku dan kenapa?", category: "fear" },
    { id: 7, question: "Apakah aku pernah menyakiti kamu saat marah?", category: "conflict" },
    { id: 8, question: "Apakah ada keputusan atau tindakan yang kamu ambil karena memikirkan aku, walau itu berat bagi dirimu sendiri?", category: "sacrifice" },
    { id: 9, question: "Jika kita bisa mengulang satu momen penting dalam hubungan ini, momen apa yang ingin kamu ulang dan kenapa?", category: "memories" },
    { id: 10, question: "Hal apa yang ingin kamu pelajari atau pahami tentang aku tapi belum berani bertanya?", category: "curiosity" },
    { id: 11, question: "Apakah ada bagian dari dirimu yang paling pribadi tapi belum pernah kamu bagi padaku?", category: "vulnerability" },
    { id: 12, question: "Pernah nggak kamu merasa dilema antara kebahagiaan pribadi dan kebahagiaan hubungan kita?", category: "balance" },
    
    // Level 3 – Sulit & Berisiko Tinggi
    { id: 13, question: "Ada nggak mimpi yang kamu relain karena aku? Kalau ada, apakah sekarang masih mau capai mimpi itu?", category: "dreams" },
    { id: 14, question: "Apakah ada harapan atau impianmu yang sengaja kamu tahan karena takut aku menilai atau kecewa?", category: "expectations" },
    { id: 15, question: "Dalam hubungan ini, adakah momen yang membuat kamu hampir menyerah? Lalu, apa yang membuat kamu tetap bertahan bersamaku?", category: "commitment" },
    { id: 16, question: "Apa satu hal yang paling kamu sesali tidak pernah kamu ceritakan atau lakukan dalam hubungan ini?", category: "regret" },
    { id: 17, question: "Apakah ada sesuatu yang ingin kamu katakan padaku tapi takut bisa merusak hubungan kita?", category: "honesty" },
    { id: 18, question: "Apakah ada bagian dari cinta atau kasih sayangmu yang belum pernah aku lihat atau kamu tunjukkan karena takut tidak diterima?", category: "acceptance" },
    { id: 19, question: "Bagaimana perasaanmu ketika aku diam atau nggak merespons saat kamu sedang butuh dukungan emosional?", category: "support" },
    { id: 20, question: "Apa bagian dari masa lalumu yang paling memengaruhi cara kamu mencintai sekarang, dan bagaimana itu muncul dalam hubungan kita?", category: "past" },
    { id: 21, question: "Apakah ada ketakutan tentang dirimu sendiri yang membuatmu sulit terbuka padaku sepenuhnya?", category: "fear" },
    { id: 22, question: "Apa satu hal yang menurutmu paling sulit dari memahami aku sepenuhnya, tapi ingin kamu pelajari?", category: "understanding" },
    { id: 23, question: "Hal apa yang paling kamu takutkan akan hilang dari hubungan kita jika aku berubah atau berbeda suatu hari nanti?", category: "change" },
    { id: 24, question: "Apakah ada momen ketika kamu merasa aku gagal memahami rasa sakit atau kekecewaanmu?", category: "pain" },
    { id: 25, question: "Dalam hubungan ini, kapan kamu merasa paling rentan tapi tetap memilih bertahan?", category: "resilience" },
    { id: 26, question: "Jika suatu hari kita harus menghadapi konflik besar, apa yang paling kamu takutkan akan hilang dari hubungan ini?", category: "future-conflict" },
    { id: 27, question: "Jika cinta kita digambarkan sebagai sebuah tempat atau dunia, seperti apa tempat itu menurutmu?", category: "love-vision" },
    { id: 28, question: "Hal apa yang paling ingin kamu pertahankan selamanya dalam hubungan ini?", category: "preservation" },
    { id: 29, question: "Apa ketakutan terbesarmu tentang masa depan kita bersama?", category: "future" },
    { id: 30, question: "Setelah semua suka, duka, dan konflik yang kita alami, apa arti cinta sejati menurutmu sekarang?", category: "meaning" }
];

/**
 * Generate a unique room code
 * Menghasilkan kode room yang DIJAMIN UNIK (tidak sama dengan room lain yang aktif)
 * - 6 karakter random dari 33 kemungkinan karakter
 * - Total kombinasi: 33^6 = 1,291,467,969 kemungkinan kode
 * - Loop akan terus generate sampai dapat kode yang belum dipakai
 * - Ada safety limit 100 percobaan untuk menghindari infinite loop
 */
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const MAX_RETRIES = 100;
    let attempts = 0;
    let code;
    
    do {
        code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        attempts++;
        
        // Safety check: jika sudah 100x percobaan masih belum dapat kode unik
        // (sangat tidak mungkin terjadi kecuali ada jutaan room aktif)
        if (attempts >= MAX_RETRIES) {
            console.error(`⚠️ WARNING: Failed to generate unique room code after ${MAX_RETRIES} attempts`);
            console.error(`Active rooms: ${rooms.size}`);
            throw new Error('Gagal membuat kode room unik. Server terlalu penuh.');
        }
        
    } while (rooms.has(code)); // Loop terus sampai dapat kode yang BELUM ada di Map
    
    console.log(`✅ Generated unique room code: ${code} (attempts: ${attempts})`);
    return code;
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Select random questions for a game session
 * Returns 16 random questions from the pool of 30
 */
function selectRandomQuestions() {
    const shuffled = shuffleArray(questionCards);
    return shuffled.slice(0, 16); // Ambil 16 pertanyaan pertama dari yang sudah di-shuffle
}

/**
 * Create a new room
 */
function createRoom(roomName, hostName, hostSocketId, hostUserId) {
    const code = generateRoomCode();
    
    // Double-check: Pastikan code benar-benar belum ada (extra safety)
    if (rooms.has(code)) {
        console.error(`🚨 CRITICAL: Room code ${code} already exists! This should never happen!`);
        throw new Error('Duplikat room code terdeteksi');
    }
    
    const room = {
        code,
        name: roomName,
        host: {
            socketId: hostSocketId,
            name: hostName,
            userId: hostUserId,
            ready: false
        },
        guest: null,
        gameState: {
            started: false,
            currentTurn: null, // 'host' or 'guest'
            currentCardIndex: 0,
            cards: selectRandomQuestions(), // 16 pertanyaan random dari 30
            responses: [], // { cardId, asker, responder, liked }
            totalRounds: 16 // 16 pertanyaan per sesi
        },
        createdAt: Date.now(),
        autoDeleteTimer: null
    };
    
    rooms.set(code, room);

    // Auto-delete room after 1 minute if no guest joins
    room.autoDeleteTimer = setTimeout(() => {
        const currentRoom = rooms.get(code);
        console.log(`⏰ Auto-delete timer triggered for room: ${code}`);
        console.log(`   - Room exists: ${!!currentRoom}`);
        console.log(`   - Has guest: ${!!currentRoom?.guest}`);
        
        if (currentRoom && !currentRoom.guest) {
            // Notify host
            if (currentRoom.host.socketId) {
                console.log(`   - Notifying host: ${currentRoom.host.socketId}`);
                io.to(currentRoom.host.socketId).emit('room-closed', {
                    message: 'Room ditutup karena tidak ada yang join dalam 1 menit.'
                });
            }
            rooms.delete(code);
            console.log(`🗑️ Room auto-deleted after 1 minute (no guest): ${code} | Active rooms: ${rooms.size}`);
        } else {
            console.log(`   - Skipping delete (guest exists or room already deleted)`);
        }
    }, 60 * 1000); // 1 minute

    console.log(`🏠 Room created: ${code} | Auto-delete timer set | Total active rooms: ${rooms.size}`);

    
    return room;
}

/**
 * Get compatibility result based on likes
 */
function calculateCompatibility(responses) {
    const totalQuestions = responses.length;
    const totalLikes = responses.filter(r => r.liked).length;
    const totalDislikes = totalQuestions - totalLikes;
    const percentage = Math.round((totalLikes / totalQuestions) * 100);
    
    let message, emoji;
    if (percentage >= 80) {
        message = "Wah, kalian super cocok! Chemistry-nya kuat banget! 🔥";
        emoji = "💕";
    } else if (percentage >= 60) {
        message = "Cocok nih! Ada banyak kesamaan yang bisa dijelajahi lebih lanjut.";
        emoji = "✨";
    } else if (percentage >= 40) {
        message = "Lumayan cocok! Perbedaan kadang bikin hubungan lebih menarik.";
        emoji = "🌱";
    } else if (percentage >= 20) {
        message = "Hmm, agak beda sih, tapi siapa tau bisa saling melengkapi?";
        emoji = "🤔";
    } else {
        message = "Sepertinya kalian punya perspektif yang sangat berbeda. Tapi itu ga masalah!";
        emoji = "🌈";
    }
    
    return { percentage, message, emoji, totalLikes, totalDislikes, totalQuestions };
}

// ==================== Socket.io Events ====================
io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // Create Room
    // Create Room
    socket.on('create-room', ({ roomName, userName, userId }, callback) => {
        try {
            const room = createRoom(roomName, userName, socket.id, userId);  // Tambahin userId
            socket.join(room.code);
            console.log(`🏠 ${userName} (${userId}) created room: ${room.code}`);
            
            callback({
                success: true,
                roomCode: room.code,
                room: {
                    code: room.code,
                    name: room.name,
                    hostName: room.host.name
                }
            });
        } catch (error) {
            console.error('❌ Error creating room:', error);
            callback({ success: false, error: error.message || 'Gagal membuat room' });
        }
    });

    // Join Room
    socket.on('join-room', ({ roomCode, userName, userId }, callback) => {
        const room = rooms.get(roomCode.toUpperCase());
        
        if (!room) {
            return callback({ success: false, error: 'Room tidak ditemukan' });
        }

        if (room.host.userId === userId) {
            return callback({ 
                success: false, 
                error: 'Lo ga bisa join room sendiri! Ini room lo yang bikin 😅' 
            });
        }
        
        if (room.guest) {
            return callback({ success: false, error: 'Room sudah penuh' });
        }
        
        if (room.gameState.started) {
            return callback({ success: false, error: 'Game sudah dimulai' });
        }

        // Set guest
        room.guest = {
            socketId: socket.id,
            name: userName,
            ready: true // Auto ready
        };

        // Cancel auto-delete timer since guest joined
        if (room.autoDeleteTimer) {
            clearTimeout(room.autoDeleteTimer);
            room.autoDeleteTimer = null;
            console.log(`⏰ Auto-delete timer cancelled for room: ${roomCode}`);
        }

        socket.join(roomCode);
        console.log(`🚪 ${userName} joined room: ${roomCode}`);

        // Notify host that guest joined
        io.to(room.host.socketId).emit('guest-joined', {
            guestName: userName
        });

        callback({
            success: true,
            room: {
                code: room.code,
                name: room.name,
                hostName: room.host.name,
                guestName: userName
            }
        });

        // AUTO START GAME setelah 1.5 detik
        setTimeout(() => {
            room.gameState.started = true;
            room.gameState.currentTurn = 'host';

            const firstCard = room.gameState.cards[0];

            // Send game start to both players
            io.to(room.host.socketId).emit('game-start', {
                yourTurn: true,
                card: firstCard,
                partnerName: room.guest.name,
                roundNumber: 1,
                totalRounds: room.gameState.totalRounds
            });

            io.to(room.guest.socketId).emit('game-start', {
                yourTurn: false,
                card: null,
                partnerName: room.host.name,
                roundNumber: 1,
                totalRounds: room.gameState.totalRounds
            });

            console.log(`🎮 Game auto-started in room: ${roomCode}`);
        }, 1500);
    });

    // Player Ready
    socket.on('player-ready', ({ roomCode }) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        // Determine which player is ready
        if (room.host.socketId === socket.id) {
            room.host.ready = true;
        } else if (room.guest && room.guest.socketId === socket.id) {
            room.guest.ready = true;
        }

        // Check if both players are ready
        if (room.host.ready && room.guest && room.guest.ready) {
            // Start the game!
            room.gameState.started = true;
            room.gameState.currentTurn = 'host'; // Host asks first

            const firstCard = room.gameState.cards[0];

            // Send game start to both players
            io.to(room.host.socketId).emit('game-start', {
                yourTurn: true,
                card: firstCard,
                partnerName: room.guest.name,
                roundNumber: 1,
                totalRounds: room.gameState.totalRounds
            });

            io.to(room.guest.socketId).emit('game-start', {
                yourTurn: false,
                card: null,
                partnerName: room.host.name,
                roundNumber: 1,
                totalRounds: room.gameState.totalRounds
            });

            console.log(`🎮 Game started in room: ${roomCode}`);
        }
    });

    // Card Response (Like/Dislike)
    socket.on('card-response', ({ roomCode, liked }) => {
        const room = rooms.get(roomCode);
        if (!room || !room.gameState.started) return;

        const currentCard = room.gameState.cards[room.gameState.currentCardIndex];
        const isHost = room.host.socketId === socket.id;

        // Record the response
        room.gameState.responses.push({
            cardId: currentCard.id,
            question: currentCard.question,
            asker: isHost ? room.host.name : room.guest.name,
            responder: isHost ? room.guest.name : room.host.name,
            liked
        });

        room.gameState.currentCardIndex++;

        // Check if game is over
        if (room.gameState.currentCardIndex >= room.gameState.totalRounds) {
            // Game Over - Calculate results
            const result = calculateCompatibility(room.gameState.responses);
            
            io.to(roomCode).emit('game-over', {
                result,
                responses: room.gameState.responses,
                hostName: room.host.name,
                guestName: room.guest.name
            });

            console.log(`🏁 Game over in room: ${roomCode} - ${result.percentage}% compatibility`);
            return;
        }

        // Switch turns
        room.gameState.currentTurn = room.gameState.currentTurn === 'host' ? 'guest' : 'host';
        const nextCard = room.gameState.cards[room.gameState.currentCardIndex];
        const roundNumber = room.gameState.currentCardIndex + 1;

        // Send next turn info
        const hostTurn = room.gameState.currentTurn === 'host';

        io.to(room.host.socketId).emit('next-turn', {
            yourTurn: hostTurn,
            card: hostTurn ? nextCard : null,
            roundNumber,
            totalRounds: room.gameState.totalRounds,
            lastResponse: liked
        });

        io.to(room.guest.socketId).emit('next-turn', {
            yourTurn: !hostTurn,
            card: !hostTurn ? nextCard : null,
            roundNumber,
            totalRounds: room.gameState.totalRounds,
            lastResponse: liked
        });
    });

    // WebRTC Signaling - Offer
    socket.on('webrtc-offer', ({ roomCode, offer }) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        const targetSocketId = room.host.socketId === socket.id 
            ? room.guest?.socketId 
            : room.host.socketId;

        if (targetSocketId) {
            io.to(targetSocketId).emit('webrtc-offer', { offer });
        }
    });

    // WebRTC Signaling - Answer
    socket.on('webrtc-answer', ({ roomCode, answer }) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        const targetSocketId = room.host.socketId === socket.id 
            ? room.guest?.socketId 
            : room.host.socketId;

        if (targetSocketId) {
            io.to(targetSocketId).emit('webrtc-answer', { answer });
        }
    });

    // Play Again - Reset both players to lobby
    socket.on('play-again', ({ roomCode }) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        console.log(`🔄 Play again requested in room: ${roomCode}`);

        // Notify both players to reset to lobby
        io.to(roomCode).emit('reset-to-lobby', {
            message: 'Kembali ke lobby untuk main lagi!'
        });

        // Delete the room
        rooms.delete(roomCode);
        console.log(`🗑️ Room deleted after play again: ${roomCode} | Active rooms: ${rooms.size}`);
    });

    // Close Room (dipanggil client ketika timeout atau cancel)
    socket.on('close-room', ({ roomCode }) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        // Verify yang request adalah host
        if (room.host.socketId !== socket.id) return;

        console.log(`🚪 Host manually closing room: ${roomCode}`);

        // Clear auto-delete timer if exists
        if (room.autoDeleteTimer) {
            clearTimeout(room.autoDeleteTimer);
            room.autoDeleteTimer = null;
        }

        // Notify guest if exists
        if (room.guest && room.guest.socketId) {
            io.to(room.guest.socketId).emit('room-closed', {
                message: 'Host menutup room.'
            });
        }

        // Delete room
        rooms.delete(roomCode);
        console.log(`🗑️ Room closed by host: ${roomCode} | Active rooms: ${rooms.size}`);
    });

    // WebRTC Signaling - ICE Candidate
    socket.on('webrtc-ice-candidate', ({ roomCode, candidate }) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        const targetSocketId = room.host.socketId === socket.id 
            ? room.guest?.socketId 
            : room.host.socketId;

        if (targetSocketId) {
            io.to(targetSocketId).emit('webrtc-ice-candidate', { candidate });
        }
    });

    // Rejoin Room (untuk reconnect setelah disconnect)
    socket.on('rejoin-room', ({ roomCode, userName, isHost }, callback) => {
        const room = rooms.get(roomCode);
        
        if (!room) {
            return callback({ success: false, error: 'Room tidak ditemukan' });
        }

        if (isHost) {
            // Reconnect as host
            if (room.host.name === userName) {
                room.host.socketId = socket.id;
                room.host.disconnectedAt = null;
                socket.join(roomCode);
                console.log(`🔄 Host reconnected to room: ${roomCode}`);

                callback({
                    success: true,
                    room: {
                        code: room.code,
                        name: room.name,
                        hostName: room.host.name,
                        guestName: room.guest?.name || null,
                        gameStarted: room.gameState.started,
                        currentCardIndex: room.gameState.currentCardIndex
                    }
                });

                // If game was in progress, resync game state
                if (room.gameState.started && room.guest?.socketId) {
                    const currentCard = room.gameState.cards[room.gameState.currentCardIndex];
                    const hostTurn = room.gameState.currentTurn === 'host';
                    
                    socket.emit('game-resync', {
                        yourTurn: hostTurn,
                        card: hostTurn ? currentCard : null,
                        partnerName: room.guest.name,
                        roundNumber: room.gameState.currentCardIndex + 1,
                        totalRounds: room.gameState.totalRounds
                    });
                }
            } else {
                callback({ success: false, error: 'Nama tidak cocok' });
            }
        } else {
            // Reconnect as guest
            if (room.guest && room.guest.name === userName) {
                room.guest.socketId = socket.id;
                room.guest.disconnectedAt = null;
                socket.join(roomCode);
                console.log(`🔄 Guest reconnected to room: ${roomCode}`);

                callback({
                    success: true,
                    room: {
                        code: room.code,
                        name: room.name,
                        hostName: room.host.name,
                        guestName: room.guest.name,
                        gameStarted: room.gameState.started,
                        currentCardIndex: room.gameState.currentCardIndex
                    }
                });

                // If game was in progress, resync game state
                if (room.gameState.started && room.host.socketId) {
                    const currentCard = room.gameState.cards[room.gameState.currentCardIndex];
                    const guestTurn = room.gameState.currentTurn === 'guest';
                    
                    socket.emit('game-resync', {
                        yourTurn: guestTurn,
                        card: guestTurn ? currentCard : null,
                        partnerName: room.host.name,
                        roundNumber: room.gameState.currentCardIndex + 1,
                        totalRounds: room.gameState.totalRounds
                    });
                }
            } else {
                callback({ success: false, error: 'Anda bukan guest di room ini' });
            }
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.id}`);

        // Find rooms this user was in
        for (const [code, room] of rooms.entries()) {
            // Check if game is finished (on result screen)
            const gameFinished = room.gameState.currentCardIndex >= room.gameState.totalRounds;

            if (room.host.socketId === socket.id) {
                // Check if guest has joined or game has started
                if (!room.guest && !room.gameState.started) {
                    // Check if room is less than 1 minute old
                    const roomAge = Date.now() - room.createdAt;
                    const oneMinute = 60 * 1000;
                    
                    if (roomAge < oneMinute) {
                        // Room masih baru (kurang dari 1 menit) - beri grace period
                        console.log(`⏳ Host disconnected from new room: ${code} - room age: ${Math.round(roomAge/1000)}s`);
                        room.host.disconnectedAt = Date.now();
                        room.host.socketId = null;
                        
                        // Timeout sesuai sisa waktu sampai 1 menit
                        const remainingTime = oneMinute - roomAge;
                        setTimeout(() => {
                            const currentRoom = rooms.get(code);
                            if (currentRoom && currentRoom.host.socketId === null && !currentRoom.guest) {
                                // Cancel auto-delete timer if exists
                                if (currentRoom.autoDeleteTimer) {
                                    clearTimeout(currentRoom.autoDeleteTimer);
                                }
                                rooms.delete(code);
                                console.log(`🗑️ Room deleted after grace period (no guest joined): ${code} | Active rooms: ${rooms.size}`);
                            }
                        }, remainingTime);
                    } else {
                        // Room sudah lebih dari 1 menit dan belum ada guest - hapus langsung
                        if (room.autoDeleteTimer) {
                            clearTimeout(room.autoDeleteTimer);
                        }
                        rooms.delete(code);
                        console.log(`🗑️ Room deleted immediately (>1 min, no guest): ${code} | Active rooms: ${rooms.size}`);
                    }
                } else if (gameFinished) {
                    // Game already finished - delete room immediately
                    if (room.guest && room.guest.socketId) {
                        io.to(room.guest.socketId).emit('room-closed', {
                            message: 'Partner sudah keluar.'
                        });
                    }
                    rooms.delete(code);
                    console.log(`🗑️ Room deleted immediately (game finished): ${code} | Active rooms: ${rooms.size}`);
                } else {
                    // Guest exists or game started - use grace period
                    console.log(`⏳ Host disconnected from room: ${code} - starting grace period`);
                    room.host.disconnectedAt = Date.now();
                    room.host.socketId = null; // Clear socket but keep room

                    // Set timeout to delete room if host doesn't reconnect
                    setTimeout(() => {
                        const currentRoom = rooms.get(code);
                        if (currentRoom && currentRoom.host.socketId === null) {
                            // Host didn't reconnect - notify guest and delete
                            if (currentRoom.guest && currentRoom.guest.socketId) {
                                io.to(currentRoom.guest.socketId).emit('room-closed', {
                                    message: 'Host tidak kembali. Room ditutup.'
                                });
                            }
                            rooms.delete(code);
                            console.log(`🗑️ Room deleted after grace period: ${code} | Active rooms: ${rooms.size}`);
                        }
                    }, 15000);
                }

            } else if (room.guest && room.guest.socketId === socket.id) {
                if (gameFinished) {
                    // Game already finished - delete room immediately
                    if (room.host.socketId) {
                        io.to(room.host.socketId).emit('room-closed', {
                            message: 'Partner sudah keluar.'
                        });
                    }
                    rooms.delete(code);
                    console.log(`🗑️ Room deleted immediately (game finished): ${code} | Active rooms: ${rooms.size}`);
                } else {
                    // Guest disconnected - set grace period
                    console.log(`⏳ Guest disconnected from room: ${code} - starting grace period`);
                    room.guest.disconnectedAt = Date.now();
                    room.guest.socketId = null;

                    // Set timeout for guest reconnection
                    setTimeout(() => {
                        const currentRoom = rooms.get(code);
                        if (currentRoom && currentRoom.guest && currentRoom.guest.socketId === null) {
                            // Guest didn't reconnect - notify host and DELETE room entirely
                            if (currentRoom.host.socketId) {
                                io.to(currentRoom.host.socketId).emit('room-closed', {
                                    message: 'Partner tidak kembali. Room ditutup.'
                                });
                            }
                            rooms.delete(code);
                            console.log(`🗑️ Room deleted after guest grace period: ${code} | Active rooms: ${rooms.size}`);
                        }
                    }, 15000);
                }
            }
        }
    });
});

// ==================== Cleanup old rooms ====================
setInterval(() => {
    const now = Date.now();
    const maxAge = 2 * 60 * 60 * 1000; // 2 hours

    for (const [code, room] of rooms.entries()) {
        if (now - room.createdAt > maxAge) {
            // Clear auto-delete timer if exists
            if (room.autoDeleteTimer) {
                clearTimeout(room.autoDeleteTimer);
            }
            rooms.delete(code);
            console.log(`🧹 Cleaned up old room: ${code} | Active rooms: ${rooms.size}`);
        }
    }
}, 30 * 60 * 1000); // Check every 30 minutes

// ==================== Start Server ====================
const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║   🪑 Duduk Sebentar Server                ║
║   Running on port ${PORT}                     ║
║                                           ║
╚═══════════════════════════════════════════╝
    `);
});
