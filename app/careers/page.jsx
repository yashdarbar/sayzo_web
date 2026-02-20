import CareersClient from "./CareersClient";

export const metadata = {
  title: "Careers | Join the SAYZO Team",
  description: "Explore open positions at SAYZO. Join us in building the future of neighborhood services.",
  openGraph: {
    title: "Work at SAYZO",
    description: "Check out our latest job openings and be part of a community-first team.",
    url: "https://sayzo.in/careers",
  },
};

export default function Page() {
  return <CareersClient />;
}