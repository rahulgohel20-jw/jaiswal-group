import * as Popover from '@radix-ui/react-popover';
import { RiErrorWarningFill } from '@remixicon/react';
import { toast } from 'sonner';
import { useRecaptchaV2 } from '@/hooks/use-recaptcha-v2';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function RecaptchaPopover({
  open,
  onOpenChange,
  onVerify,
  trigger,
  verifyButtonText = 'Verify & Submit',
}) {
  const { containerRef, getToken, resetCaptcha, initializeRecaptcha } =
    useRecaptchaV2(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '');

  const handleOpenChange = (newOpen) => {
    onOpenChange(newOpen);
    if (newOpen) {
      resetCaptcha();
      // Small delay to ensure the popover content is rendered
      setTimeout(() => {
        initializeRecaptcha();
      }, 100);
    }
  };

  const handleVerify = () => {
    try {
      const token = getToken();
      if (!token) {
        toast.custom(
          () => (
            <Alert variant="mono" icon="destructive">
              <AlertIcon>
                <RiErrorWarningFill />
              </AlertIcon>
              <AlertTitle>
                Please complete the reCAPTCHA verification.
              </AlertTitle>
            </Alert>
          ),

          {
            position: 'top-center',
          },
        );
        return;
      }
      onVerify(token);
    } catch (error) {
      console.error('Error getting reCAPTCHA token:', error);
      toast.custom(
        () => (
          <Alert variant="mono" icon="destructive">
            <AlertIcon>
              <RiErrorWarningFill />
            </AlertIcon>
            <AlertTitle>Please complete the reCAPTCHA verification.</AlertTitle>
          </Alert>
        ),

        {
          position: 'top-center',
        },
      );
      return;
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="bg-white p-4 rounded-lg shadow-lg z-50"
          sideOffset={5}
          align="end"
          onInteractOutside={(e) => {
            // Prevent closing when interacting with reCAPTCHA iframe
            if (e.target.tagName === 'IFRAME') {
              e.preventDefault();
            }
          }}
        >
          <div className="flex flex-col gap-4">
            <div ref={containerRef} className="min-h-[78px]" />
            <Button
              type="button"
              variant="mono"
              onClick={handleVerify}
              className="w-full"
            >
              {verifyButtonText}
            </Button>
          </div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
