import type { GetHello, GetHelloInput, GetHelloOutput } from "@/application/use-cases/GetHello";

export async function getHelloViewModel(
  uc: GetHello,
  params: GetHelloInput,
): Promise<GetHelloOutput> {
  return uc.execute(params);
}
