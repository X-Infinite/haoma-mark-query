import { PhoneQueryForm } from "@/components/phone-query-form";
import { DemoPayCard } from "@/components/demo-pay-card";

export default function HomePage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-10 px-4 py-10">
      <PhoneQueryForm variant="minimal" />
      <DemoPayCard />
    </div>
  );
}
