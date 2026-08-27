import { ImageResponse } from "next/og";

export const alt = "Dabber — Louez ou faites louer votre matériel en Tunisie";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#080b12",
          color: "white",
          padding: "68px 76px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              height: 18,
              width: 18,
              borderRadius: 999,
              background: "#facc15",
            }}
          />
          <div style={{ fontSize: 34, fontWeight: 800 }}>Dabber</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -3 }}>
            Votre matériel qui dort
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 72,
              fontWeight: 800,
              letterSpacing: -3,
              color: "#facc15",
            }}
          >
            peut vous rapporter.
          </div>
          <div style={{ marginTop: 30, fontSize: 26, color: "#c4c8d0" }}>
            Publiez votre matériel à louer, ou trouvez ce qu’il vous faut, partout en Tunisie.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
