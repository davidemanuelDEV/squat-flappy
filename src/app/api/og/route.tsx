import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { APP_LINE, APP_NAME } from "@/lib/site";

export const runtime = "edge";

function parseScore(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const beat = parseScore(searchParams.get("beat"));
  const reps = parseScore(searchParams.get("reps"));
  const hasScore = beat != null;
  const sub = hasScore
    ? reps != null && reps > 0
      ? `${reps} squats`
      : "gates cleared — beat me"
    : "Air squat game · desk exercise game";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background:
            "linear-gradient(180deg, #06161a 0%, #0b2e2c 45%, #134e4a 80%, #052e16 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 80,
            left: 420,
            width: 360,
            height: 360,
            borderRadius: 999,
            background:
              "radial-gradient(circle, rgba(163,230,53,0.5) 0%, rgba(163,230,53,0) 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            zIndex: 1,
          }}
        >
          <div
            style={{
              color: "#bef264",
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: 6,
              textTransform: "uppercase",
            }}
          >
            {APP_NAME}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 12,
              marginBottom: 8,
              position: "relative",
              width: 120,
              height: 90,
            }}
          >
            <div
              style={{
                width: 88,
                height: 72,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 35% 30%, #ecfccb 0%, #a3e635 45%, #365314 100%)",
                border: "3px solid #1a2e05",
                display: "flex",
                position: "relative",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 4,
                top: 28,
                width: 0,
                height: 0,
                borderTop: "14px solid transparent",
                borderBottom: "14px solid transparent",
                borderLeft: "28px solid #facc15",
                display: "flex",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 36,
                top: 18,
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#fff",
                border: "2px solid #052e16",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#14532d",
                  display: "flex",
                }}
              />
            </div>
          </div>

          <div
            style={{
              color: "#ecfdf5",
              fontSize: hasScore ? 160 : 56,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: hasScore ? -4 : 0,
            }}
          >
            {hasScore ? String(beat) : APP_LINE}
          </div>
          <div
            style={{
              color: "#99f6e4",
              fontSize: 32,
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            {sub}
          </div>
          <div
            style={{
              marginTop: 28,
              color: "#ecfdf5",
              fontSize: 36,
              fontWeight: 800,
            }}
          >
            {hasScore
              ? "Think you can beat me?"
              : "Your standing desk is now an arcade."}
          </div>
          <div
            style={{
              marginTop: 16,
              color: "#2dd4bf",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            squatflappy.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
