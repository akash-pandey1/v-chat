<script setup>
import { ref, onMounted } from "vue";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000"); // backend URL

const localVideo = ref(null);
const remoteVideo = ref(null);

let peer;
const roomId = "test-room"; // later make dynamic

// ICE servers (STUN only for now)
const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  localVideo.value.srcObject = stream;

  peer = new RTCPeerConnection(config);

  // Send tracks
  stream.getTracks().forEach((track) => {
    peer.addTrack(track, stream);
  });

  // Receive remote stream
  peer.ontrack = (event) => {
    remoteVideo.value.srcObject = event.streams[0];
  };

  // Send ICE candidates
  peer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", {
        roomId,
        candidate: event.candidate,
      });
    }
  };
}

// When another user joins → create offer
socket.on("user-joined", async () => {
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);

  socket.emit("offer", { roomId, offer });
});

// Receive offer
socket.on("offer", async (offer) => {
  await peer.setRemoteDescription(offer);

  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);

  socket.emit("answer", { roomId, answer });
});

// Receive answer
socket.on("answer", async (answer) => {
  await peer.setRemoteDescription(answer);
});

// Receive ICE candidate
socket.on("ice-candidate", async (candidate) => {
  try {
    await peer.addIceCandidate(candidate);
  } catch (err) {
    console.error(err);
  }
});

onMounted(async () => {
  await startCamera();
  socket.emit("join-room", roomId);
});
</script>

<template>
  <h2>WebRTC Video Chat (Vue)</h2>

  <div style="display:flex; gap:20px">
    <video ref="localVideo" autoplay muted playsinline width="300" />
    <video ref="remoteVideo" autoplay playsinline width="300" />
  </div>
</template>