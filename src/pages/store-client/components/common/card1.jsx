import { Fragment } from 'react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Card, CardContent } from '@/components/ui/card';
import { useStoreClient } from '../context';

export function Card1() {
  const { showProductDetailsSheet } = useStoreClient();

  const items = [
    { logo: '1.png', brand: 'Nike' },
    { logo: '2.png', brand: 'Adidas' },
    { logo: '3.png', brand: 'Puma' },
    { logo: '4.png', brand: 'New Balance' },
    { logo: '5.png', brand: 'Converse' },
    { logo: '6.png', brand: 'Reebok' },
    { logo: '7.png', brand: 'Sketchers' },
  ];

  const renderItem = (item, index) => (
    <Card key={index}>
      <CardContent className="flex flex-col items-center justify-center pb-0">
        <div
          onClick={() => showProductDetailsSheet('productid')}
          className="hover:text-primary text-sm font-medium text-mono cursor-pointer"
        >
          {item.brand}
        </div>

        <img
          onClick={() => showProductDetailsSheet('productid')}
          src={toAbsoluteUrl(`/media/store/client/600x600/${item.logo}`)}
          className="cursor-pointer h-[100px] shrink-0"
          alt="image"
        />
      </CardContent>
    </Card>
  );

  return (
    <Fragment>
      {items.map((item, index) => {
        return renderItem(item, index);
      })}
    </Fragment>
  );
}
