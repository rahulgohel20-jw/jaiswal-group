'use client';

import { useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MENU_MEGA_MOBILE } from '@/config/menu.config';
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

export function MegaMenuMobile() {
  const { pathname } = useLocation();

  // Memoize matchPath to prevent unnecessary re-renders
  const matchPath = useCallback(
    (path) =>
      path === pathname || (path.length > 1 && pathname.startsWith(path)),
    [pathname],
  );

  // Global classNames for consistent styling
  const classNames = {
    root: 'space-y-1',
    group: 'gap-px',
    label:
      'uppercase text-xs font-medium text-muted-foreground/70 pt-2.25 pb-px',
    separator: '',
    item: 'h-8 hover:bg-transparent text-accent-foreground hover:text-primary data-[selected=true]:text-primary data-[selected=true]:bg-muted data-[selected=true]:font-medium',
    sub: '',
    subTrigger:
      'h-8 hover:bg-transparent text-accent-foreground hover:text-primary data-[selected=true]:text-primary data-[selected=true]:bg-muted data-[selected=true]:font-medium',
    subContent: 'py-0',
    indicator: '',
  };

  const buildMenu = (items) => {
    return items.map((item, index) => {
      if (item.heading) {
        return buildMenuHeading(item, index);
      } else if (!item.disabled) {
        return buildMenuItemRoot(item, index);
      } else {
        return <></>;
      }
    });
  };

  const buildMenuItemRoot = (item, index) => {
    if (item.children) {
      return (
        <AccordionMenuSub key={index} value={item.path || `root-${index}`}>
          <AccordionMenuSubTrigger className="text-sm font-medium">
            {item.icon && <item.icon data-slot="accordion-menu-icon" />}
            <div className="flex items-center justify-between grow gap-2">
              <span data-slot="accordion-menu-title">{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" size="sm" className="ms-auto">
                  {item.badge}
                </Badge>
              )}
            </div>
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
          className="text-sm font-medium"
        >
          <Link to={item.path || '#'} className="">
            {item.icon && <item.icon data-slot="accordion-menu-icon" />}
            <div className="flex items-center justify-between grow gap-2">
              <span data-slot="accordion-menu-title">{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" size="sm" className="ms-auto">
                  {item.badge}
                </Badge>
              )}
            </div>
          </Link>
        </AccordionMenuItem>
      );
    }
  };

  const buildMenuItemChildren = (items, level = 0) => {
    return items.map((item, index) => {
      if (!item.disabled) {
        return buildMenuItemChild(item, index, level);
      } else {
        return <></>;
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
            {item.icon && <item.icon data-slot="accordion-menu-icon" />}
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
            {item.badge && (
              <Badge variant="secondary" size="sm" className="ms-auto">
                {item.badge}
              </Badge>
            )}
          </AccordionMenuSubTrigger>
          <AccordionMenuSubContent
            type="single"
            collapsible
            parentValue={item.path || `child-${level}-${index}`}
            className={cn('ps-4', !item.collapse && 'relative')}
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
          <Link to={item.path || '#'}>
            {item.icon && <item.icon data-slot="accordion-menu-icon" />}
            <div className="flex items-center justify-between grow gap-2">
              <span>{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" size="sm" className="ms-auto">
                  {item.badge}
                </Badge>
              )}
            </div>
          </Link>
        </AccordionMenuItem>
      );
    }
  };

  const buildMenuHeading = (item, index) => {
    return <AccordionMenuLabel key={index}>{item.heading}</AccordionMenuLabel>;
  };

  return (
    <div className="flex grow shrink-0 py-5 px-5">
      <AccordionMenu
        selectedValue={pathname}
        matchPath={matchPath}
        type="single"
        collapsible
        classNames={classNames}
      >
        {buildMenu(MENU_MEGA_MOBILE)}
      </AccordionMenu>
    </div>
  );
}
