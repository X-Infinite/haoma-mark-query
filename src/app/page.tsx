import { PhoneQueryForm } from "@/components/phone-query-form";

export default function HomePage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center">
      <PhoneQueryForm variant="minimal" />
    </div>
  );
}
