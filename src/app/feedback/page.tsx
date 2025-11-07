
import FeedbackForm from '@/components/feedback-form';

export default function FeedbackPage() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold font-headline text-primary">Share Your Feedback</h1>
            <p className="text-muted-foreground mt-1">We'd love to hear your thoughts on your experience with TecoTransit.</p>
        </div>
        <FeedbackForm />
      </div>
    </div>
  );
}
