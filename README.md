# 🧠 Multiplayer Sudoku Mastery

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Available-blue)](#) <!-- Add your live Vercel link here -->
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime-4ade80)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8)](https://tailwindcss.com/)

A premium, real-time cooperative Sudoku application built with Next.js, React, and Supabase. Challenge your friends to solve puzzles together, communicate via live chat, and enjoy a beautifully minimal, highly interactive mobile-first interface.

---

## ✨ Features

- **Real-Time P2P Sync**: Every move, mistake, and chat message is synchronized instantly across clients using Supabase Broadcast channels.
- **Co-op Multiplayer**: Work together with a partner to solve the board. Both players see the exact same puzzle and share a pool of 5 mistakes.
- **Interactive Rematch Flow**: Seamless "Play Again" cycle. Send a rematch invitation directly to your partner; a fresh puzzle is only generated once both players agree.
- **Smart UI & Pad Locking**: Custom dynamic locking logic disables numbers on the pad that are already solved in the same 3x3 box, streamlining the mobile gameplay experience.
- **Live Ephemeral Chat**: Send quick messages that pop up directly on the board (disappearing after a few seconds), or open the full chat history drawer.
- **Responsive Layout**: Plato-style minimalism with edge-to-edge grids, sleek blue accents (`#3b82f6`), and responsive tactile button feedback.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Frontend**: React, [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Realtime**: [Supabase](https://supabase.com/) (PostgreSQL + Broadcast Channels)
- **Icons**: [Lucide React](https://lucide.dev/)

## 📸 Screenshot

![Preview](public/demo.png)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com/) Account & Project

### Setup Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/sudoku-mastery.git
   cd sudoku-mastery
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root of the project and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the app in your browser.

---

## 🎮 How to Play

1. **Create or Join**: One player creates a room and selects a difficulty level (Easy, Medium, Hard, etc.). The other player joins using the generated 6-character room code.
2. **Solve Together**: Tap an empty cell, then tap a number on the quick-select pad below to fill it. 
3. **Avoid Mistakes**: You share a pool of **5 mistakes**. If you make too many incorrect guesses together, the board is locked and the match is lost.
4. **Coordinate**: Use the chat button in the bottom left to send messages to your partner.
5. **Rematch**: Win or lose, tap "Play Again" to send an invitation to your partner for another round in the same session.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! 
Feel free to check the [issues page](https://github.com/your-username/sudoku-mastery/issues) if you want to contribute.

## 📝 License
This project is [MIT](https://choosealicense.com/licenses/mit/) licensed.

---
Built with ❤️ by [Tushar](https://github.com/your-username)
