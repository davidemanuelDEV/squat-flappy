import type { Metadata } from "next";
import DailyBoardPage from "@/components/DailyBoardPage";
import {
  APP_NAME,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  ogImageUrl,
  servingOrigin,
} from "@/lib/site";

const site = servingOrigin();
const ogImage = ogImageUrl({ origin: site });

export const metadata: Metadata = {
  title: `Daily board — ${APP_NAME}`,
  description: `Today’s ${APP_NAME} daily board (Pacific gate seed). No camera required.`,
  openGraph: {
    title: `Daily board — ${APP_NAME}`,
    description: `Today’s ${APP_NAME} daily board (Pacific gate seed). No camera required.`,
    url: `${site}/board`,
    type: "website",
    siteName: APP_NAME,
    images: [
      {
        url: ogImage,
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: `${APP_NAME} daily board`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Daily board — ${APP_NAME}`,
    description: `Today’s ${APP_NAME} daily board (Pacific gate seed). No camera required.`,
    images: [ogImage],
  },
};

export default function BoardRoute() {
  return <DailyBoardPage />;
}
