import { AccordionMenuItem } from '@/components/ui/accordion-menu';

export function SearchSettingsItems({ items }) {
  return (
    <>
      {items.map((item, index) => (
        <AccordionMenuItem key={index} value={item.info}>
          <item.icon size={16} />
          <span>{item.info}</span>
        </AccordionMenuItem>
      ))}
    </>
  );
}
