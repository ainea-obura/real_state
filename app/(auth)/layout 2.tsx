"use client";
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function AuthLeftContent() {
  return (
    <div className="hidden md:block top-0 left-0 fixed w-1/2 h-screen">
      {/* Multi-layer Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>

      {/* Background Image with Better Blending */}
      <Image
        src={"/images/loginPageFrame.svg"}
        alt="Login Page Frame"
        fill={true}
        className="opacity-20 object-center object-cover mix-blend-soft-light"
      />

      {/* Main Content Container */}
      <div className="z-20 relative flex flex-col justify-center items-center px-8 w-full h-full">
        {/* Logo Container with Layered Circles */}
        <div className="relative flex justify-center items-center mb-8">
          {/* Outer Purple Circle */}
          <div
            className="flex justify-center items-center bg-purple-600 shadow-2xl rounded-full w-72 h-72"
            style={{ width: "288.576px", height: "288.576px" }}
          >
            {/* Inner White Circle */}
            <div
              className="flex justify-center items-center bg-white shadow-lg rounded-full w-60 h-60"
              style={{ width: "240.48px", height: "240.48px" }}
            >
              {/* Logo */}
              <div
                className="flex justify-center items-center w-48 h-48"
                style={{ width: "192.384px", height: "192.384px" }}
              >
                <Image
                  src={"/images/logo.svg"}
                  alt={`${process.env.NEXT_PUBLIC_SITE_NAME} Logo`}
                  width={180.36}
                  height={120.24}
                  className="drop-shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="max-w-lg text-white text-center">
          <h1 className="my-6 font-medium text-3xl xl:text-4xl leading-normal">
            <span className="bg-clip-text bg-gradient-to-r from-white to-blue-100 text-transparent">
              Effortlessly Manage Your{" "}
              <span className="text-yellow-300">Properties</span>
            </span>
          </h1>

          <p className="font-light text-blue-100 text-lg leading-relaxed">
            Track payments, oversee your portfolio, and stay connected to your
            real estate goals—all in one place
          </p>
        </div>

        {/* Decorative Elements */}
        <div className="top-10 left-10 absolute bg-white/5 blur-xl rounded-full w-20 h-20"></div>
        <div className="right-10 bottom-20 absolute bg-blue-300/10 blur-2xl rounded-full w-48 h-48"></div>
        <div className="top-1/3 right-8 absolute bg-purple-300/10 blur-lg rounded-full w-16 h-16"></div>
      </div>

      {/* Footer */}
      <div className="right-0 bottom-0 left-0 z-20 absolute">
        <div className="bg-gradient-to-t from-black/30 to-transparent p-6">
          <p className="font-light text-blue-100 text-sm text-center">
            Designed & Developed By{" "}
            <span className="font-medium text-white">HoyHub</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function AuthRightContent({
  heading,
  subheading,
  children,
}: {
  heading: string;
  subheading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col bg-gray-50 w-full h-screen">
      {/* Mobile Logo with White Circle Only */}
      <div className="md:hidden flex justify-center pt-8 pb-6">
        <div className="flex justify-center items-center">
          {/* White Circle */}
          <div
            className="flex justify-center items-center bg-white rounded-full w-32 h-32"
            style={{ width: "129.154px", height: "129.154px" }}
          >
            {/* Logo */}
            <div
              className="flex justify-center items-center w-24 h-24"
              style={{ width: "96.866px", height: "96.866px" }}
            >
              <Image
                src={"/images/logo.svg"}
                alt={`${process.env.NEXT_PUBLIC_SITE_NAME} Logo`}
                width={100.8}
                height={70.56}
                className="drop-shadow-md"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content Container with Enhanced Styling */}
      <div className="flex-1 px-6 overflow-y-auto">
        <div className="flex flex-col justify-center items-center mx-auto py-8 md:py-12 w-full max-w-[500px] min-h-full">
          {/* Header with Better Typography */}
          <div className="flex flex-col items-center space-y-3 mb-10 text-center">
            <h1 className="font-bold text-gray-900 text-3xl leading-tight">
              {heading}
            </h1>
            <p className="max-w-md text-gray-600 text-lg leading-relaxed">
              {subheading}
            </p>
          </div>

          {/* Form Content with Card Design */}
          <div className="rounded-2xl w-full">{children}</div>
        </div>
      </div>

      {/* Enhanced Footer */}
      <div className="bg-white px-6 py-6 border-gray-200 border-t">
        <div className="flex justify-center mx-auto max-w-[500px]">
          <Link
            href={"#"}
            className="font-medium text-gray-500 hover:text-indigo-600 text-sm transition-colors duration-200"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get the current path
  const pathname = usePathname();

  // Determine the active page
  const isSignIn = pathname === "/sign-in";
  const isVerifyOtp = pathname === "/verify-otp";
  const isVerifyEmail = pathname === "/verify-email";
  const isUserType = pathname === "/user-type";
  const isForgetPassword = pathname === "/forget-password";
  const isCreateCompany = pathname === "/create-company";

  const heading = isSignIn
    ? `Sign In to ${process.env.NEXT_PUBLIC_SITE_NAME}`
    : isVerifyOtp
    ? "Verify Your OTP"
    : isVerifyEmail
    ? "Verify Email"
    : isUserType
    ? "Choose User Type"
    : isForgetPassword
    ? "Reset Password"
    : isCreateCompany
    ? "Create Company"
    : `Welcome to ${process.env.NEXT_PUBLIC_SITE_NAME}`;

  const subheading = isSignIn
    ? "Access your dashboard to track rent payments, manage tenants, and stay on top of your property portfolio."
    : isVerifyOtp
    ? "Enter the one-time code sent to your email to securely access your property management tools."
    : isVerifyEmail
    ? "Verify your email to unlock features for managing leases, maintenance, and financials."
    : isUserType
    ? "Select your role to get a tailored experience for landlords, property managers, or agencies."
    : isForgetPassword
    ? "Forgot your password? Reset it to regain access to your property management dashboard."
    : isCreateCompany
    ? "Set up your company profile to manage multiple properties, staff, and financials in one place."
    : `Join ${process.env.NEXT_PUBLIC_SITE_NAME} to streamline your property management and maximize your rental income.`;

  return (
    <div className="w-full h-screen overflow-hidden">
      <AuthLeftContent />
      <div className="md:ml-[50%] w-full md:w-1/2 h-screen">
        <AuthRightContent heading={heading} subheading={subheading}>
          {children}
        </AuthRightContent>
      </div>
    </div>
  );
}
