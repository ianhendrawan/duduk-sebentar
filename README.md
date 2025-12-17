# 🪑 Duduk Sebentar

A peer-to-peer conversation game where two people can connect, ask questions, and discover their compatibility!

## 🎮 How It Works

1. **Create a Room**: One person creates a room and gets a 6-character code
2. **Join the Room**: The other person enters the code to join
3. **Take Turns**: Each player takes turns receiving a question card
4. **Ask & Answer**: The player with the card asks their partner (in real life!)
5. **Rate the Answer**: Like 👍 or Dislike 👎 based on the answer
6. **See Results**: After all rounds, see your compatibility score!

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Backend**: Node.js + Express
- **Real-time**: Socket.io for signaling and game state
- **Styling**: Custom CSS with warm, cozy aesthetic

## 📦 Installation

```bash
# Clone or download the project
cd duduk-sebentar

# Install dependencies
npm install

# Start the server
npm start
```

The server will run on `http://localhost:3000`

## 🚀 Development

```bash
# Run with auto-reload (Node 18+)
npm run dev
```

## 📁 Project Structure

```
duduk-sebentar/
├── package.json
├── README.md
├── server/
│   └── index.js      # Express + Socket.io server
└── public/
    └── index.html    # Frontend (all-in-one HTML)
```

## 🎯 Features

- ✅ Room creation with unique codes
- ✅ Real-time player joining
- ✅ Turn-based question system
- ✅ Like/Dislike responses
- ✅ Compatibility score calculation
- ✅ Beautiful, responsive UI
- ✅ Smooth animations
- ✅ Auto-cleanup of old rooms
- ✅ Disconnect handling

## 🎨 Game Flow

```
┌─────────────┐     ┌─────────────┐
│   Player A  │     │   Player B  │
│  (Host)     │     │  (Guest)    │
└──────┬──────┘     └──────┬──────┘
       │                    │
       │ Create Room        │
       │◄──────────────────►│ Join Room
       │                    │
       │     Both Ready     │
       │◄──────────────────►│
       │                    │
       │ See Question ──────┼─── Waiting
       │ Ask Partner        │
       │ Rate Answer ───────┼─── Answer
       │                    │
       │ Waiting ───────────┼─── See Question
       │ Answer             │    Ask Partner
       │ ───────────────────┼─── Rate Answer
       │                    │
       │    ... repeat ...  │
       │                    │
       │   Game Over!       │
       │ See Compatibility  │
       └────────────────────┘
```

## 📝 Question Categories

- 🎯 Lifestyle
- 💪 Motivation
- 📖 Stories
- ✨ Dreams
- 🌱 Growth
- 🍕 Comfort
- 💕 Relationships
- 🎭 Personality
- 💭 Opinions
- ⚖️ Values

## 🔧 Configuration

Edit `server/index.js` to customize:

- `PORT`: Server port (default: 3000)
- `totalRounds`: Number of questions per game (default: 10)
- `questionCards`: Add/modify questions
- Room cleanup interval and max age

## 🤝 Contributing

Feel free to add more questions, improve the UI, or add new features!

## 📄 License

MIT License - Feel free to use for personal or commercial projects.

---

Made with ❤️ for meaningful conversations
