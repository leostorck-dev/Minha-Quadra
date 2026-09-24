"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Member = { id: string; name: string; email: string; role: string };
type Invite = {
  id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  expires_at: string;
  created_at: string;
};
const labels: Record<string, string> = {
  OWNER: "Proprietário",
  MANAGER: "Gerente",
  RECEPTIONIST: "Recepção",
  COACH: "Professor",
};

export function SettingsPanel({
  arenaName,
  members: initialMembers,
  invites: initialInvites,
  ownerId,
}: {
  arenaName: string;
  members: Member[];
  invites: Invite[];
  ownerId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(arenaName);
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("RECEPTIONIST");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function request(method: string, body: Record<string, string>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/settings", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message ?? "Não foi possível concluir a operação.",
        );
      return result;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível concluir a operação.",
      );
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function rename(event: FormEvent) {
    event.preventDefault();
    const result = await request("PATCH", { action: "rename", name });
    if (result) {
      setMessage("Nome da arena atualizado.");
      router.refresh();
    }
  }
  async function invite(event: FormEvent) {
    event.preventDefault();
    const result = await request("POST", { email, role });
    if (result) {
      setInvites((current) => [result.invite, ...current]);
      setEmail("");
      setMessage("Convite criado. Copie o link e envie à pessoa.");
    }
  }
  async function revoke(id: string) {
    if (!window.confirm("Revogar este convite?")) return;
    const result = await request("PATCH", { action: "revoke", id });
    if (result) {
      setInvites((current) => current.filter((item) => item.id !== id));
      setMessage("Convite revogado.");
    }
  }
  async function remove(id: string) {
    if (!window.confirm("Remover o acesso deste membro à arena?")) return;
    const result = await request("DELETE", { id });
    if (result) {
      setMembers((current) => current.filter((item) => item.id !== id));
      setMessage("Acesso removido.");
    }
  }
  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/join?token=${token}`,
      );
      setMessage("Link copiado.");
      setError("");
    } catch {
      setError("Não foi possível copiar. Selecione o link abaixo.");
    }
  }

  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm text-lime-400">Administração</p>
        <h1 className="mt-2 text-3xl font-bold">Configurações</h1>
        <p className="mt-3 text-sm text-slate-400">
          Dados da arena e acesso da equipe.
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-rose-950 px-4 py-3 text-sm text-rose-200"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-lg bg-lime-950 px-4 py-3 text-sm text-lime-200"
        >
          {message}
        </p>
      )}
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold">Arena</h2>
        <form onSubmit={rename} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-60 flex-1 text-sm">
            Nome
            <input
              required
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/15 bg-slate-800 px-4 py-3"
            />
          </label>
          <button
            disabled={busy || name.trim() === arenaName}
            className="rounded-lg bg-lime-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50"
          >
            Salvar
          </button>
        </form>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold">Convidar para a equipe</h2>
        <p className="mt-2 text-sm text-slate-400">
          O convite dura sete dias. Copie o link e envie à pessoa. Ela precisará
          entrar com este email e confirmar a conta.
        </p>
        <form onSubmit={invite} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-60 flex-1 text-sm">
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/15 bg-slate-800 px-4 py-3"
            />
          </label>
          <label className="text-sm">
            Função
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="mt-2 block rounded-lg border border-white/15 bg-slate-800 px-4 py-3"
            >
              <option value="MANAGER">Gerente</option>
              <option value="RECEPTIONIST">Recepção</option>
              <option value="COACH">Professor</option>
            </select>
          </label>
          <button
            disabled={busy}
            className="rounded-lg bg-lime-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50"
          >
            Criar convite
          </button>
        </form>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-900">
        <h2 className="border-b border-white/10 px-6 py-4 text-lg font-semibold">
          Equipe
        </h2>
        <ul className="divide-y divide-white/10">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
            >
              <div>
                <p className="font-medium">
                  {member.name}{" "}
                  {member.id === ownerId && (
                    <span className="text-xs text-slate-400">(você)</span>
                  )}
                </p>
                <p className="text-sm text-slate-400">
                  {member.email} · {labels[member.role]}
                </p>
              </div>
              {member.id !== ownerId && (
                <button
                  disabled={busy}
                  onClick={() => remove(member.id)}
                  className="text-sm text-rose-300 hover:underline disabled:opacity-50"
                >
                  Remover acesso
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-900">
        <h2 className="border-b border-white/10 px-6 py-4 text-lg font-semibold">
          Convites pendentes
        </h2>
        {invites.length ? (
          <ul className="divide-y divide-white/10">
            {invites.map((item) => (
              <li key={item.id} className="px-6 py-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.email}</p>
                    <p className="text-sm text-slate-400">
                      {labels[item.role]} · Expira{" "}
                      {new Date(item.expires_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => copy(item.token)}
                      className="text-sm text-lime-400 hover:underline"
                    >
                      Copiar link
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => revoke(item.id)}
                      className="text-sm text-rose-300 hover:underline disabled:opacity-50"
                    >
                      Revogar
                    </button>
                  </div>
                </div>
                <p className="mt-2 break-all font-mono text-xs text-slate-500">{`/join?token=${item.token}`}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-6 py-5 text-sm text-slate-400">
            Nenhum convite pendente.
          </p>
        )}
      </div>
    </section>
  );
}
