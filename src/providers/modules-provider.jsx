import { StoreClientProvider } from '@/pages/store-client/components/context';
import { StoreClientWrapper } from '@/pages/store-client/components/wrapper';

export function ModulesProvider({ children }) {
  return (
    <StoreClientProvider>
      <StoreClientWrapper>{children}</StoreClientWrapper>
    </StoreClientProvider>
  );
}
