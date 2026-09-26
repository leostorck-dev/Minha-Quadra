"use client";

import Link from "next/link";
import { TournamentDrawPanel } from "@/components/tournament-draw-panel";
import { useEffect, useState, type FormEvent } from "react";
import type { Role } from "@/lib/auth/context";
import type { TournamentOverview } from "@/features/tournaments/service";
import {
  TOURNAMENT_CATEGORIES,
  type TournamentCategoryName,
} from "@/features/tournaments/validation";

const date = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );

async function api(path: string, method = "GET", payload?: unknown) {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      body.error?.message ?? "Não foi possível concluir a operação.",
    );
  return body;
}

export function TournamentsView({
  role,
  today,
}: {
  role: Role;
  today: string;
}) {
  const [data, setData] = useState<TournamentOverview | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState(today);
  const [categories, setCategories] = useState<TournamentCategoryName[]>([
    "Open",
  ]);
  const [categoryId, setCategoryId] = useState("");
  const [athleteOne, setAthleteOne] = useState("");
  const [athleteTwo, setAthleteTwo] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void api("/api/tournaments")
      .then((body: TournamentOverview) => {
        if (!active) return;
        setData(body);
        setSelectedId(body.tournaments[0]?.id ?? "");
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Falha ao carregar torneios.",
          );
      });
    return () => {
      active = false;
    };
  }, []);

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      const refreshed = (await api("/api/tournaments")) as TournamentOverview;
      setData(refreshed);
      setSelectedId((current) =>
        refreshed.tournaments.some((item) => item.id === current)
          ? current
          : (refreshed.tournaments[0]?.id ?? ""),
      );
      setNotice(message);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha na operação.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let createdId = "";
    const saved = await run(async () => {
      const body = await api("/api/tournaments", "POST", {
        name,
        startsOn,
        endsOn,
        categories,
      });
      createdId = body.tournament.id;
    }, "Torneio criado. Abra as inscrições quando estiver pronto.");
    if (saved) {
      setSelectedId(createdId);
      setCategoryId("");
      setName("");
      setCategories(["Open"]);
    }
  }

  const selected = data?.tournaments.find((item) => item.id === selectedId);
  const selectedCategories =
    data?.categories.filter((item) => item.tournament_id === selectedId) ?? [];
  const selectedTeams =
    data?.teams.filter((item) => item.tournament_id === selectedId) ?? [];
  const activeCustomers =
    data?.customers.filter((item) => item.status === "active") ?? [];
  const registrationOpen =
    selected?.status === "open" && selected.starts_on >= today;
  const canManage = role === "OWNER" || role === "MANAGER";

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const saved = await run(
      () =>
        api(`/api/tournaments/${selected.id}/teams`, "POST", {
          categoryId,
          customerIds: [athleteOne, athleteTwo],
        }),
      "Dupla inscrita.",
    );
    if (saved) {
      setAthleteOne("");
      setAthleteTwo("");
    }
  }

  function teamNames(teamId: string) {
    return (
      data?.members
        .filter((item) => item.team_id === teamId)
        .sort((a, b) => a.position - b.position)
        .map(
          (item) =>
            data?.customers.find((customer) => customer.id === item.customer_id)
              ?.name ?? "Cliente",
        )
        .join(" + ") || "Atletas indisponíveis"
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold tracking-[0.2em] text-lime-400 uppercase">
          Competição
        </p>
        <h1 className="mt-2 text-3xl font-bold">Torneios</h1>
        <p className="mt-2 text-slate-400">
          Organize categorias e inscrições de duplas.
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-lime-400/30 bg-lime-400/10 p-3 text-sm text-lime-300"
        >
          {notice}
        </p>
      )}
      {!data ? (
        <p className="text-slate-400">Carregando torneios...</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Torneios", data.tournaments.length],
              [
                "Inscrições abertas",
                data.tournaments.filter((item) => item.status === "open")
                  .length,
              ],
              [
                "Duplas inscritas",
                data.teams.filter((item) => item.status === "registered")
                  .length,
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-slate-900 p-5"
              >
                <p className="text-sm text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-bold">{value}</p>
              </div>
            ))}
          </div>

          {canManage && (
            <section className="rounded-xl border border-white/10 bg-slate-900 p-5">
              <h2 className="text-xl font-bold">Criar torneio</h2>
              <form
                onSubmit={(event) => void create(event)}
                className="mt-4 grid gap-4"
              >
                <label className="text-sm font-medium">
                  Nome do torneio
                  <input
                    required
                    maxLength={120}
                    minLength={3}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/20 bg-slate-800 p-3"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Início
                    <input
                      required
                      type="date"
                      min={today}
                      value={startsOn}
                      onChange={(event) => setStartsOn(event.target.value)}
                      className="mt-2 w-full rounded-lg border border-white/20 bg-slate-800 p-3"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Término
                    <input
                      required
                      type="date"
                      min={startsOn}
                      value={endsOn}
                      onChange={(event) => setEndsOn(event.target.value)}
                      className="mt-2 w-full rounded-lg border border-white/20 bg-slate-800 p-3"
                    />
                  </label>
                </div>
                <fieldset>
                  <legend className="text-sm font-medium">Categorias</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {TOURNAMENT_CATEGORIES.map((category) => (
                      <label
                        key={category}
                        className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={categories.includes(category)}
                          onChange={(event) =>
                            setCategories((current) =>
                              event.target.checked
                                ? [...current, category]
                                : current.filter((item) => item !== category),
                            )
                          }
                        />
                        {category}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <button
                  type="submit"
                  disabled={busy || !categories.length}
                  className="w-fit rounded-lg bg-lime-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50"
                >
                  Criar torneio
                </button>
              </form>
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <section className="rounded-xl border border-white/10 bg-slate-900 p-5">
              <h2 className="text-xl font-bold">Torneios cadastrados</h2>
              <ul className="mt-4 space-y-2">
                {data.tournaments.length ? (
                  data.tournaments.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(item.id);
                          setCategoryId("");
                        }}
                        className={`w-full rounded-lg p-3 text-left text-sm ${
                          selectedId === item.id
                            ? "bg-lime-400 text-slate-950"
                            : "bg-slate-800 text-white hover:bg-slate-700"
                        }`}
                      >
                        <span className="block font-semibold">{item.name}</span>
                        <span className="block">
                          {date(item.starts_on)} ·{" "}
                          {item.status === "open"
                            ? "Inscrições abertas"
                            : item.status === "closed"
                              ? "Fechadas"
                              : "Rascunho"}
                        </span>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-slate-400">
                    Nenhum torneio criado.
                  </li>
                )}
              </ul>
            </section>

            {selected && (
              <section className="rounded-xl border border-white/10 bg-slate-900 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">{selected.name}</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {date(selected.starts_on)} a {date(selected.ends_on)}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      disabled={
                        busy ||
                        selectedCategories.some(
                          (category) => category.drawn_at,
                        ) ||
                        (selected.status !== "open" &&
                          selected.starts_on < today)
                      }
                      onClick={() =>
                        void run(
                          () =>
                            api(`/api/tournaments/${selected.id}`, "PATCH", {
                              status:
                                selected.status === "open" ? "closed" : "open",
                            }),
                          selected.status === "open"
                            ? "Inscrições fechadas."
                            : "Inscrições abertas.",
                        )
                      }
                      className="rounded-lg border border-lime-400/40 px-4 py-2 text-sm text-lime-300 disabled:opacity-50"
                    >
                      {selected.status === "open"
                        ? "Fechar inscrições"
                        : "Abrir inscrições"}
                    </button>
                  )}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {selectedCategories.map((category) => (
                    <span
                      key={category.id}
                      className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200"
                    >
                      {category.name} ·{" "}
                      {
                        selectedTeams.filter(
                          (team) =>
                            team.category_id === category.id &&
                            team.status === "registered",
                        ).length
                      }{" "}
                      duplas
                    </span>
                  ))}
                </div>

                {registrationOpen && (
                  <div className="mt-6 border-t border-white/10 pt-5">
                    <h3 className="font-semibold">Inscrever dupla</h3>
                    {activeCustomers.length < 2 ? (
                      <p className="mt-2 text-sm text-slate-400">
                        Cadastre pelo menos dois clientes ativos em{" "}
                        <Link
                          href="/customers"
                          className="text-lime-300 underline"
                        >
                          Clientes
                        </Link>
                        .
                      </p>
                    ) : (
                      <form
                        onSubmit={(event) => void register(event)}
                        className="mt-3 grid gap-3 sm:grid-cols-3"
                      >
                        <label className="text-sm">
                          Categoria
                          <select
                            required
                            value={categoryId}
                            onChange={(event) =>
                              setCategoryId(event.target.value)
                            }
                            className="mt-1 w-full rounded-lg border border-white/20 bg-slate-800 p-3"
                          >
                            <option value="">Selecione</option>
                            {selectedCategories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm">
                          Atleta 1
                          <select
                            required
                            value={athleteOne}
                            onChange={(event) => {
                              setAthleteOne(event.target.value);
                              if (event.target.value === athleteTwo)
                                setAthleteTwo("");
                            }}
                            className="mt-1 w-full rounded-lg border border-white/20 bg-slate-800 p-3"
                          >
                            <option value="">Selecione</option>
                            {activeCustomers.map((customer) => (
                              <option key={customer.id} value={customer.id}>
                                {customer.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm">
                          Atleta 2
                          <select
                            required
                            value={athleteTwo}
                            onChange={(event) =>
                              setAthleteTwo(event.target.value)
                            }
                            className="mt-1 w-full rounded-lg border border-white/20 bg-slate-800 p-3"
                          >
                            <option value="">Selecione</option>
                            {activeCustomers
                              .filter((customer) => customer.id !== athleteOne)
                              .map((customer) => (
                                <option key={customer.id} value={customer.id}>
                                  {customer.name}
                                </option>
                              ))}
                          </select>
                        </label>
                        <button
                          type="submit"
                          disabled={busy}
                          className="w-fit rounded-lg bg-lime-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50 sm:col-span-3"
                        >
                          Inscrever dupla
                        </button>
                      </form>
                    )}
                  </div>
                )}

                <TournamentDrawPanel
                  key={selected.id}
                  tournamentId={selected.id}
                  categories={selectedCategories}
                  closed={selected.status === "closed"}
                  canManage={canManage}
                  onDrawn={async () => {
                    setData(await api("/api/tournaments"));
                  }}
                />

                <div className="mt-6 border-t border-white/10 pt-5">
                  <h3 className="font-semibold">Duplas</h3>
                  <ul className="mt-3 space-y-2">
                    {selectedTeams.length ? (
                      selectedTeams.map((team) => (
                        <li
                          key={team.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-800 p-3 text-sm"
                        >
                          <div>
                            <p className="font-semibold">
                              {teamNames(team.id)}
                            </p>
                            <p className="text-slate-400">
                              {selectedCategories.find(
                                (category) => category.id === team.category_id,
                              )?.name ?? "Categoria"}
                              {" · "}
                              {team.status === "withdrawn"
                                ? "Retirada"
                                : "Inscrita"}
                            </p>
                          </div>
                          {selected.status === "open" &&
                            team.status === "registered" && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Retirar esta dupla da categoria?",
                                    )
                                  )
                                    void run(
                                      () =>
                                        api(
                                          `/api/tournaments/${selected.id}/teams/${team.id}`,
                                          "PATCH",
                                          { status: "withdrawn" },
                                        ),
                                      "Dupla retirada.",
                                    );
                                }}
                                className="rounded-lg border border-rose-500/40 px-3 py-2 text-rose-300 disabled:opacity-50"
                              >
                                Retirar dupla
                              </button>
                            )}
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-slate-400">
                        Nenhuma dupla inscrita.
                      </li>
                    )}
                  </ul>
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
