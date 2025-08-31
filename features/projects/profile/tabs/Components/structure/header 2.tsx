const Header = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) => {
  return (
    <div className="flex justify-between items-center gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="font-semibold text-xl leading-none">{title}</h2>
        <p className="text-gray-500 text-sm leading-none">{description}</p>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
};

export default Header;
