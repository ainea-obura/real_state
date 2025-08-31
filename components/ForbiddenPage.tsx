"use client"
import dynamic from "next/dynamic";

const Player = dynamic(
  () => import("@lottiefiles/react-lottie-player").then(mod => mod.Player),
  { ssr: false }
);

const ForbiddenPage = () => (
  <div className="flex flex-col justify-center items-center">
    <Player
      src="/errors/403.json" // or "/errors/403.lottie" if you prefer
      background="transparent"
      speed={1}
      style={{ width: 300, height: 300 }}
      loop
      autoplay
    />
    <h2 className="mt-2 text-2xl font-semibold text-gray-700">Access Denied</h2>
    <p className="mt-2 text-center text-gray-500">
      You don&apos;t have permission to view this page.
    </p>
    <a
      href="/"
      className="px-6 py-2 mt-6 text-white rounded shadow transition bg-primary hover:bg-primary/90"
    >
      Go Home
    </a>
  </div>
);

export default ForbiddenPage; 