import { MeshGradient } from "@paper-design/shaders-react";
import { useTheme } from "../../context/useTheme";

export function BackgroundLayer() {
  const { theme, videoMode } = useTheme();
  const isDark = theme !== "light";

  // Clay bg tones (Phase 2): light = cream/lavender around --clay-bg #F5F2FB;
  // dark = charcoal around --clay-bg #211E29. Kept subtle — clay cards sit on top.
  const meshColors = isDark
    ? ["#211E29", "#1B1822", "#2B2735", "#181520"] // clay charcoal/purple-dark
    : ["#F5F2FB", "#EFEBF8", "#F5F2FB", "#E8E2F6"]; // clay cream/lavender
  const meshBg = isDark ? "#211E29" : "#F5F2FB";

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
