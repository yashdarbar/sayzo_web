import UserPage from "@/components/UserPage";

export const metadata = {
  title: "Live Tasks | Find Tasks on SAYZO",
  description: "Browse and apply to real tasks posted by people in your area. Start earning with SAYZO.",
  openGraph: {
    title: "SAYZO Live Tasks",
    url: "https://sayzo.in/live-tasks",
  },
};

export default function LiveTasksPage() {
  return (
    <main>
      <UserPage mode="live" />
    </main>
  );
}
