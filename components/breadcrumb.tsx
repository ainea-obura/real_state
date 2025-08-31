import React from 'react';

import { MainMenu } from './navBar';
import {
    Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator,
} from './ui/breadcrumb';

const Breadcrumbs = ({ currentPath }: { currentPath: string }) => {
  // Function to find the breadcrumb trail
  const getBreadcrumbTrail = (path: string) => {
    let breadcrumbs: { name: string; link: string }[] = [];

    // Traverse the MainMenu and build the breadcrumb trail
    MainMenu.forEach((item) => {
      if (item.url === path) {
        breadcrumbs.push({ name: item.name, link: item.url });
      }

      // If it has subMenus, iterate through them
      if (item.subMenus) {
        item.subMenus.forEach((subMenu) => {
          if (subMenu.url === path) {
            // Add parent menu (item name) and subMenu (current path)
            breadcrumbs = [
              { name: item.name, link: item.url || "#" },
              { name: subMenu.name, link: subMenu.url },
            ];
          }
        });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbTrail = getBreadcrumbTrail(currentPath);

  return (
    <div className="flex flex-col gap-2">
      {/* <h1 className="font-medium">{currentPageName}</h1> */}
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbTrail.map((item, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={item.link}
                  className={index === 0 ? "text-primary font-medium" : ""}
                >
                  {item.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
              {index < breadcrumbTrail.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};

export default Breadcrumbs;
