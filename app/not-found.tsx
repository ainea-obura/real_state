"use client";
import dynamic from "next/dynamic";
const Player = dynamic(() => import("@lottiefiles/react-lottie-player").then(mod => mod.Player), { ssr: false });

export default function NotFound() {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-white">
      <Player
        src="/errors/404.json"
        background="transparent"
        speed={1}
        style={{ width: 300, height: 300 }}
        loop
        autoplay
      />
      <h2 className="mt-2 text-2xl font-semibold text-gray-700">
        Page Not Found
      </h2>
      <p className="mt-2 text-center text-gray-500">
        Sorry, the page you are looking for does not exist.
      </p>
      <a
        href="/"
        className="px-6 py-2 mt-6 text-white bg-blue-600 rounded shadow transition hover:bg-blue-700"
      >
        Go Home
      </a>
    </div>
  );
}
