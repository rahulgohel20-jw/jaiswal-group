import { ChevronFirst } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { useSettings } from '@/providers/settings-provider';
import { Button } from '@/components/ui/button';

export function SidebarHeader() {
  const { settings, storeOption } = useSettings();
  const isCollapsed = settings.layouts.demo1.sidebarCollapse;

  const handleToggleClick = () => {
    storeOption('layouts.demo1.sidebarCollapse', !isCollapsed);
  };

  return (
    <div className="sidebar-header hidden lg:flex items-center relative justify-between px-3 lg:px-6 shrink-0">
      <Link to="/">
        <div className="dark:hidden flex gap-3 items-center">
          <img
            src={toAbsoluteUrl('/media/app/jaiswalgroup-logo.png')}
            className="default-logo h-[45px] max-w-none"
            alt="Default Logo"
          />
          {!isCollapsed && (
            <div>
              <h3 className="font-semibold text-sky-900 whitespace-nowrap">
                Jaiswal Group
              </h3>
              <p className="whitespace-nowrap">Super Admin Panel</p>
            </div>
          )}

          <img
            src={toAbsoluteUrl('/media/app/jaiswalgroup-logo.png')}
            className="small-logo h-[30px] max-w-none"
            alt="Mini Logo"
          />
        </div>
        <div className="hidden dark:flex gap-3 items-center">
          <img
            src={toAbsoluteUrl('/media/app/jaiswalgroup-logo.png')}
            className="default-logo h-[22px] max-w-none"
            alt="Default Dark Logo"
          />

          {!isCollapsed && (
            <div>
              <h3 className="font-semibold text-sky-900 whitespace-nowrap">
                Jaiswal Group
              </h3>
              <p className="whitespace-nowrap">Super Admin Panel</p>
            </div>
          )}

          <img
            src={toAbsoluteUrl('/media/app/jaiswal-group-logo.png')}
            className="small-logo h-[22px] max-w-none"
            alt="Mini Logo"
          />
        </div>
      </Link>
      <Button
        onClick={handleToggleClick}
        size="sm"
        mode="icon"
        variant="outline"
        className={cn(
          'size-7 absolute start-full top-2/4 rtl:translate-x-2/4 -translate-x-2/4 -translate-y-2/4',
          isCollapsed ? 'ltr:rotate-180' : 'rtl:rotate-180',
        )}
      >
        <ChevronFirst className="size-4!" />
      </Button>
    </div>
  );
}