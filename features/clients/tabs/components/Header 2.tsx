import { ReactNode } from "react";

interface HeaderProps {
  title: string;
  description: string;
  children?: ReactNode;
}

const Header = ({ title, description, children }: HeaderProps) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-semibold text-gray-900 dark:text-gray-100 text-2xl">
            {title}
          </h1>
          <p
            className="text-gray-600 dark:text-gray-400 text-sm"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
};

export default Header;
