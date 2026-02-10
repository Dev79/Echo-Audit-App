/**
 * Extracts frames from a video file at a specified interval.
 * Returns an array of base64 encoded image strings (without data:image/jpeg;base64, prefix).
 */
export const extractFramesFromVideo = async (
  videoFile: File,
  intervalSeconds: number = 2.0, // Extract a frame every 2 seconds to manage payload size
  maxFrames: number = 10 // Cap frames to prevent token overflow for this demo
): Promise<{ timestamp: string; data: string }[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const frames: { timestamp: string; data: string }[] = [];

    if (!context) {
      reject(new Error("Could not create canvas context"));
      return;
    }

    video.preload = 'metadata';
    video.src = URL.createObjectURL(videoFile);
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth / 2; // Resize to reduce token usage
      canvas.height = video.videoHeight / 2;
      
      let currentTime = 0;
      const duration = video.duration;

      const seekAndCapture = () => {
        if (currentTime >= duration || frames.length >= maxFrames) {
          URL.revokeObjectURL(video.src);
          resolve(frames);
          return;
        }

        video.currentTime = currentTime;
      };

      video.onseeked = () => {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // standard quality 0.7 jpeg
        const base64Url = canvas.toDataURL('image/jpeg', 0.7); 
        const base64Data = base64Url.split(',')[1];
        
        // Format timestamp as MM:SS
        const mins = Math.floor(currentTime / 60).toString().padStart(2, '0');
        const secs = Math.floor(currentTime % 60).toString().padStart(2, '0');

        frames.push({
          timestamp: `${mins}:${secs}`,
          data: base64Data
        });

        currentTime += intervalSeconds;
        seekAndCapture();
      };

      video.onerror = (e) => {
        URL.revokeObjectURL(video.src);
        reject(e);
      };

      seekAndCapture();
    };

    video.onerror = (e) => {
      reject(e);
    };
  });
};