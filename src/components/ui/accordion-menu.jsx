'use client';

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { ChevronDown } from 'lucide-react';
import { Accordion as AccordionPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

const AccordionMenuContext = React.createContext({
  matchPath: () => false,
  selectedValue: '',
  setSelectedValue: () => {},
  nestedStates: {},
  setNestedStates: () => {},
});

function AccordionMenu({
  className,
  matchPath = () => false,
  classNames,
  children,
  selectedValue,
  onItemClick,
  ...props
}) {
  const [internalSelectedValue, setInternalSelectedValue] =
    React.useState(selectedValue);
  React.useEffect(() => {
    setInternalSelectedValue(selectedValue);
  }, [selectedValue]);

  const initialNestedStates = React.useMemo(() => {
    const getActiveChain = (nodes, chain = []) => {
      let result = [];
      React.Children.forEach(nodes, (node) => {
        if (React.isValidElement(node)) {
          const { value, children } = node.props;

          const newChain = value ? [...chain, value] : chain;
          if (value && (value === selectedValue || matchPath(value))) {
            result = newChain;
          } else if (children) {
            const childChain = getActiveChain(children, newChain);
            if (childChain.length > 0) {
              result = childChain;
            }
          }
        }
      });
      return result;
    };

    const chain = getActiveChain(children);
    const trimmedChain =
      chain.length > 1 ? chain.slice(0, chain.length - 1) : chain;
    const mapping = {};
    if (trimmedChain.length > 0) {
      if (props.type === 'multiple') {
        mapping['root'] = trimmedChain;
      } else {
        mapping['root'] = trimmedChain[0];
        for (let i = 0; i < trimmedChain.length - 1; i++) {
          mapping[trimmedChain[i]] = trimmedChain[i + 1];
        }
      }
    }
    return mapping;
  }, [children, matchPath, selectedValue, props.type]);

  const [nestedStates, setNestedStates] = React.useState(initialNestedStates);
  const multipleValue = Array.isArray(nestedStates['root'])
    ? nestedStates['root']
    : typeof nestedStates['root'] === 'string'
      ? [nestedStates['root']]
      : [];

  const singleValue = nestedStates['root'] ?? '';

  return (
    <AccordionMenuContext.Provider
      value={{
        matchPath,
        selectedValue: internalSelectedValue,
        setSelectedValue: setInternalSelectedValue,
        classNames,
        onItemClick,
        nestedStates,
        setNestedStates,
      }}
    >
      {props.type === 'single' ? (
        <AccordionPrimitive.Root
          data-slot="accordion-menu"
          value={singleValue}
          className={cn('w-full', classNames?.root, className)}
          onValueChange={(value) =>
            setNestedStates((prev) => ({ ...prev, root: value }))
          }
          {...props}
          role="menu"
        >
          {children}
        </AccordionPrimitive.Root>
      ) : (
        <AccordionPrimitive.Root
          data-slot="accordion-menu"
          value={multipleValue}
          className={cn('w-full', classNames?.root, className)}
          onValueChange={(value) =>
            setNestedStates((prev) => ({ ...prev, root: value }))
          }
          {...props}
          role="menu"
        >
          {children}
        </AccordionPrimitive.Root>
      )}
    </AccordionMenuContext.Provider>
  );
}

function AccordionMenuGroup({ children, className, ...props }) {
  const { classNames } = React.useContext(AccordionMenuContext);
  return (
    <div
      data-slot="accordion-menu-group"
      role="group"
      className={cn('space-y-0.5', classNames?.group, className)}
      {...props}
    >
      {children}
    </div>
  );
}

function AccordionMenuLabel({ children, className, ...props }) {
  const { classNames } = React.useContext(AccordionMenuContext);

  return (
    <div
      data-slot="accordion-menu-label"
      role="presentation"
      className={cn(
        'px-2 py-1.5 text-xs font-medium text-muted-foreground',
        classNames?.label,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function AccordionMenuSeparator({ className, ...props }) {
  const { classNames } = React.useContext(AccordionMenuContext);
  return (
    <div
      data-slot="accordion-menu-separator"
      role="separator"
      className={cn('my-1 h-px bg-border', classNames?.separator, className)}
      {...props}
    />
  );
}

const itemVariants = cva(
  'relative cursor-pointer select-none flex w-full text-start items-center text-foreground rounded-lg gap-2 px-2 py-1.5 text-sm outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground disabled:opacity-50 disabled:bg-transparent focus-visible:bg-accent focus-visible:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:opacity-60 [&_svg:not([class*=size-])]:size-4 [&_svg]:shrink-0 [&_a]:flex [&>a]:w-full [&>a]:items-center [&>a]:gap-2',
  {
    variants: {
      variant: {
        default: '',
        destructive:
          'text-destructive hover:text-destructive focus:text-destructive hover:bg-destructive/5 focus:bg-destructive/5 data-[active=true]:bg-destructive/5',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function AccordionMenuItem({
  className,
  children,
  variant,
  asChild,
  onClick,
  ...props
}) {
  const { classNames, selectedValue, matchPath, onItemClick } =
    React.useContext(AccordionMenuContext);
  return (
    <AccordionPrimitive.Item className="flex" {...props}>
      <AccordionPrimitive.Header className="flex w-full">
        <AccordionPrimitive.Trigger
          asChild={asChild}
          data-slot="accordion-menu-item"
          className={cn(itemVariants({ variant }), classNames?.item, className)}
          onClick={(e) => {
            if (onItemClick) {
              onItemClick(props.value, e);
            }

            if (onClick) {
              onClick(e);
            }
            e.preventDefault();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const target = e.currentTarget;
              const firstChild = target.firstElementChild;
              if (firstChild) {
                firstChild.click();
              }
            }
          }}
          data-selected={
            matchPath(props.value) || selectedValue === props.value
              ? 'true'
              : undefined
          }
        >
          {children}
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
    </AccordionPrimitive.Item>
  );
}

function AccordionMenuSub({ className, children, ...props }) {
  const { classNames } = React.useContext(AccordionMenuContext);
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-menu-sub"
      className={cn(classNames?.sub, className)}
      {...props}
    >
      {children}
    </AccordionPrimitive.Item>
  );
}

function AccordionMenuSubTrigger({ className, children }) {
  const { classNames } = React.useContext(AccordionMenuContext);
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-menu-sub-trigger"
        className={cn(
          'w-full relative flex items-center cursor-pointer select-none text-start rounded-lg gap-2 px-2 py-1.5 text-sm outline-hidden text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([role=img]):not([class*=text-])]:opacity-60 [&_svg:not([class*=size-])]:size-4 [&_svg]:shrink-0',
          classNames?.subTrigger,
          className,
        )}
      >
        <>
          {children}
          <ChevronDown
            data-slot="accordion-menu-sub-indicator"
            className={cn(
              'ms-auto size-3.5! shrink-0 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:-rotate-180',
            )}
          />
        </>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionMenuSubContent({
  className,
  children,
  type,
  collapsible,
  defaultValue,
  parentValue,
  ...props
}) {
  const { nestedStates, setNestedStates, classNames } =
    React.useContext(AccordionMenuContext);
  let currentValue;
  if (type === 'multiple') {
    const stateValue = nestedStates[parentValue];
    if (Array.isArray(stateValue)) {
      currentValue = stateValue;
    } else if (typeof stateValue === 'string') {
      currentValue = [stateValue];
    } else if (defaultValue) {
      currentValue = Array.isArray(defaultValue)
        ? defaultValue
        : [defaultValue];
    } else {
      currentValue = [];
    }
  } else {
    currentValue = nestedStates[parentValue] ?? defaultValue ?? '';
  }

  return (
    <AccordionPrimitive.Content
      data-slot="accordion-menu-sub-content"
      className={cn(
        'ps-5',
        'overflow-hidden transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
        classNames?.subContent,
        className,
      )}
      {...props}
    >
      {type === 'multiple' ? (
        <AccordionPrimitive.Root
          className={cn('w-full py-0.5', classNames?.subWrapper)}
          type="multiple"
          value={currentValue}
          role="menu"
          data-slot="accordion-menu-sub-wrapper"
          onValueChange={(value) => {
            const newValue = Array.isArray(value) ? value : [value];
            setNestedStates((prev) => ({ ...prev, [parentValue]: newValue }));
          }}
        >
          {children}
        </AccordionPrimitive.Root>
      ) : (
        <AccordionPrimitive.Root
          className={cn('w-full py-0.5', classNames?.subWrapper)}
          type="single"
          collapsible={collapsible}
          value={currentValue}
          role="menu"
          data-slot="accordion-menu-sub-wrapper"
          onValueChange={(value) =>
            setNestedStates((prev) => ({ ...prev, [parentValue]: value }))
          }
        >
          {children}
        </AccordionPrimitive.Root>
      )}
    </AccordionPrimitive.Content>
  );
}

function AccordionMenuIndicator({ className, ...props }) {
  const { classNames } = React.useContext(AccordionMenuContext);
  return (
    <span
      aria-hidden="true"
      data-slot="accordion-menu-indicator"
      className={cn(
        'ms-auto flex items-center font-medium',
        classNames?.indicator,
        className,
      )}
      {...props}
    />
  );
}

export {
  AccordionMenu,
  AccordionMenuGroup,
  AccordionMenuIndicator,
  AccordionMenuItem,
  AccordionMenuLabel,
  AccordionMenuSeparator,
  AccordionMenuSub,
  AccordionMenuSubContent,
  AccordionMenuSubTrigger,
};
