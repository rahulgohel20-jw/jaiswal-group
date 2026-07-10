import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Tags = ({ title, className }) => {
  const items = [
    { label: 'Web Design' },
    { label: 'Code Review' },
    { label: 'Figma' },
    { label: 'Product Development' },
    { label: 'Webflow' },
    { label: 'AI' },
    { label: 'noCode' },
    { label: 'Management' },
  ];

  const renderItem = (item, index) => {
    return (
      <Badge key={index} variant="secondary">
        {item.label}
      </Badge>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2.5 mb-2">
          {items.map((item, index) => {
            return renderItem(item, index);
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export { Tags };
