import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { SEOHead } from '@/components/SEOHead';

const Terms = () => {
  return (
    <Layout>
      <SEOHead
        title="Termos e Condições | Fio & Alma Studio"
        description="Termos e condições de utilização da loja online Fio & Alma Studio. Conheça as regras de compra, entrega e pagamento dos nossos produtos artesanais."
        canonical="https://fioealma.pt/terms"
      />
      <div className="container py-10 max-w-3xl prose prose-slate dark:prose-invert mx-auto">
        <h1 className="font-serif text-3xl font-bold mb-2">Termos e Condições</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Última atualização: 28 de fevereiro de 2026
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">1. Identificação</h2>
          <p className="text-muted-foreground leading-relaxed">
            A loja online <strong>Fio & Alma Studio</strong> é operada a partir de Lisboa, Portugal.
            Ao utilizar este site e efetuar compras, aceita os presentes termos e condições.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">2. Produtos</h2>
          <p className="text-muted-foreground leading-relaxed">
            Todos os produtos são artesanais e feitos à mão, o que significa que podem existir pequenas variações
            naturais de cor, tamanho e textura entre peças. Estas variações são uma característica do artesanato
            e não constituem defeito. As imagens dos produtos são meramente ilustrativas e podem apresentar
            ligeiras diferenças em relação ao produto real. Os preços apresentados incluem IVA à taxa legal em vigor (23%).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">3. Encomendas</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Ao efetuar uma encomenda, está a realizar uma proposta de compra. A encomenda só é considerada
            confirmada após a verificação do pagamento. Reservamo-nos o direito de recusar encomendas em caso de:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Produto esgotado após a submissão do pedido</li>
            <li>Dados de contacto inválidos ou incompletos</li>
            <li>Suspeita de fraude</li>
            <li>Erros de preço manifestos</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">4. Preços e Pagamento</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Todos os preços estão em Euros (€) e incluem IVA. Os métodos de pagamento aceites são:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>MB WAY</li>
            <li>Cartão de Crédito/Débito (Visa, Mastercard)</li>
            <li>Transferência Bancária</li>
            <li>Multibanco (referência)</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            As transferências bancárias devem ser efetuadas no prazo de 3 dias úteis.
            Após este período, a encomenda poderá ser cancelada. As referências Multibanco
            têm um prazo de validade indicado no email de confirmação.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">5. Faturação</h2>
          <p className="text-muted-foreground leading-relaxed">
            Para cada compra é emitida automaticamente uma fatura/recibo, enviada por email.
            Se necessitar de fatura com NIF, deve indicar o seu número de contribuinte durante o checkout.
            As faturas cumprem as obrigações fiscais portuguesas e incluem a discriminação do IVA.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">6. Entrega</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Efetuamos entregas para todo o território português (Continental e Ilhas).
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>Portugal Continental:</strong> 3 a 7 dias úteis</li>
            <li><strong>Ilhas (Açores e Madeira):</strong> 5 a 10 dias úteis</li>
            <li><strong>Portes:</strong> €4,99 — <strong>Grátis</strong> para encomendas superiores a €50</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            Os prazos indicados são estimados e podem variar em períodos de maior procura (Natal, Dia da Mãe, etc.).
            Receberá um email com a atualização do estado da sua encomenda.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">7. Devoluções e Reembolsos</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Pode devolver os produtos no prazo de <strong>14 dias</strong> após a receção, nos termos do
            Decreto-Lei n.º 24/2014 (direito de livre resolução). Para mais detalhes, consulte a nossa{' '}
            <a href="/returns" className="text-primary hover:underline">Política de Devoluções</a>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">8. Propriedade Intelectual</h2>
          <p className="text-muted-foreground leading-relaxed">
            Todo o conteúdo deste site (textos, imagens, logótipos, design) é propriedade da Fio & Alma Studio
            e está protegido por direitos de autor. É proibida a reprodução, distribuição ou utilização sem autorização prévia.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">9. Conta de Utilizador</h2>
          <p className="text-muted-foreground leading-relaxed">
            Ao criar uma conta, compromete-se a fornecer dados verdadeiros e a manter a confidencialidade
            da sua palavra-passe. É responsável por todas as atividades realizadas na sua conta.
            Pode solicitar o encerramento da sua conta a qualquer momento contactando-nos em ola@fioealma.pt.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">10. Limitação de Responsabilidade</h2>
          <p className="text-muted-foreground leading-relaxed">
            Embora façamos todos os esforços para garantir a disponibilidade e funcionalidade do site,
            não garantimos que o serviço estará sempre disponível ou livre de erros. Não nos responsabilizamos
            por danos indiretos resultantes da utilização ou impossibilidade de utilização do site.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">11. Lei Aplicável e Jurisdição</h2>
          <p className="text-muted-foreground leading-relaxed">
            Estes termos regem-se pela legislação portuguesa. Em caso de litígio, será competente o
            foro da comarca de Lisboa, sem prejuízo do recurso à resolução alternativa de litígios
            nos termos da Lei n.º 144/2015 (plataforma RAL:{' '}
            <a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              consumidor.gov.pt
            </a>).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">12. Contacto</h2>
          <p className="text-muted-foreground leading-relaxed">
            Para questões sobre estes termos:<br />
            <strong>Email:</strong> ola@fioealma.pt<br />
            <strong>Telefone:</strong> +351 912 345 678
          </p>
        </section>
      </div>
    </Layout>
  );
};

export default Terms;
