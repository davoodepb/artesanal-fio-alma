import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { SEOHead } from '@/components/SEOHead';

const Returns = () => {
  return (
    <Layout>
      <SEOHead
        title="Política de Devoluções | Fio & Alma Studio"
        description="Conheça a política de devoluções e reembolsos da Fio & Alma Studio. Prazo de 14 dias, condições e procedimento para devolução de produtos artesanais."
        canonical="https://fio-alma-studio.vercel.app/returns"
      />
      <div className="container py-10 max-w-3xl prose prose-slate dark:prose-invert mx-auto">
        <h1 className="font-serif text-3xl font-bold mb-2">Política de Devoluções</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Última atualização: 28 de fevereiro de 2026
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">1. Direito de Livre Resolução</h2>
          <p className="text-muted-foreground leading-relaxed">
            Nos termos do Decreto-Lei n.º 24/2014, tem o direito de devolver os produtos adquiridos
            no prazo de <strong>14 dias</strong> a contar da data de receção, sem necessidade de indicar
            o motivo e sem quaisquer penalidades, exceto os custos de devolução.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">2. Condições de Devolução</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Para que a devolução seja aceite, os produtos devem:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Estar em perfeitas condições, sem sinais de uso</li>
            <li>Estar na embalagem original, quando aplicável</li>
            <li>Ser acompanhados da fatura ou comprovativo de compra</li>
            <li>Ser devolvidos no prazo de 14 dias após comunicação da intenção de devolução</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            <strong>Nota:</strong> Produtos personalizados ou feitos por encomenda não são elegíveis para devolução,
            exceto em caso de defeito, conforme previsto na lei.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">3. Procedimento de Devolução</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Para iniciar uma devolução:
          </p>
          <ol className="list-decimal pl-6 text-muted-foreground space-y-2">
            <li>
              <strong>Contacte-nos</strong> por email para <strong>ola@fioealma.pt</strong> indicando:
              <ul className="list-disc pl-6 mt-1 space-y-1">
                <li>Número da encomenda</li>
                <li>Produto(s) a devolver</li>
                <li>Motivo da devolução (opcional)</li>
              </ul>
            </li>
            <li>
              <strong>Receberá instruções</strong> por email com a morada de devolução e etiqueta (quando aplicável).
            </li>
            <li>
              <strong>Envie os produtos</strong> devidamente embalados no prazo de 14 dias após a comunicação.
            </li>
            <li>
              <strong>Após receção e verificação</strong>, processaremos o reembolso no prazo máximo de 14 dias.
            </li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">4. Custos de Devolução</h2>
          <p className="text-muted-foreground leading-relaxed">
            Os custos de envio para devolução são da responsabilidade do cliente, exceto nos seguintes casos:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-3">
            <li>Produto com defeito de fabrico</li>
            <li>Produto diferente do encomendado</li>
            <li>Produto danificado durante o transporte</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            Nestes casos, a Fio & Alma Studio assume os custos de devolução.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">5. Reembolsos</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            O reembolso será efetuado através do mesmo método de pagamento utilizado na compra:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>MB WAY / Cartão:</strong> Reembolso automático em 5 a 10 dias úteis</li>
            <li><strong>Transferência Bancária:</strong> Transferência no prazo de 5 dias úteis</li>
            <li><strong>Multibanco:</strong> Transferência para conta indicada pelo cliente</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            O valor do reembolso inclui o preço do(s) produto(s). Os portes de envio originais
            só são reembolsados se a devolução resultar de erro nosso ou defeito do produto.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">6. Trocas</h2>
          <p className="text-muted-foreground leading-relaxed">
            Dado que os nossos produtos são artesanais e muitas vezes peças únicas, as trocas
            estão sujeitas à disponibilidade. Contacte-nos para verificar a possibilidade de troca
            antes de devolver o produto.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">7. Produtos Defeituosos</h2>
          <p className="text-muted-foreground leading-relaxed">
            Se receber um produto com defeito, contacte-nos no prazo de 48 horas após a receção,
            enviando fotografias do defeito. Terá direito à substituição do produto (sujeita a disponibilidade),
            reparação ou reembolso total, incluindo portes de envio.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">8. Contacto</h2>
          <p className="text-muted-foreground leading-relaxed">
            Para devoluções e reclamações:<br />
            <strong>Email:</strong> ola@fioealma.pt<br />
            <strong>Telefone:</strong> +351 912 345 678<br />
            <strong>Livro de Reclamações Eletrónico:</strong>{' '}
            <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              livroreclamacoes.pt
            </a>
          </p>
        </section>
      </div>
    </Layout>
  );
};

export default Returns;
