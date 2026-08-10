'use client';

import { useCallback, useMemo } from 'react';
import { getOrgIdFromToken } from '@/utils/auth';
import { Link, useLocation } from 'react-router-dom';
import { MENU_SIDEBAR, MENU_SIDEBAR_ADMIN } from '@/config/menu.config';
import { cn } from '@/lib/utils';
import {
  AccordionMenu,
  AccordionMenuGroup,
  AccordionMenuItem,
  AccordionMenuLabel,
  AccordionMenuSub,
  AccordionMenuSubContent,
  AccordionMenuSubTrigger,
} from '@/components/ui/accordion-menu';
import { Badge } from '@/components/ui/badge';

export function SidebarMenu() {
  const { pathname } = useLocation();

  const menuItems = useMemo(() => {
    const organizationId = getOrgIdFromToken();
    return organizationId === 1 ? MENU_SIDEBAR : MENU_SIDEBAR_ADMIN;
  }, []);

  // Memoize matchPath to prevent unnecessary re-renders
  const matchPath = useCallback(
    (path) =>
      path === pathname || (path.length > 1 && pathname.startsWith(path)),
    [pathname],
  );

  // Global classNames for consistent styling
  // Note: transition-none on the selected state prevents the color from
  // animating through hover/other colors before landing on blue.
  const classNames = {
    root: 'lg:ps-1 space-y-3',
    group: 'gap-px',
    label:
      'uppercase text-xs font-medium text-muted-foreground/70 pt-2.25 pb-px',
    separator: '',
    item:
      'h-8 rounded-md text-accent-foreground ' +
      'hover:bg-blue-50 hover:text-blue-600 ' +
      'data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-600 ' +
      'data-[selected=true]:font-medium data-[selected=true]:transition-none',
    sub: '',
    subTrigger:
      'h-8 rounded-md text-accent-foreground ' +
      'hover:bg-blue-50 hover:text-blue-600 ' +
      'data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-600 ' +
      'data-[selected=true]:font-medium data-[selected=true]:transition-none',
    subContent: 'py-0',
    indicator: '',
  };

  const buildMenu = (items) => {
    return items.map((item, index) => {
      if (item.heading) {
        return buildMenuHeading(item, index);
      } else if (item.disabled) {
        return buildMenuItemRootDisabled(item, index);
      } else {
        return buildMenuItemRoot(item, index);
      }
    });
  };

  const buildMenuItemRoot = (item, index) => {
    if (item.children) {
      return (
        <AccordionMenuSub key={index} value={item.path || `root-${index}`}>
          <AccordionMenuSubTrigger className="text-md font-medium">
            {item.icon && (
              <item.icon
                data-slot="accordion-menu-icon"
                className="!w-5 !h-5 flex-shrink-0"
                size={20}
              />
            )}
            <span data-slot="accordion-menu-title">{item.title}</span>
          </AccordionMenuSubTrigger>
          <AccordionMenuSubContent
            type="single"
            collapsible
            parentValue={item.path || `root-${index}`}
            className="ps-6"
          >
            <AccordionMenuGroup>
              {buildMenuItemChildren(item.children, 1)}
            </AccordionMenuGroup>
          </AccordionMenuSubContent>
        </AccordionMenuSub>
      );
    } else {
      return (
        <AccordionMenuItem
          key={index}
          value={item.path || ''}
          className="text-md font-medium"
        >
          <Link to={item.path || '#'} className="flex items-center grow gap-2">
            {item.icon && (
              <item.icon
                data-slot="accordion-menu-icon"
                className="!w-5 !h-5 flex-shrink-0"
                size={20}
              />
            )}
            <span data-slot="accordion-menu-title">{item.title}</span>
          </Link>
        </AccordionMenuItem>
      );
    }
  };

  const buildMenuItemRootDisabled = (item, index) => {
    return (
      <AccordionMenuItem
        key={index}
        value={`disabled-${index}`}
        className="text-md font-medium"
      >
        {item.icon && (
          <item.icon
            data-slot="accordion-menu-icon"
            className="!w-5 !h-5 flex-shrink-0"
            size={20}
          />
        )}
        <span data-slot="accordion-menu-title">{item.title}</span>
        {item.disabled && (
          <Badge variant="secondary" size="sm" className="ms-auto me-[-10px]">
            Soon
          </Badge>
        )}
      </AccordionMenuItem>
    );
  };

  const buildMenuItemChildren = (items, level = 0) => {
    return items.map((item, index) => {
      if (item.disabled) {
        return buildMenuItemChildDisabled(item, index, level);
      } else {
        return buildMenuItemChild(item, index, level);
      }
    });
  };

  const buildMenuItemChild = (item, index, level = 0) => {
    if (item.children) {
      return (
        <AccordionMenuSub
          key={index}
          value={item.path || `child-${level}-${index}`}
        >
          <AccordionMenuSubTrigger className="text-[13px]">
            {item.collapse ? (
              <span className="text-muted-foreground">
                <span className="hidden [[data-state=open]>span>&]:inline">
                  {item.collapseTitle}
                </span>
                <span className="inline [[data-state=open]>span>&]:hidden">
                  {item.expandTitle}
                </span>
              </span>
            ) : (
              item.title
            )}
          </AccordionMenuSubTrigger>
          <AccordionMenuSubContent
            type="single"
            collapsible
            parentValue={item.path || `child-${level}-${index}`}
            className={cn(
              'ps-4',
              !item.collapse && 'relative',
              !item.collapse && (level > 0 ? '' : ''),
            )}
          >
            <AccordionMenuGroup>
              {buildMenuItemChildren(
                item.children,
                item.collapse ? level : level + 1,
              )}
            </AccordionMenuGroup>
          </AccordionMenuSubContent>
        </AccordionMenuSub>
      );
    } else {
      return (
        <AccordionMenuItem
          key={index}
          value={item.path || ''}
          className="text-[13px]"
        >
          <Link to={item.path || '#'}>{item.title}</Link>
        </AccordionMenuItem>
      );
    }
  };

  const buildMenuItemChildDisabled = (item, index, level = 0) => {
    return (
      <AccordionMenuItem
        key={index}
        value={`disabled-child-${level}-${index}`}
        className="text-[13px]"
      >
        <span data-slot="accordion-menu-title">{item.title}</span>
        {item.disabled && (
          <Badge variant="secondary" size="sm" className="ms-auto me-[-10px]">
            Soon
          </Badge>
        )}
      </AccordionMenuItem>
    );
  };

  const buildMenuHeading = (item, index) => {
    return <AccordionMenuLabel key={index}>{item.heading}</AccordionMenuLabel>;
  };

  return (
    <div className="kt-scrollable-y-hover flex grow shrink-0 py-5 px-5 lg:max-h-[calc(100vh-5.5rem)]">
      <AccordionMenu
        selectedValue={pathname}
        matchPath={matchPath}
        type="single"
        collapsible
        classNames={classNames}
      >
        {buildMenu(menuItems)}
      </AccordionMenu>
    </div>
  );
}
