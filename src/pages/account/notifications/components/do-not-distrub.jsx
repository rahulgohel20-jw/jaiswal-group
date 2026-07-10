import { Bell } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const DoNotDistrub = ({ title, icon, text }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || 'Do Not Disturb'}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        <p className="text-sm text-secondary-foreground">
          Activate 'Do Not Disturb' to silence all notifications and focus
          without interruptions during specified hours or tasks.
        </p>
        <div>
          <Button mode="link" underlined="dashed">
            <Link to="#">Learn more</Link>
          </Button>
        </div>
      </CardContent>
      <CardFooter className="justify-center">
        <Button variant="outline">
          <Link to="#" className="flex items-center gap-1.5">
            <div>{icon || <Bell size={16} />}</div>
            {text || 'Pause Notifications'}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export { DoNotDistrub };
