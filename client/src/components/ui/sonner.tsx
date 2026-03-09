import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-700 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-gray-500',
          actionButton:
            'group-[.toast]:bg-orange-600 group-[.toast]:text-white',
          cancelButton:
            'group-[.toast]:bg-gray-200 group-[.toast]:text-gray-700',
        },
      }}
    />
  );
}

export { Sonner };
