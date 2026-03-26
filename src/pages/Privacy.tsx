import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { SEOHead } from '@/components/SEOHead';

const Privacy = () => {
  return (
    <Layout>
      <SEOHead
        title="Política de Privacidade | Fio & Alma Studio"
        description="Política de privacidade da Fio & Alma Studio. Saiba como recolhemos, usamos e protegemos os seus dados pessoais em conformidade com o RGPD."
        canonical="https://fioealma.pt/privacy"
      />
      <div className="container py-10 max-w-3xl prose prose-slate dark:prose-invert mx-auto">
        <h1 className="font-serif text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Última atualização: 28 de fevereiro de 2026
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">1. Responsável pelo Tratamento</h2>
          <p className="text-muted-foreground leading-relaxed">
            <strong>Fio & Alma Studio</strong><br />
            Email: ola@fioealma.pt<br />
            Telefone: +351 912 345 678<br />
            Localização: Lisboa, Portugal
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">2. Dados que Recolhemos</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">Recolhemos os seguintes dados pessoais:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>Dados de identificação:</strong> nome completo, email, telefone</li>
            <li><strong>Dados de envio:</strong> morada de entrega</li>
            <li><strong>Dados de faturação:</strong> NIF (quando fornecido voluntariamente)</li>
            <li><strong>Dados de conta:</strong> email e palavra-passe encriptada</li>
            <li><strong>Dados de navegação:</strong> cookies técnicos e analíticos (com consentimento)</li>
            <li><strong>Dados de compra:</strong> histórico de encomendas, produtos adquiridos, faturas</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">3. Finalidade do Tratamento</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">Os seus dados são tratados para:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Processar e entregar as suas encomendas</li>
            <li>Emitir faturas e documentos fiscais</li>
            <li>Comunicar sobre o estado das encomendas</li>
            <li>Gerir a sua conta de utilizador</li>
            <li>Enviar newsletter (apenas com o seu consentimento)</li>
            <li>Melhorar o nosso site e serviço através de análise estatística</li>
            <li>Cumprir obrigações legais e fiscais</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">4. Base Legal</h2>
          <p className="text-muted-foreground leading-relaxed">
            O tratamento dos seus dados baseia-se em: (a) execução de contrato (processamento de encomendas),
            (b) consentimento (newsletter, cookies analíticos), (c) obrigação legal (faturação, dados fiscais),
            (d) interesse legítimo (melhoria do serviço, segurança).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">5. Partilha de Dados</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">Os seus dados podem ser partilhados com:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>Serviços de alojamento:</strong> Supabase (base de dados e autenticação)</li>
            <li><strong>Serviços de email:</strong> Resend (envio de emails transacionais)</li>
            <li><strong>Serviços de entrega:</strong> Transportadoras para expedição de encomendas</li>
            <li><strong>Autoridades fiscais:</strong> Quando exigido por lei (AT - Autoridade Tributária)</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            Não vendemos nem partilhamos os seus dados com terceiros para fins de marketing.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">6. Cookies</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">Utilizamos os seguintes tipos de cookies:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>Cookies essenciais:</strong> Necessários para o funcionamento do site (autenticação, carrinho)</li>
            <li><strong>Cookies analíticos:</strong> Ajudam-nos a compreender como utiliza o site (apenas com consentimento)</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            Pode gerir as suas preferências de cookies a qualquer momento através do banner de cookies.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">7. Os Seus Direitos (RGPD)</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Ao abrigo do Regulamento Geral sobre a Proteção de Dados (RGPD), tem os seguintes direitos:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>Direito de acesso:</strong> Solicitar uma cópia dos seus dados pessoais</li>
            <li><strong>Direito de retificação:</strong> Corrigir dados incorretos ou incompletos</li>
            <li><strong>Direito ao apagamento:</strong> Solicitar a eliminação dos seus dados ("direito ao esquecimento")</li>
            <li><strong>Direito à portabilidade:</strong> Receber os seus dados em formato estruturado</li>
            <li><strong>Direito de oposição:</strong> Opor-se ao tratamento dos seus dados</li>
            <li><strong>Direito de retirar o consentimento:</strong> A qualquer momento, sem afetar a licitude do tratamento anterior</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            Para exercer os seus direitos, contacte-nos através de <strong>ola@fioealma.pt</strong>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">8. Retenção de Dados</h2>
          <p className="text-muted-foreground leading-relaxed">
            Os seus dados pessoais são conservados pelo tempo necessário para a finalidade para a qual foram recolhidos.
            Dados de faturação são conservados pelo período legalmente exigido (atualmente 10 anos, conforme legislação fiscal portuguesa).
            Dados da conta são conservados enquanto a conta estiver ativa. Após o encerramento, são eliminados no prazo de 30 dias,
            exceto quando exista obrigação legal de conservação.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">9. Segurança</h2>
          <p className="text-muted-foreground leading-relaxed">
            Implementamos medidas técnicas e organizativas adequadas para proteger os seus dados,
            incluindo encriptação SSL/TLS, passwords encriptadas com hashing seguro,
            controlo de acessos e monitorização contínua. Em caso de violação de dados,
            será notificado nos termos do RGPD.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">10. Reclamações</h2>
          <p className="text-muted-foreground leading-relaxed">
            Se considerar que o tratamento dos seus dados viola a legislação aplicável,
            pode apresentar reclamação junto da <strong>Comissão Nacional de Proteção de Dados (CNPD)</strong> — 
            <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"> www.cnpd.pt</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">11. Alterações</h2>
          <p className="text-muted-foreground leading-relaxed">
            Esta política pode ser atualizada periodicamente. A data da última atualização está indicada no topo.
            Recomendamos que consulte esta página regularmente.
          </p>
        </section>
      </div>
    </Layout>
  );
};

export default Privacy;
