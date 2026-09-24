import Image from "next/image";
import Link from "next/link";

type IconName =
  | "calendar"
  | "chart"
  | "users"
  | "card"
  | "court"
  | "pie"
  | "arrow"
  | "check"
  | "menu";

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 10h18M8 14h2M14 14h2M8 18h2" />
      </>
    ),
    chart: (
      <>
        <path d="M5 20v-8M10 20V7M15 20v-10M20 20V4M3 20h19" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M19 14a5 5 0 0 1 2 4v2" />
      </>
    ),
    card: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20M6 15h4" />
      </>
    ),
    court: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M12 4v16M2 12h20M7 8a4 4 0 0 1 0 8M17 8a4 4 0 0 0 0 8" />
      </>
    ),
    pie: (
      <>
        <path d="M21 12a9 9 0 1 1-9-9v9h9ZM15 3.5A9 9 0 0 1 20.5 9H15V3.5Z" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Minha Quadra, início">
      <span className="brand-art" aria-hidden="true" />
    </Link>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="eyebrow">
      <span />
      {children}
    </p>
  );
}

const features: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "calendar",
    title: "Agendamentos sem confusão",
    text: "Reservas, horários disponíveis e cancelamentos em uma agenda sempre atualizada.",
  },
  {
    icon: "chart",
    title: "Controle financeiro",
    text: "Entradas, despesas e resultados organizados para você enxergar a saúde do negócio.",
  },
  {
    icon: "users",
    title: "Clientes organizados",
    text: "Contatos, frequência e histórico de reservas reunidos em um só lugar.",
  },
  {
    icon: "card",
    title: "Pagamentos integrados",
    text: "Acompanhe os pagamentos das reservas com mais praticidade para todos.",
  },
  {
    icon: "court",
    title: "Gestão das quadras",
    text: "Configure modalidades, horários, valores e disponibilidade do seu espaço.",
  },
  {
    icon: "pie",
    title: "Relatórios e indicadores",
    text: "Entenda ocupação, faturamento e clientes ativos com dados fáceis de acompanhar.",
  },
];

const steps: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "court",
    title: "Escolha da quadra",
    text: "Seu cliente encontra a quadra ideal e consulta as informações disponíveis.",
  },
  {
    icon: "calendar",
    title: "Seleção do horário",
    text: "Ele escolhe uma data e um horário livre na agenda, sem troca de mensagens.",
  },
  {
    icon: "card",
    title: "Pagamento",
    text: "A reserva segue para o pagamento de forma simples e organizada.",
  },
  {
    icon: "check",
    title: "Confirmação",
    text: "Todos recebem os detalhes e a agenda é atualizada automaticamente.",
  },
];

function Dashboard() {
  const bars = [22, 32, 29, 47, 58, 75, 88, 72, 64, 53, 40, 48, 32, 24];
  return (
    <div
      className="devices"
      aria-label="Prévia ilustrativa do painel de gestão Minha Quadra"
    >
      <div className="dashboard">
        <aside>
          <div className="dash-brand">
            <span className="brand-art" aria-hidden="true" />
          </div>
          <div className="active">▦ &nbsp; Dashboard</div>
          <div>▣ &nbsp; Agendamentos</div>
          <div>♧ &nbsp; Clientes</div>
          <div>▤ &nbsp; Financeiro</div>
          <div>▦ &nbsp; Quadras</div>
          <div>◫ &nbsp; Relatórios</div>
        </aside>
        <div className="dash-main">
          <div className="dash-search">
            ⌕ &nbsp; Buscar clientes, agendamentos...
          </div>
          <div className="dash-title">
            <div>
              <strong>Dashboard</strong>
              <small>Visão geral do seu negócio</small>
            </div>
            <span>Últimos 30 dias⌄</span>
          </div>
          <div className="dash-kpis">
            <div>
              <small>Agendamentos</small>
              <strong>324</strong>
              <em>↗ 12%</em>
            </div>
            <div>
              <small>Receita</small>
              <strong>R$ 12.480</strong>
              <em>↗ 18%</em>
            </div>
            <div>
              <small>Clientes ativos</small>
              <strong>253</strong>
              <em>↗ 9%</em>
            </div>
            <div>
              <small>Ocupação</small>
              <strong>68%</strong>
              <em>↗ 6%</em>
            </div>
          </div>
          <div className="dash-charts">
            <div>
              <b>Ocupação das quadras</b>
              <div className="bars">
                {bars.map((height, index) => (
                  <i key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
              <small>06h　　 10h　　 14h　　 18h　　 22h</small>
            </div>
            <div>
              <b>Receita da semana</b>
              <strong>R$ 3.240,00</strong>
              <svg
                viewBox="0 0 200 90"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M0 77C22 72 35 51 62 56S93 49 112 50 145 30 164 36 184 17 200 11" />
              </svg>
              <small>Seg　　 Ter　　 Qua　　 Qui　　 Sex</small>
            </div>
          </div>
          <div className="dash-reservations">
            <b>Próximos agendamentos</b>
            {[
              ["08:00", "João Silva", "Confirmado"],
              ["10:00", "Marina Santos", "Confirmado"],
              ["14:00", "Carlos Mendes", "Pendente"],
            ].map(([time, name, status]) => (
              <div key={time}>
                <time>{time}</time>
                <span className="person">{name[0]}</span>
                <span>
                  {name}
                  <small>Quadra 1 · Futevôlei</small>
                </span>
                <em className={status === "Pendente" ? "pending" : ""}>
                  {status}
                </em>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="phone">
        <div className="notch" />
        <div className="phone-inner">
          <div className="phone-brand">
            <span className="brand-art" aria-hidden="true" />
          </div>
          <h4>Boa tarde, João!</h4>
          <p>Sua próxima partida começa em breve.</p>
          <div className="phone-court">
            ▦ &nbsp; Quadra 1 <small>Futevôlei</small>
          </div>
          <b>Hoje, 24 de setembro</b>
          <div className="phone-slot">
            08:00 – 09:00 <small>Disponível</small>
          </div>
          <div className="phone-slot selected">
            10:00 – 11:00 <small>Reserva confirmada</small>
          </div>
          <div className="phone-slot">
            14:00 – 15:00 <small>Disponível</small>
          </div>
          <div className="phone-action">Nova reserva</div>
          <div className="phone-bottom">⌂　　 ▦　　 ▤　　 ♙</div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="landing">
      <header className="site-header">
        <div className="container nav">
          <Brand />
          <nav className="desktop-nav" aria-label="Navegação principal">
            <a href="#recursos">Recursos</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#para-quem">Para quem</a>
          </nav>
          <div className="header-actions">
            <Link className="button button-light" href="/login">
              Entrar
            </Link>
            <Link className="button button-dark" href="/signup">
              Começar agora <Icon name="arrow" size={17} />
            </Link>
          </div>
          <details className="mobile-nav">
            <summary aria-label="Abrir menu">
              <Icon name="menu" />
            </summary>
            <nav>
              <a href="#recursos">Recursos</a>
              <a href="#como-funciona">Como funciona</a>
              <a href="#para-quem">Para quem</a>
              <Link href="/login">Entrar</Link>
              <Link href="/signup">Começar agora</Link>
            </nav>
          </details>
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="hero-photo">
            <Image
              src="/court-sunset.png"
              alt="Quadra de areia ao pôr do sol"
              fill
              priority
              sizes="(max-width: 760px) 100vw, 55vw"
            />
          </div>
          <div className="container hero-grid">
            <div className="hero-copy">
              <Eyebrow>GESTÃO DE QUADRAS ESPORTIVAS</Eyebrow>
              <h1>
                Sua quadra
                <br />
                organizada.
                <br />
                <span>
                  Seu negócio
                  <br />
                  crescendo.
                </span>
              </h1>
              <p>
                Centralize agendamentos, pagamentos, clientes e financeiro em um
                só lugar. Mais controle para você. Uma experiência melhor para
                quem joga.
              </p>
              <div className="button-row">
                <Link
                  className="button button-dark button-large"
                  href="/signup"
                >
                  Começar agora <Icon name="arrow" size={19} />
                </Link>
                <a
                  className="button button-light button-large"
                  href="#como-funciona"
                >
                  Ver como funciona <span className="play">▶</span>
                </a>
              </div>
              <div className="hero-note">
                <span>
                  <Icon name="check" size={16} />
                </span>
                Sem planilhas espalhadas. Sem mensagens perdidas. Sem
                complicação.
              </div>
            </div>
            <div className="hero-dashboard">
              <Dashboard />
            </div>
          </div>
        </section>
        <section className="benefits">
          <div className="container benefit-grid">
            {[
              ["calendar", "Agenda em dia", "Reservas em um só lugar"],
              ["card", "Pagamentos claros", "Mais controle da operação"],
              ["users", "Clientes próximos", "Histórico e relacionamento"],
              ["chart", "Decisões melhores", "Dados para crescer"],
            ].map(([icon, title, text]) => (
              <div key={title}>
                <span>
                  <Icon name={icon as IconName} />
                </span>
                <p>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="section features" id="recursos">
          <div className="container">
            <div className="section-intro">
              <div>
                <Eyebrow>TUDO EM UM SÓ LUGAR</Eyebrow>
                <h2>Tudo que sua quadra precisa em um só sistema.</h2>
              </div>
              <p>
                Gerenciar uma quadra vai muito além de marcar horários.
                Acompanhe toda a operação de forma simples, visual e organizada.
              </p>
            </div>
            <div className="feature-grid">
              {features.map(({ icon, title, text }) => (
                <article className="feature-card" key={title}>
                  <span className="feature-icon">
                    <Icon name={icon} size={28} />
                  </span>
                  <span className="feature-arrow">
                    <Icon name="arrow" size={18} />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="section platform" id="plataforma">
          <div className="container platform-grid">
            <div>
              <Eyebrow>VISÃO DO SEU NEGÓCIO</Eyebrow>
              <h2>
                Menos tempo administrando.
                <br />
                <span>Mais tempo crescendo.</span>
              </h2>
              <p>
                WhatsApp, anotações e planilhas podem até funcionar por um
                tempo. Quando o movimento cresce, você precisa enxergar tudo com
                clareza.
              </p>
              <p>
                Abra o painel e encontre reservas, receita, ocupação e clientes
                em poucos segundos. A informação já está na sua frente.
              </p>
              <ul className="check-list">
                <li>
                  <Icon name="check" size={17} />
                  Agenda organizada
                </li>
                <li>
                  <Icon name="check" size={17} />
                  Pagamentos controlados
                </li>
                <li>
                  <Icon name="check" size={17} />
                  Clientes centralizados
                </li>
                <li>
                  <Icon name="check" size={17} />
                  Financeiro atualizado
                </li>
              </ul>
              <a className="text-link" href="#como-funciona">
                Explorar a plataforma <Icon name="arrow" size={18} />
              </a>
            </div>
            <div className="platform-visual">
              <div className="platform-photo">
                <Image
                  src="/court-sunset.png"
                  alt="Quadra esportiva ao entardecer"
                  fill
                  sizes="(max-width: 760px) 100vw, 50vw"
                />
              </div>
              <div className="platform-dashboard">
                <Dashboard />
              </div>
            </div>
          </div>
        </section>
        <section className="section journey" id="como-funciona">
          <div className="container">
            <div className="journey-intro">
              <Eyebrow>DO PRIMEIRO CLIQUE À CONFIRMAÇÃO</Eyebrow>
              <h2>Uma experiência simples para quem joga.</h2>
              <p>
                Seus clientes consultam horários, fazem a reserva e acompanham
                os agendamentos. Sua agenda acompanha cada etapa
                automaticamente.
              </p>
            </div>
            <div className="steps">
              {steps.map(({ icon, title, text }, i) => (
                <article key={title}>
                  <div className="step-top">
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <Icon name={icon} size={27} />
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <p className="journey-note">
              Menos mensagens perguntando se há horário. Mais tempo para cuidar
              do seu espaço.
            </p>
          </div>
        </section>
        <section className="section insights">
          <div className="container insights-grid">
            <div className="crm-card">
              <span className="feature-icon">
                <Icon name="users" size={27} />
              </span>
              <h3>Conheça melhor seus clientes.</h3>
              <p>
                Histórico de reservas e frequência deixam de ser contatos
                perdidos no WhatsApp. Uma base organizada abre espaço para
                eventos, planos recorrentes e novas oportunidades.
              </p>
              <div className="client-list">
                <div>
                  <span>MS</span>Marina Santos <em>Cliente frequente</em>
                </div>
                <div>
                  <span>JS</span>João Silva <em>Reserva recente</em>
                </div>
              </div>
            </div>
            <div>
              <Eyebrow>INFORMAÇÃO QUE MOVE O NEGÓCIO</Eyebrow>
              <h2>
                As respostas que você precisa, sem procurar em vários lugares.
              </h2>
              <p>
                Qual horário tem maior procura? Qual quadra gera mais receita?
                Como está a ocupação deste mês?
              </p>
              <p>
                O Minha Quadra transforma os dados da sua operação em
                informações fáceis de acompanhar e decisões melhores.
              </p>
              <div className="metric-row">
                <div>
                  <strong>Agenda</strong>
                  <small>O que vem pela frente</small>
                </div>
                <div>
                  <strong>Clientes</strong>
                  <small>Quem joga com você</small>
                </div>
                <div>
                  <strong>Receita</strong>
                  <small>Como o negócio evolui</small>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="section sports" id="para-quem">
          <div className="container sports-grid">
            <div>
              <Eyebrow>DO SEU JEITO</Eyebrow>
              <h2>Feito para diferentes tipos de quadra.</h2>
              <p>
                Futevôlei, beach tennis, futebol, tênis, vôlei e outros
                esportes. Configure quadras, horários e valores de acordo com a
                realidade do seu espaço.
              </p>
              <p>
                Da quadra independente ao complexo esportivo com várias
                unidades: tudo no lugar certo desde o primeiro acesso.
              </p>
              <Link className="button button-dark" href="/signup">
                Organizar minha quadra <Icon name="arrow" size={18} />
              </Link>
            </div>
            <div className="sports-photo">
              <Image
                src="/court-sunset.png"
                alt="Quadra de areia para esportes ao pôr do sol"
                fill
                sizes="(max-width: 760px) 100vw, 50vw"
              />
              <div>
                <span>Futevôlei</span>
                <span>Beach tennis</span>
                <span>Futebol</span>
                <span>Tênis</span>
                <span>Vôlei</span>
              </div>
            </div>
          </div>
        </section>
        <section className="section faq">
          <div className="container faq-grid">
            <div>
              <Eyebrow>DÚVIDAS FREQUENTES</Eyebrow>
              <h2>Sua gestão não precisa ser complicada.</h2>
              <p>
                Interface limpa, informações claras e fluxos rápidos. Veja como
                o Minha Quadra se adapta à sua operação.
              </p>
            </div>
            <div className="faq-list">
              <details open>
                <summary>
                  Preciso instalar alguma coisa?<span>+</span>
                </summary>
                <p>
                  Não. O Minha Quadra funciona online e pode ser acessado pelo
                  navegador.
                </p>
              </details>
              <details>
                <summary>
                  Posso cadastrar mais de uma quadra?<span>+</span>
                </summary>
                <p>
                  Sim. Você pode organizar diferentes quadras, modalidades,
                  horários e valores no sistema.
                </p>
              </details>
              <details>
                <summary>
                  O pagamento é integrado?<span>+</span>
                </summary>
                <p>
                  O sistema reúne as informações de pagamento junto às reservas
                  para facilitar o acompanhamento da operação.
                </p>
              </details>
              <details>
                <summary>
                  Serve para diferentes modalidades?<span>+</span>
                </summary>
                <p>
                  Sim. A configuração pode acompanhar as modalidades e a
                  disponibilidade do seu espaço.
                </p>
              </details>
            </div>
          </div>
        </section>
        <section className="final-cta" id="comecar">
          <div className="container cta-grid">
            <div>
              <Eyebrow>COMECE HOJE</Eyebrow>
              <h2>Pronto para organizar sua quadra?</h2>
              <p>
                Tenha controle sobre reservas, clientes, pagamentos e financeiro
                em uma única plataforma. Comece a transformar sua gestão hoje.
              </p>
              <div className="button-row">
                <Link
                  className="button button-dark button-large"
                  href="/signup"
                >
                  Começar agora <Icon name="arrow" size={19} />
                </Link>
                <Link
                  className="button button-light button-large"
                  href="/signup?interesse=demonstracao"
                >
                  Solicitar demonstração
                </Link>
              </div>
              <div className="cta-points">
                <span>
                  <Icon name="check" size={16} /> Comece com simplicidade
                </span>
                <span>
                  <Icon name="check" size={16} /> Tudo em um só lugar
                </span>
              </div>
            </div>
            <div className="cta-photo">
              <Image
                src="/court-sunset.png"
                alt="Quadra esportiva ao entardecer"
                fill
                sizes="(max-width: 760px) 100vw, 50vw"
              />
            </div>
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <Brand />
            <p>Gestão inteligente para quadras esportivas.</p>
          </div>
          <div>
            <h3>Produto</h3>
            <a href="#recursos">Recursos</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#plataforma">Plataforma</a>
          </div>
          <div>
            <h3>Empresa</h3>
            <a href="#para-quem">Para quem</a>
            <a href="#comecar">Começar</a>
          </div>
          <div>
            <h3>Acesso</h3>
            <Link href="/login">Entrar</Link>
            <Link href="/signup">Criar conta</Link>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© 2026 Minha Quadra. Todos os direitos reservados.</span>
          <span>Feito para quem vive o esporte.</span>
        </div>
      </footer>
    </div>
  );
}
