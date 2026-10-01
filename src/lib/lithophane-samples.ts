// Generates realistic, high-contrast sample photos on an HTML5 canvas
// Enables instant zero-network 3D lithophane preview for new visitors.

export interface SamplePhoto {
  id: string;
  name: string;
  tag: string;
  generate: () => string;
}

export function generateSamplePhoto(type: "couple" | "pet" | "family"): string {
  if (typeof document === "undefined") return "";

  const w = 480;
  const h = 360;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  if (type === "couple") {
    // 1. Sky sunset gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#ff4e50");
    sky.addColorStop(0.35, "#f9d423");
    sky.addColorStop(0.7, "#fff8e7");
    sky.addColorStop(1, "#3a1c71");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Glowing sun disc behind horizon
    const sunGrad = ctx.createRadialGradient(w * 0.48, h * 0.52, 10, w * 0.48, h * 0.52, 90);
    sunGrad.addColorStop(0, "#ffffff");
    sunGrad.addColorStop(0.4, "#fff0a5");
    sunGrad.addColorStop(1, "rgba(255, 240, 165, 0)");
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(w * 0.48, h * 0.52, 90, 0, Math.PI * 2);
    ctx.fill();

    // Mountain hill silhouette in the foreground
    ctx.fillStyle = "#110b1e";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.72);
    ctx.bezierCurveTo(w * 0.25, h * 0.68, w * 0.6, h * 0.78, w, h * 0.7);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Couple silhouette standing on the crest
    ctx.fillStyle = "#0a0612";
    // Person 1 (left)
    ctx.beginPath();
    ctx.arc(w * 0.43, h * 0.50, 13, 0, Math.PI * 2); // Head
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w * 0.43, h * 0.59, 15, 28, 0.05, 0, Math.PI * 2); // Body
    ctx.fill();

    // Person 2 (right)
    ctx.beginPath();
    ctx.arc(w * 0.51, h * 0.52, 12, 0, Math.PI * 2); // Head
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w * 0.51, h * 0.60, 14, 26, -0.05, 0, Math.PI * 2); // Body
    ctx.fill();

    // Intertwined arms / hands
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#0a0612";
    ctx.beginPath();
    ctx.moveTo(w * 0.43, h * 0.58);
    ctx.lineTo(w * 0.47, h * 0.61);
    ctx.lineTo(w * 0.51, h * 0.58);
    ctx.stroke();

    // Little heart silhouette above them
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    const hx = w * 0.47;
    const hy = h * 0.43;
    ctx.arc(hx - 5, hy - 4, 5, Math.PI, 0, false);
    ctx.arc(hx + 5, hy - 4, 5, Math.PI, 0, false);
    ctx.lineTo(hx, hy + 9);
    ctx.closePath();
    ctx.fill();
  } else if (type === "pet") {
    // Studio portrait lighting gradient
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.45, 20, w * 0.5, h * 0.5, w * 0.7);
    bg.addColorStop(0, "#f5e6d3");
    bg.addColorStop(0.6, "#cbb194");
    bg.addColorStop(1, "#261d15");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Dog silhouette / face portrait
    ctx.fillStyle = "#1e140d";

    // Drooping ears
    ctx.beginPath();
    ctx.ellipse(w * 0.35, h * 0.38, 22, 45, -0.2, 0, Math.PI * 2);
    ctx.ellipse(w * 0.65, h * 0.38, 22, 45, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.42, 54, 58, 0, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = "#3a2818";
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.52, 32, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Black nose
    ctx.fillStyle = "#0d0805";
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.48, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bright eyes with catchlights
    ctx.fillStyle = "#0d0805";
    ctx.beginPath();
    ctx.arc(w * 0.43, h * 0.38, 8, 0, Math.PI * 2);
    ctx.arc(w * 0.57, h * 0.38, 8, 0, Math.PI * 2);
    ctx.fill();

    // White eye reflections (high contrast for lithophane)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(w * 0.42, h * 0.37, 3, 0, Math.PI * 2);
    ctx.arc(w * 0.56, h * 0.37, 3, 0, Math.PI * 2);
    ctx.fill();

    // Chest / neck
    ctx.fillStyle = "#1e140d";
    ctx.beginPath();
    ctx.moveTo(w * 0.35, h * 0.58);
    ctx.lineTo(w * 0.25, h);
    ctx.lineTo(w * 0.75, h);
    ctx.lineTo(w * 0.65, h * 0.58);
    ctx.closePath();
    ctx.fill();
  } else {
    // Family Beach Silhouette
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#2c3e50");
    sky.addColorStop(0.5, "#fd746c");
    sky.addColorStop(0.8, "#ff9068");
    sky.addColorStop(1, "#360033");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Warm sun
    ctx.fillStyle = "#fff4e0";
    ctx.beginPath();
    ctx.arc(w * 0.3, h * 0.45, 45, 0, Math.PI * 2);
    ctx.fill();

    // Shoreline
    ctx.fillStyle = "#150a1b";
    ctx.fillRect(0, h * 0.75, w, h * 0.25);

    // Mom, Dad, Child holding hands
    ctx.fillStyle = "#0c0411";
    // Dad (left)
    ctx.beginPath();
    ctx.arc(w * 0.46, h * 0.52, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(w * 0.44, h * 0.56, 16, 44);

    // Child (center)
    ctx.beginPath();
    ctx.arc(w * 0.53, h * 0.61, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(w * 0.51, h * 0.64, 11, 28);

    // Mom (right)
    ctx.beginPath();
    ctx.arc(w * 0.60, h * 0.54, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(w * 0.58, h * 0.57, 14, 40);

    // Connected arms
    ctx.strokeStyle = "#0c0411";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(w * 0.47, h * 0.64);
    ctx.lineTo(w * 0.52, h * 0.68);
    ctx.lineTo(w * 0.59, h * 0.65);
    ctx.stroke();
  }

  return canvas.toDataURL("image/jpeg", 0.9);
}

export const SAMPLE_PHOTOS: SamplePhoto[] = [
  {
    id: "couple",
    name: "Golden Sunset Couple",
    tag: "Romantic Gift",
    generate: () => generateSamplePhoto("couple"),
  },
  {
    id: "pet",
    name: "Golden Retriever Pet",
    tag: "Pet Keepsake",
    generate: () => generateSamplePhoto("pet"),
  },
  {
    id: "family",
    name: "Beach Family Moment",
    tag: "Family Memories",
    generate: () => generateSamplePhoto("family"),
  },
];
