'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Tabs = ({ defaultValue, tabs = [], className, onChange }) => {
  return (
    <Tabs
      defaultValue={defaultValue}
      onValueChange={onChange}
      className={cn('w-full', className)}
    >
      <TabsList className="w-full grid grid-cols-3 rounded-none border-b h-auto p-0">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              'rounded-none py-3 text-sm font-medium',
              'data-[state=active]:border-b-2 data-[state=active]:border-primary',
              'data-[state=active]:text-foreground text-muted-foreground',
            )}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {/** Content is injected from parent */}
      {tabs.map((tab) => tab.content)}
    </Tabs>
  );
};

export default Tabs;
