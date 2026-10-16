import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade | Tavunex",
  description:
    "Saiba como a Tavunex trata dados pessoais usados na gestão de atendimento para salões.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          Tavunex
        </Link>

        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
          Política de Privacidade
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Última atualização: 9 de outubro de 2026
        </p>

        <div className="mt-8 space-y-7 leading-7 text-slate-700">
          <section>
            <h2 className="text-lg font-semibold text-slate-950">
              Sobre esta política
            </h2>
            <p className="mt-2">
              Esta política explica como a Tavunex trata dados pessoais
              quando salões criam uma conta, configuram o atendimento e
              conectam uma conta do WhatsApp Business. O serviço oferece
              ferramentas de gestão de conversas e atendimento automatizado.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">
              Dados tratados
            </h2>
            <p className="mt-2">
              Podemos tratar dados de cadastro, como nome, e-mail e informações
              do salão; configurações de serviços, profissionais e agenda;
              identificadores da conta do WhatsApp Business e do número
              conectado; e dados das conversas, como telefone do cliente, nome
              de perfil quando fornecido pelo WhatsApp e conteúdo das mensagens.
              Também recebemos dados técnicos necessários para autenticação,
              segurança e funcionamento do serviço.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">
              Como usamos os dados
            </h2>
            <p className="mt-2">
              Usamos esses dados para criar e proteger contas, configurar o
              atendimento do salão, receber e responder mensagens, apresentar
              conversas no painel, operar recursos de inteligência artificial,
              prestar suporte e cumprir obrigações legais. As mensagens podem
              ser processadas por provedores tecnológicos necessários para
              hospedar o serviço, entregar mensagens ou gerar respostas
              automatizadas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">
              WhatsApp, Meta e outros provedores
            </h2>
            <p className="mt-2">
              Ao conectar o WhatsApp Business, a Meta processa dados conforme
              os termos e políticas próprios dela. Para operar a aplicação,
              usamos provedores de infraestrutura, autenticação, banco de dados
              e inteligência artificial, que podem processar dados em nosso
              nome. Não vendemos dados pessoais. O salão é responsável por
              informar seus clientes sobre o uso do canal e das conversas no
              atendimento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">
              Armazenamento e segurança
            </h2>
            <p className="mt-2">
              Mantemos os dados enquanto forem necessários para fornecer o
              serviço, atender solicitações ou cumprir obrigações legais. A
              duração pode variar conforme o tipo de dado e a relação com o
              salão. Aplicamos medidas técnicas e administrativas destinadas a
              proteger os dados; nenhum método de transmissão ou armazenamento
              pode ser considerado completamente infalível.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">
              Seus direitos e contato
            </h2>
            <p className="mt-2">
              Nos termos da legislação aplicável, inclusive da Lei Geral de
              Proteção de Dados (LGPD), você pode solicitar confirmação de
              tratamento, acesso, correção, portabilidade ou exclusão de dados,
              observadas as hipóteses legais de retenção. Para exercer seus
              direitos ou tirar dúvidas, escreva para{" "}
              <a
                className="font-medium text-slate-950 underline"
                href="mailto:brennocurtolo1@outlook.com"
              >
                brennocurtolo1@outlook.com
              </a>
              .
            </p>
            <p className="mt-2">
              Se a solicitação envolver dados de uma conversa mantida por um
              salão, você também pode contatar diretamente o salão, que define
              as finalidades do atendimento prestado aos próprios clientes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">
              Alterações nesta política
            </h2>
            <p className="mt-2">
              Podemos atualizar esta política para refletir mudanças no serviço
              ou nas obrigações legais. A versão vigente ficará disponível
              nesta página, com a respectiva data de atualização.
            </p>
          </section>
        </div>

        <p className="mt-10 border-t border-slate-200 pt-5 text-sm text-slate-500">
          Solicitações sobre dados pessoais:{" "}
          <Link
            className="font-medium text-slate-700 underline"
            href="/exclusao-de-dados"
          >
            instruções para exclusão de dados
          </Link>
          .
        </p>
      </article>
    </main>
  );
}
