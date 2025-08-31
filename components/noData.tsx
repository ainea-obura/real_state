import { CircleFadingPlus } from "lucide-react";
import React, { useMemo } from "react";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

import { Button } from "./ui/button";

interface NoDataProps {
  setIsOpen: (isOpen: boolean) => void;
  buttonText: string;
}

const NoData: React.FC<NoDataProps> = ({ setIsOpen, buttonText }) => {
  const animation = useMemo(
    () => (
      <DotLottieReact
        src="/images/no-data.lottie"
        className="w-full max-w-2xl h-auto"
        loop
        autoplay
      />
    ),
    []
  );

  return (
    <div className="flex flex-col justify-center items-center gap-4 w-full h-full">
      {animation}
      <Button
        className="flex items-center gap-4 hover:bg-primary/80 mt-20 transition-all duration-300 ease-in-out cursor-pointer"
        onClick={() => setIsOpen(true)} // This is where the modal should open
      >
        <CircleFadingPlus />
        {buttonText}
      </Button>
    </div>
  );
};

export default NoData;
