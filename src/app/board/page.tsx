import type { Metadata } from "next";
import DailyBoardPage from "@/components/DailyBoardPage";
import { APP_NAME, servingOrigin } from "@/lib/site";

const site = servingOrigin();

export const metadata: Metadata = {
  title: `Daily board — ${APP_NAME}`,
  description: `Today’s ${APP_NAME} daily board (Pacific gate seed). No camera required.`,
  openGraph: {
    title: `Daily board — ${APP_NAME}`,
    description: `Today’s ${APP_NAME} daily board (Pacific gate seed). No camera required.`,
    url: `${site}/board`,
    type: "website",
    siteName: APP_NAME,
    images: [{ url: "/api/og", width: 1200, height: 630, alt: `${APP_NAME} daily board` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Daily board — ${APP_NAME}`,
    description: `Today’s ${APP_NAME} daily board (Pacific gate seed). No camera required.`,
    images: ["/api/og"],
  },
};

export default function BoardRoute() {
  return <DailyBoardPage />;
}
