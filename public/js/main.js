async function recordVoice() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const audioChunks = [];

  mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

  mediaRecorder.onstop = async () => {
    const blob = new Blob(audioChunks, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio", blob, "voice.webm");

    const res = await fetch("/voice-chat", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    document.getElementById("textResponse").innerText = data.text;
    document.getElementById("aiVoice").src = data.audioUrl;
  };

  mediaRecorder.start();
  setTimeout(() => mediaRecorder.stop(), 5000); // Record 5 seconds
}

// Simple rotating head using Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / (window.innerHeight * 0.6), 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight * 0.6);
document.getElementById("avatar").appendChild(renderer.domElement);

const geometry = new THREE.SphereGeometry(1, 32, 32);
const material = new THREE.MeshStandardMaterial({ color: 0x007bff });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

const light = new THREE.PointLight(0xffffff, 1);
light.position.set(5, 5, 5);
scene.add(light);

camera.position.z = 3;

function animate() {
  requestAnimationFrame(animate);
  sphere.rotation.y += 0.01;
  renderer.render(scene, camera);
}
animate();
