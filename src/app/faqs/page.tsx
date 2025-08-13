import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
    {
        question: "Where is the final stop?",
        answer: (
            <ul className="list-disc pl-6 space-y-2">
                <li><strong>OJOTA:</strong> Ojota Biode park</li>
                <li><strong>FESTAC:</strong> Mega chicken apple junction</li>
                <li><strong>IBADAN:</strong> Word oil at iwo road</li>
                <li><strong>LEKKI /AJAH:</strong> Northwest filling station / Mobil filling station jakande</li>
                <li><strong>ABUJA:</strong> Jabi park</li>
                <li><strong>IYANA IPAJA:</strong> Alaagba garage iyana paja / Mobil fueling station around NYSC CAMP iyana paja</li>
            </ul>
        )
    },
    {
        question: "Departure time from school?",
        answer: "On or before 7:00am."
    },
    {
        question: "Assembly point?",
        answer: "The field outside the ABUAD school gate."
    },
    {
        question: "How would you get the driver's number?",
        answer: "A group chat would be made for those traveling together in which the driver's details would be communicated there the day before departure date."
    },
    {
        question: "Number of luggages allowed for each person?",
        answer: (
            <ul className="list-disc pl-6 space-y-2">
                <li><strong>Five seaters:</strong> Max. of 2 luggages per person.</li>
                <li><strong>Four seaters:</strong> Max. of 4 luggages per person.</li>
                <li><strong>7 seaters Bus:</strong> Max. of 2 luggages per person.</li>
                <li className="pt-2">Toyota Camry service also available.</li>
            </ul>
        )
    }
];

export default function FaqsPage() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
            <h1 className="text-3xl font-bold font-headline text-primary">Frequently Asked Questions</h1>
            <p className="text-muted-foreground mt-1">Find answers to common questions about our service.</p>
        </div>
        <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-lg font-semibold text-left">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-base text-muted-foreground pt-2">
                        {faq.answer}
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
      </div>
    </div>
  );
}
