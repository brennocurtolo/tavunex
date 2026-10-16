import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Exclusão de Dados | Tavunex",
  description:
    "Saiba como solicitar a exclusão da sua conta e de dados pessoais da Tavunex.",
};

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          Tavunex
        </Link>

        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
          Exclusão de dados do usuário
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Instruções para solicitar a exclusão de dados pessoais associados ao
          Tavunex.
        </p>

        <div className="mt-8 space-y-6 leading-7 text-slate-700">
          <section>
            <h2 className="text-lg font-semibold text-slate-950">
              Como solicitar
            </h2>
            <p className="mt-2">
              Envie um e-mail para{" "}
              <a
                className="font-medium text-slate-950 underline"
                href="mailto:brennocurtolo1@outlook.com?subject=Solicita%C3%A7%C3%A3o%20de%20exclus%C3%A3o%20de%20dados"
              >
                brennocurtolo1@outlook.com
              </a>{" "}
              com o assunto “Solicitação de exclusão de dados”. Informe o
              endereço de e-mail usado na conta e, se aplicável, o nome do
              salão. Não envie sua senha nem dados financeiros.
            </p>
            <p className="mt-2">
              Para proteger sua conta, poderemos pedir informações
              proporcionais para confirmar sua identidade antes de atender ao
              pedido. Responderemos para informar o andamento ou se precisamos
              de algum dado adicional.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">
              O que será excluído
            </h2>
            <p className="mt-2">
              Após confirmar a solicitação, analisaremos e removeremos ou
              anonimizaremos os dados associados à conta, incluindo dados de
              cadastro e do salão, configurações e dados de conversas sob nosso
              controle, quando aplicável. A exclusão da conta pode impedir o
              acesso ao painel e aos dados vinculados a ela.
            </p>
            <p className="mt-2">
              Alguns dados poderão ser mantidos pelo período exigido por lei,
              para cumprimento de obrigações ou para exercício de direitos.
              Cópias técnicas em backups podem permanecer até serem substituídas
              pelos ciclos normais de backup e proteção do serviço.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">
              Conversas com um salão
            </h2>
            <p className="mt-2">
              Se você é cliente de um salão e quer excluir mensagens ou dados
              usados por esse salão no atendimento, solicite também diretamente
              ao próprio salão. Ele determina como usa os dados dos clientes
              que atende. Você também pode nos escrever no endereço acima para
              que possamos orientar o encaminhamento do pedido.
            </p>
          </section>

          <p>
            Para saber mais sobre o tratamento de dados, consulte a{" "}
            <Link
              className="font-medium text-slate-950 underline"
              href="/politica-de-privacidade"
            >
              Política de Privacidade
            </Link>
            .
          </p>
        </div>
      </article>
    </main>
  );
}
