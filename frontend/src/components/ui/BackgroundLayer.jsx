import { MeshGradient } from "@paper-design/shaders-react";
import { useTheme } from "../../context/useTheme";

export function BackgroundLayer() {
  const { theme, videoMode } = useTheme();
  const isDark = theme !== "light";

  // Light mode: White/cream tones | Dark mode: Black/dark tones
  const meshColors = isDark
    ? ["#000000", "#0a0a0a", "#111111", "#080808"] // Pure black/dark
    : ["#ffffff", "#fafafa", "#f5f5f5", "#ffffff"]; // Pure white/light
  const meshBg = isDark ? "#000000" : "#ffffff";

  return (
    <>
      {videoMode === "video" ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            objectFit: "cover",
            zIndex: -10
          }}
        >
          <source
            src="https://cdn.pixabay.com/video/2021/08/04/83863-584743236_large.mp4"
            type="video/mp4"
          />
        </video>
      ) : (
        <div className="mesh-bg">
          <MeshGradient
            style={{ width: "100%", height: "100%" }}
            colors={meshColors}
            speed={0.3}
            backgroundColor={meshBg}
          />
        </div>
      )}
    </>
  );
}
