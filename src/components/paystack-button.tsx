
"use client";

import { usePaystackPayment } from 'react-paystack';
import type { PaystackProps } from 'react-paystack/dist/types';
import { Button } from './ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaystackButtonProps {
    config: PaystackProps;
    onSuccess: (reference: any) => void;
    onClose: () => void;
    isProcessing: boolean;
}

export const PaystackButton: React.FC<PaystackButtonProps> = ({ config, onSuccess, onClose, isProcessing }) => {
    const { toast } = useToast();
    const initializePayment = usePaystackPayment(config);

    const handlePayment = () => {
        if (typeof onSuccess === 'function' && typeof onClose === 'function') {
            initializePayment({
                onSuccess,
                onClose,
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Initialization Error',
                description: 'Could not initialize payment. Callbacks are missing.',
            });
        }
    };

    return (
        <Button type="button" size="lg" className="w-full" onClick={handlePayment} disabled={isProcessing}>
            {isProcessing ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Finalizing...
                </>
            ) : (
                <>
                    Pay with Paystack
                    <ArrowRight className="ml-2 h-5 w-5" />
                </>
            )}
        </Button>
    );
};
