import React from "react";
import { useRef, useEffect } from "react";

interface Detection {
  bboxes?: number[][];
  labels?: string[];
  quad_boxes?: number[][];
}

interface BboxOverlayProps {
  imageUrl: string;
  detections?: Detection;
}

const BboxOverlay: React.FC<BboxOverlayProps> = ({ imageUrl, detections }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!imageUrl || !detections) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const image = new Image();
    image.src = imageUrl;

    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;

      ctx.drawImage(image, 0, 0);

      ctx.lineWidth = 2;
      ctx.font = "16px Arial";

      // Case 1: Normal detection format with "labels" and "bboxes"
      if (detections.labels && detections.bboxes) {
        detections.bboxes.forEach((bbox, i) => {
          const label = detections.labels?.[i] || "";
          const [x1, y1, x2, y2] = bbox;
          const width = x2 - x1;
          const height = y2 - y1;

          ctx.strokeStyle = "red";
          ctx.fillStyle = "red";
          ctx.beginPath();
          ctx.rect(x1, y1, width, height);
          ctx.stroke();

          const textWidth = ctx.measureText(label).width;
          const textHeight = 16;
          ctx.fillRect(x1, y1 - textHeight, textWidth + 4, textHeight);

          ctx.fillStyle = "white";
          ctx.fillText(label, x1 + 2, y1 - 2);
        });
      }
      // Case 2: OCR with Region that returns "quad_boxes"
      else if (detections.labels && detections.quad_boxes) {
        detections.quad_boxes.forEach((quad, i) => {
          const label = detections.labels?.[i] || "";
          if (quad.length !== 8) return;

          ctx.strokeStyle = "green";
          ctx.fillStyle = "green";
          ctx.beginPath();
          ctx.moveTo(quad[0], quad[1]);
          ctx.lineTo(quad[2], quad[3]);
          ctx.lineTo(quad[4], quad[5]);
          ctx.lineTo(quad[6], quad[7]);
          ctx.closePath();
          ctx.stroke();

          const [x1, y1] = [quad[0], quad[1]];
          const textWidth = ctx.measureText(label).width;
          const textHeight = 16;
          ctx.fillRect(x1, y1 - textHeight, textWidth + 4, textHeight);

          ctx.fillStyle = "white";
          ctx.fillText(label, x1 + 2, y1 - 2);
        });
      }
    };
  }, [imageUrl, detections]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full object-contain"
      style={{ maxWidth: "100%", maxHeight: "100%" }}
    />
  );
};

export default BboxOverlay;