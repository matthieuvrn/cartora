import { getLocale, getTranslations } from "next-intl/server";
import { GetHello } from "@/application/use-cases/GetHello";
import { SystemClock } from "@/infrastructure/clock/SystemClock";
import { InMemoryGreetingRepository } from "@/infrastructure/hello/InMemoryGreetingRepository";
import { getHelloViewModel } from "@/interface/controllers/helloController";

export default async function HelloPage() {
  const locale = (await getLocale()) as "fr" | "en";
  const t = await getTranslations("Hello");

  const uc = new GetHello(new InMemoryGreetingRepository(), new SystemClock());
  const vm = await getHelloViewModel(uc, { locale, name: "Cartora" });

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-2 text-sm opacity-80">{t("subtitle")}</p>

      <div className="mt-6 rounded-lg border p-4">
        <p className="text-lg">{vm.message}</p>
        <p className="mt-2 text-xs opacity-70">generatedAt: {vm.generatedAt}</p>
      </div>
    </main>
  );
}
