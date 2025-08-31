"use client"
import dynamic from "next/dynamic";

const Player = dynamic(
  () => import("@lottiefiles/react-lottie-player").then(mod => mod.Player),
  { ssr: false }
);
import { useSession } from "next-auth/react";

export default function WelcomePage() {
  const { data: session } = useSession();
  const email = session?.user?.email;

  return (
    <div className="flex flex-col justify-center items-center">
      <Player
        src="/errors/welcome.json"
        background="transparent"
        speed={1}
        style={{ width: 300, height: 300 }}
        loop
        autoplay
      />

      <p className="mt-2 text-center text-gray-500">
        We're glad to have you back. Manage your properties, finances, and more
        with Real State.
      </p>
      <button className="px-6 py-2 mt-6 text-white bg-blue-600 rounded shadow transition hover:bg-blue-700">
        Get Started
      </button>
    </div>
  );
}
