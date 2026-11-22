/**
 * Client-side synthetic video generator
 * Generates an animated CCTV surveillance clip with swimming pool, roadway, and moving child
 * as a standard WebM Blob using HTML5 Canvas captureStream and MediaRecorder.
 */
export async function generateSyntheticCCTVBlob() {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 680;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');

      const stream = canvas.captureStream(25);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };

      recorder.start();

      let frame = 0;
      const totalFrames = 60; // 2.4 seconds loop

      const interval = setInterval(() => {
        frame++;

        // 1. Backyard Courtyard Lawn
        const grad = ctx.createLinearGradient(0, 0, 680, 480);
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 680, 480);

        // Grid lines
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        for (let y = 60; y < 480; y += 45) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(680, y);
          ctx.stroke();
        }

        // 2. Swimming Pool / Water Cistern (Top Right)
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(430, 110, 190, 160);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.strokeRect(430, 110, 190, 160);

        // Water ripple animation
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        for (let r = 20; r < 70; r += 20) {
          ctx.beginPath();
          ctx.arc(525, 190, (r + frame * 2) % 80, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = '#bae6fd';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('WATER TANK', 485, 140);

        // 3. Roadway (Bottom)
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(30, 360, 620, 100);
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        ctx.strokeRect(30, 360, 620, 100);
        // Yellow lane stripes
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.setLineDash([15, 15]);
        ctx.beginPath();
        ctx.moveTo(40, 410);
        ctx.lineTo(640, 410);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#fdba74';
        ctx.fillText('ROADWAY TRAFFIC', 50, 385);

        // 4. Moving Child (Walking towards pool)
        const childProgress = (frame % totalFrames) / totalFrames;
        const childX = 220 + childProgress * 180;
        const childY = 220 + Math.sin(childProgress * Math.PI * 4) * 15;

        // Child body
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(childX, childY - 24, 10, 0, Math.PI * 2); // head
        ctx.fill();
        ctx.fillRect(childX - 8, childY - 14, 16, 26); // torso
        // Legs
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(childX - 4, childY + 12);
        ctx.lineTo(childX - 6 + Math.sin(frame * 0.4) * 6, childY + 28);
        ctx.moveTo(childX + 4, childY + 12);
        ctx.lineTo(childX + 6 - Math.sin(frame * 0.4) * 6, childY + 28);
        ctx.stroke();

        // CCTV timestamp
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(10, 10, 200, 25);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`CAM-01 RECORDING F#${frame}`, 15, 27);

        if (frame >= totalFrames) {
          clearInterval(interval);
          recorder.stop();
        }
      }, 40);
    } catch (e) {
      console.warn('Synthetic video creation failed', e);
      resolve(null);
    }
  });
}
