<script setup>
import { ref, onMounted, reactive } from "vue";
import { io } from "socket.io-client";

const socket_url = import.meta.env.VITE_API_URL;
const socket = io(socket_url);

const localVideo = ref(null);
const localStream = ref(null);
const remoteVideos = reactive({});
const peers = reactive({});
const roomId = ref("test-room");
const isVideoEnabled = ref(true);
const isAudioEnabled = ref(true);
const connectionStatus = ref("Connecting...");

// ICE servers (STUN and TURN for better connectivity)
const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// Create or get peer connection for a specific user
async function createPeerConnection(userId, initiator = false) {
  if (peers[userId]) {
    return peers[userId];
  }

  const peer = new RTCPeerConnection(config);
  peers[userId] = peer;

  // Add local stream tracks to the peer connection
  if (localStream.value) {
    localStream.value.getTracks().forEach((track) => {
      peer.addTrack(track, localStream.value);
    });
  }

  // Handle remote stream
  peer.ontrack = (event) => {
    console.log("Received remote track from", userId);
    remoteVideos[userId] = event.streams[0];
  };

  // Send ICE candidates
  peer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", {
        roomId: roomId.value,
        candidate: {
          candidate: event.candidate.candidate,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid,
        },
        to: userId,
      });
    }
  };

  // Handle connection state changes
  peer.onconnectionstatechange = () => {
    console.log(`Connection state with ${userId}:`, peer.connectionState);
  };

  return peer;
}

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    });
    localStream.value = stream;
    localVideo.value.srcObject = stream;
    connectionStatus.value = "Connected";
  } catch (err) {
    console.error("Error accessing media devices:", err);
    connectionStatus.value = "Camera access denied";
  }
}

// When an existing user is in the room, create offer
socket.on("existing-users", async (users) => {
  for (const userId of users) {
    console.log("Creating offer for existing user:", userId);
    const peer = await createPeerConnection(userId, true);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit("offer", {
      roomId: roomId.value,
      offer: {
        type: offer.type,
        sdp: offer.sdp,
      },
      to: userId,
    });
  }
});

// When a new user joins, create offer
socket.on("user-joined", async (userId) => {
  console.log("New user joined:", userId);
  const peer = await createPeerConnection(userId, true);
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  socket.emit("offer", {
    roomId: roomId.value,
    offer: {
      type: offer.type,
      sdp: offer.sdp,
    },
    to: userId,
  });
});

// Receive offer
socket.on("offer", async ({ from, offer }) => {
  console.log("Received offer from:", from);
  if (!offer || !offer.type || !offer.sdp) {
    console.error("Invalid offer received:", offer);
    return;
  }
  
  const peer = await createPeerConnection(from, false);
  try {
    await peer.setRemoteDescription(
      new RTCSessionDescription({
        type: offer.type,
        sdp: offer.sdp,
      })
    );

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.emit("answer", {
      roomId: roomId.value,
      answer: {
        type: answer.type,
        sdp: answer.sdp,
      },
      to: from,
    });
  } catch (err) {
    console.error("Error handling offer:", err);
  }
});

// Receive answer
socket.on("answer", async ({ from, answer }) => {
  console.log("Received answer from:", from);
  if (!answer || !answer.type || !answer.sdp) {
    console.error("Invalid answer received:", answer);
    return;
  }
  
  if (peers[from]) {
    try {
      await peers[from].setRemoteDescription(
        new RTCSessionDescription({
          type: answer.type,
          sdp: answer.sdp,
        })
      );
    } catch (err) {
      console.error("Error handling answer:", err);
    }
  }
});

// Receive ICE candidate
socket.on("ice-candidate", async ({ from, candidate }) => {
  if (peers[from]) {
    try {
      if (
        candidate &&
        candidate.candidate &&
        candidate.sdpMLineIndex !== undefined
      ) {
        await peers[from].addIceCandidate(
          new RTCIceCandidate({
            candidate: candidate.candidate,
            sdpMLineIndex: candidate.sdpMLineIndex,
            sdpMid: candidate.sdpMid,
          })
        );
      }
    } catch (err) {
      console.error("Error adding ICE candidate:", err);
    }
  }
});

// Handle user disconnection
socket.on("user-disconnected", (userId) => {
  console.log("User disconnected:", userId);
  if (peers[userId]) {
    peers[userId].close();
    delete peers[userId];
    delete remoteVideos[userId];
  }
});

// Toggle video
function toggleVideo() {
  if (localStream.value) {
    localStream.value.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    isVideoEnabled.value = !isVideoEnabled.value;
  }
}

// Toggle audio
function toggleAudio() {
  if (localStream.value) {
    localStream.value.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    isAudioEnabled.value = !isAudioEnabled.value;
  }
}

// Hang up call
function hangUp() {
  localStream.value?.getTracks().forEach((track) => track.stop());
  Object.values(peers).forEach((peer) => peer.close());
  socket.emit("disconnect");
  window.location.reload();
}

onMounted(async () => {
  await startCamera();
  socket.emit("join-room", roomId.value);
});
</script>

<template>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <h1 class="title">📹 V-Chat</h1>
        <div class="status" :class="{ connected: connectionStatus === 'Connected' }">
          {{ connectionStatus }}
        </div>
      </div>
      <a href="https://akashdeep9226@gmail.com" class="hire-btn" title="Contact for hiring">
        💼 Hire Me
      </a>
    </header>

    <!-- Main video area -->
    <main class="main">
      <div class="videos-grid">
        <!-- Local video -->
        <div class="video-container local">
          <video
            ref="localVideo"
            autoplay
            muted
            playsinline
            class="video"
          ></video>
          <div class="video-label">You</div>
        </div>

        <!-- Remote videos -->
        <div
          v-for="(stream, userId) in remoteVideos"
          :key="userId"
          class="video-container remote"
        >
          <video
            :srcObject="stream"
            autoplay
            playsinline
            class="video"
          ></video>
          <div class="video-label">User {{ userId.slice(0, 5) }}</div>
        </div>
      </div>

      <!-- Empty state message -->
      <div v-if="Object.keys(remoteVideos).length === 0" class="empty-state">
        <p>Waiting for others to join...</p>
      </div>
    </main>

    <!-- Controls -->
    <footer class="controls">
      <button
        @click="toggleVideo"
        class="control-btn"
        :class="{ inactive: !isVideoEnabled }"
        title="Toggle video"
      >
        {{ isVideoEnabled ? "📹 Video On" : "📹 Video Off" }}
      </button>
      <button
        @click="toggleAudio"
        class="control-btn"
        :class="{ inactive: !isAudioEnabled }"
        title="Toggle audio"
      >
        {{ isAudioEnabled ? "🎤 Audio On" : "🎤 Audio Off" }}
      </button>
      <button @click="hangUp" class="control-btn end-call" title="End call">
        📞 Hang Up
      </button>
    </footer>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #fff;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.title {
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.status {
  padding: 0.5rem 1rem;
  background: rgba(255, 107, 107, 0.8);
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.status.connected {
  background: rgba(76, 175, 80, 0.8);
}

.hire-btn {
  padding: 0.7rem 1.5rem;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  text-decoration: none;
  border-radius: 25px;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
  cursor: pointer;
}

.hire-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(245, 87, 108, 0.6);
}

/* Main content */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  overflow: auto;
  position: relative;
}

.videos-grid {
  display: grid;
  gap: 1.5rem;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  aspect-ratio: 16/9;
}

.video-container {
  position: relative;
  background: #000;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.video-container:hover {
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.4);
  transform: scale(1.02);
}

.video-container.local {
  border: 3px solid rgba(76, 175, 80, 0.6);
}

.video-container.remote {
  border: 3px solid rgba(33, 150, 243, 0.6);
}

.video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.video-label {
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  background: rgba(0, 0, 0, 0.6);
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  backdrop-filter: blur(5px);
}

.empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  font-size: 1.2rem;
  opacity: 0.8;
}

/* Controls */
.controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  flex-wrap: wrap;
}

.control-btn {
  padding: 0.8rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 25px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.control-btn:hover:not(.inactive) {
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.control-btn.inactive {
  opacity: 0.5;
  background: linear-gradient(135deg, #999 0%, #666 100%);
}

.control-btn.end-call {
  background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
}

.control-btn.end-call:hover {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  box-shadow: 0 6px 20px rgba(245, 87, 108, 0.4);
}

/* Responsive design */
@media (max-width: 1024px) {
  .videos-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }

  .header {
    flex-wrap: wrap;
    gap: 1rem;
  }

  .title {
    font-size: 1.5rem;
  }
}

@media (max-width: 768px) {
  .container {
    height: auto;
    min-height: 100vh;
  }

  .header {
    padding: 1rem;
    flex-direction: column;
  }

  .header-content {
    width: 100%;
    justify-content: space-between;
  }

  .title {
    font-size: 1.3rem;
  }

  .hire-btn {
    padding: 0.6rem 1.2rem;
    font-size: 0.85rem;
  }

  .main {
    padding: 1rem;
  }

  .videos-grid {
    grid-template-columns: 1fr;
    aspect-ratio: auto;
    min-height: 300px;
  }

  .video-container {
    min-height: 250px;
  }

  .controls {
    gap: 0.8rem;
    padding: 1rem;
  }

  .control-btn {
    padding: 0.6rem 1.2rem;
    font-size: 0.85rem;
  }
}

@media (max-width: 480px) {
  .header {
    padding: 0.8rem;
  }

  .title {
    font-size: 1.2rem;
  }

  .hire-btn {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
  }

  .status {
    font-size: 0.8rem;
    padding: 0.4rem 0.8rem;
  }

  .controls {
    gap: 0.5rem;
  }

  .control-btn {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
  }

  .video-label {
    font-size: 0.75rem;
    padding: 0.3rem 0.6rem;
  }
}
</style>