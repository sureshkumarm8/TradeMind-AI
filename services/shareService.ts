
import html2canvas from 'html2canvas';

export const shareElementAsImage = async (elementId: string, fileName: string = 'trademind_snapshot.png') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    throw new Error("Could not find content to share.");
  }

  try {
    // Generate Canvas from DOM
    const canvas = await html2canvas(element, {
      backgroundColor: '#0f172a', // Ensure dark background is captured
      scale: 2, // High resolution
      logging: false,
      useCORS: true // Handle images if possible
    });

    // Convert to Blob
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error("Failed to generate image.");

    const file = new File([blob], fileName, { type: 'image/png' });

    // Try Native Share API (Mobile)
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'My TradeMind Journal',
          text: 'Check out my recent trading performance on TradeMind.AI 🧠📈'
        });
        return true;
      } catch (err) {
        // User cancelled share or error, fallback to download
        console.warn("Share failed or cancelled, falling back to download", err);
      }
    }

    // Fallback: Download Image (Desktop)
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = fileName;
    link.click();
    return true;

  } catch (error) {
    console.error("Share Service Error", error);
    throw error;
  }
};
