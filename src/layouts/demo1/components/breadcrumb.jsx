import { Fragment } from 'react';
import { ChevronRight, Home, Slash } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { MENU_SIDEBAR } from '@/config/menu.config';
import { cn } from '@/lib/utils';
import { useMenu } from '@/hooks/use-menu';

export function Breadcrumb() {
  const { pathname } = useLocation();
  const { getBreadcrumb, isActive } = useMenu(pathname);
  const items = getBreadcrumb(MENU_SIDEBAR);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      className="flex items-center flex-wrap gap-1 mb-6"
      aria-label="Breadcrumb"
    >
      {/* Home Icon */}
      <Link
        to="/"
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-md',
          'text-sm font-medium transition-all duration-200',
          'text-muted-foreground hover:text-foreground',
          'hover:bg-accent/50',
        )}
        aria-label="Home"
      >
        <Home className="size-3.5" />
        <span className="hidden sm:inline">Home</span>
      </Link>

      {items.map((item, index) => {
        const last = index === items.length - 1;
        const active = item.path ? isActive(item.path) : false;

        return (
          <Fragment key={`breadcrumb-${index}`}>
            {/* Separator - using Slash for cleaner look */}
            <Slash
              className="size-4 text-muted-foreground/40 -rotate-12"
              aria-hidden="true"
            />

            {/* Breadcrumb Item */}
            {item.path && !last ? (
              <Link
                to={item.path}
                className={cn(
                  'inline-flex items-center px-2 py-1 rounded-md',
                  'text-sm font-medium transition-all duration-200',
                  'text-muted-foreground hover:text-foreground',
                  'hover:bg-accent/50',
                  'relative group',
                )}
              >
                {item.title}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full" />
              </Link>
            ) : (
              <span
                className={cn(
                  'inline-flex items-center px-2 py-1 rounded-md ',
                  'text-sm font-medium',
                  active || last
                    ? 'text-foreground font-semibold bg-accent '
                    : 'text-muted-foreground',
                )}
              >
                {item.title}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
