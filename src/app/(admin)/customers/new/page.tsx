import { CustomerEditor } from "@/components/customer-editor";

export default function NewCustomerPage() {
  return (
    <section className="max-w-3xl">
      <p className="text-sm text-lime-400">Clientes</p>
      <h1 className="mt-2 text-3xl font-bold">Novo cliente</h1>
      <p className="mt-2 mb-7 text-sm text-slate-400">
        Cadastre os dados essenciais para a operação da arena.
      </p>
      <CustomerEditor />
    </section>
  );
}
