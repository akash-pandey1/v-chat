# V-Chat 📹 - Video Chat Application

A modern, real-time video chat application built with Vue 3, WebRTC, and Socket.io. Support for multiple participants with attractive, responsive UI.

## Features ✨

- 🎥 **Real-time Video Conferencing** - Seamless peer-to-peer video communication
- 👥 **Multi-user Support** - Support for unlimited participants in a single room
- 🎤 **Audio & Video Controls** - Toggle audio/video on/off during calls
- 📱 **Fully Responsive** - Works perfectly on desktop, tablet, and mobile devices
- 🎨 **Modern UI** - Beautiful gradient design with smooth animations
- 💼 **Professional Features** - Connection status indicator, user labels, and more

## Tech Stack

### Frontend
- **Vue 3** - Progressive JavaScript framework
- **Vite** - Lightning-fast build tool
- **Socket.io Client** - Real-time bidirectional communication
- **WebRTC** - Peer-to-peer video/audio streaming

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **Socket.io** - WebSocket library for real-time communication
- **CORS** - Cross-origin resource sharing

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:
```env
PORT=3001
PROD_FRONTEND=http://localhost:5173
```

Start the server:
```bash
npm start
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env.local` file in the frontend directory:
```env
VITE_API_URL=http://localhost:3001
```

Start the development server:
```bash
npm run dev
```

## Usage

1. Open your browser and navigate to `http://localhost:5173`
2. Share the room link with others
3. Click "Hire Me" to contact the developer
4. Use the control buttons to:
   - 📹 Toggle video on/off
   - 🎤 Toggle audio on/off
   - 📞 End the call

## Key Features Explained

### Multi-User Support
The application now properly handles multiple participants by:
- Creating individual peer connections for each user
- Proper signaling between peers using Socket.io
- Efficient ICE candidate management

### Responsive Design
- **Desktop**: Full-size video grid with smooth animations
- **Tablet**: Optimized grid layout with touch-friendly controls
- **Mobile**: Stacked video layout with simplified controls

### Connection Management
- Real-time connection status indicator
- Automatic cleanup on disconnect
- Support for multiple STUN servers for better connectivity

## Architecture

### Signaling Flow
```
User A Join → Server notifies User B
           ↓
User B creates Offer → Server sends to User A
           ↓
User A creates Answer → Server sends to User B
           ↓
ICE Candidates exchanged
           ↓
Peer connection established
```

## Project Structure

```
v-chat/
├── backend/
│   ├── server.js          # Express + Socket.io server
│   ├── package.json       # Backend dependencies
│   └── .env              # Environment variables
│
└── frontend/
    ├── src/
    │   ├── App.vue       # Main video chat component
    │   └── main.ts       # Vue app entry point
    ├── vite.config.ts    # Vite configuration
    ├── package.json      # Frontend dependencies
    └── .env.local        # Frontend env variables
```

## Troubleshooting

### Video Not Showing
- Check browser camera permissions
- Ensure both frontend and backend are running
- Check console for error messages

### Connection Issues
- Verify backend is running on correct port
- Check VITE_API_URL matches backend URL
- Ensure CORS is properly configured

### Video Stuck with Multiple Users
The latest version includes fixes for multi-user scenarios:
- Each peer gets individual connection
- Proper ICE candidate handling
- Connection state monitoring

## Contributing

Feel free to fork and submit pull requests for any improvements!

## Author 👨‍💻

**Akash Pandey**
- Email: akashdeep9226@gmail.com
- Available for: Web development projects, consulting, and freelance work
- Click the "💼 Hire Me" button in the app to get in touch!

## License

This project is open source and available for personal and commercial use.

## Support

If you encounter any issues, please:
1. Check the troubleshooting section
2. Review browser console for error messages
3. Contact the author at akashdeep9226@gmail.com

---

**Made with ❤️ by Akash Pandey**
