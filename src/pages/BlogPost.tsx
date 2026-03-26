import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { SEOHead } from '@/components/SEOHead';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, Share2 } from 'lucide-react';

/** Static blog post content — maps slug to full article content */
const blogPostContent: Record<string, {
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  image: string;
  keywords: string[];
  content: string;
}> = {
  'como-cuidar-pecas-croche': {
    title: 'Como Cuidar das Suas Peças de Crochê Artesanal',
    excerpt: 'Descubra os melhores cuidados para manter as suas peças de crochê feitas à mão bonitas e duradouras.',
    category: 'Dicas',
    readTime: '5 min',
    date: '2026-02-15',
    image: '🧶',
    keywords: ['cuidar crochê', 'manutenção peças artesanais', 'lavar crochê'],
    content: `
      <p>As peças de crochê artesanal são verdadeiras obras de arte feitas com carinho e dedicação. Para que durem muitos anos e mantenham a sua beleza, é essencial saber cuidar delas corretamente.</p>
      
      <h2>Lavagem</h2>
      <p>A regra de ouro para lavar peças de crochê é <strong>sempre à mão</strong>. Utilize água fria ou morna (nunca quente) com um detergente suave e neutro. Mergulhe a peça delicadamente sem esfregar ou torcer. Enxague bem com água limpa até remover todo o sabão.</p>
      
      <h2>Secagem</h2>
      <p>Nunca torça as peças de crochê. Após a lavagem, retire o excesso de água pressionando suavemente com uma toalha. Seque na horizontal, sobre uma superfície plana coberta com uma toalha seca, moldando a peça à sua forma original. <strong>Evite secar ao sol direto</strong>, pois pode desbotar as cores.</p>
      
      <h2>Armazenamento</h2>
      <p>Guarde as suas peças de crochê em local seco e arejado. Evite pendurá-las, pois podem deformar. O ideal é dobrá-las cuidadosamente e guardá-las em gavetas ou caixas forradas com papel de seda. Para peças maiores, enrole-as em vez de dobrar.</p>
      
      <h2>Dicas Extra</h2>
      <ul>
        <li>Nunca passe a ferro diretamente — se necessário, utilize vapor a uma distância segura</li>
        <li>Afaste de animais de estimação que possam puxar os fios</li>
        <li>Retire nódulos de fibra (pills) cuidadosamente à mão</li>
        <li>Se uma peça perder a forma, molhe-a ligeiramente e molde-a novamente</li>
      </ul>
      
      <p>Com estes cuidados simples, as suas peças de crochê artesanal Fio & Alma ficarão bonitas durante muitos anos!</p>
    `,
  },
  'presentes-artesanais-dia-mae': {
    title: '10 Presentes Artesanais Perfeitos para o Dia da Mãe',
    excerpt: 'Surpreenda a sua mãe com um presente feito à mão, cheio de significado e amor.',
    category: 'Inspiração',
    readTime: '7 min',
    date: '2026-02-10',
    image: '💐',
    keywords: ['presentes dia da mãe', 'oferta artesanal', 'presente feito à mão'],
    content: `
      <p>O Dia da Mãe é uma ocasião especial que merece um presente igualmente especial. Um presente artesanal transmite um carinho e uma atenção que nenhum produto industrial consegue igualar.</p>
      
      <h2>1. Cesto de Crochê</h2>
      <p>Um cesto decorativo em crochê é perfeito para organizar pequenos objetos. Feito à mão com fio de qualidade, é bonito e funcional.</p>
      
      <h2>2. Amigurumi Personalizado</h2>
      <p>Um boneco amigurumi feito à medida, inspirado no animal de estimação da mãe ou num tema que ela goste. Único e cheio de personalidade.</p>
      
      <h2>3. Peça de Cerâmica Artesanal</h2>
      <p>Uma chávena, prato ou vaso pintado à mão. Cada peça é única e pode ser personalizada com cores especiais.</p>
      
      <h2>4. Manta de Crochê</h2>
      <p>Uma manta aconchegante para as noites frias. Feita com fios macios, é o presente perfeito para uma mãe que adora conforto.</p>
      
      <h2>5. Conjunto de Porta-Copos</h2>
      <p>Porta-copos em crochê com padrões florais ou geométricos. Práticos, bonitos e feitos com amor.</p>
      
      <h2>6. Saco de Praia Artesanal</h2>
      <p>Para as mães que adoram praia, um saco feito em crochê é o companheiro perfeito para o verão.</p>
      
      <h2>7. Decoração para Casa</h2>
      <p>Almofadas decorativas, tapetes ou macramé para dar um toque artesanal à decoração da casa.</p>
      
      <h2>8. Jóias Artesanais</h2>
      <p>Brincos, colares ou pulseiras feitas à mão com materiais naturais e sustentáveis.</p>
      
      <h2>9. Caixa de Recordações</h2>
      <p>Uma caixa decorada à mão para guardar memórias especiais. Um presente com significado emocional.</p>
      
      <h2>10. Vale-Presente Fio & Alma</h2>
      <p>Se não tem a certeza do que a sua mãe prefere, ofereça um vale-presente para que ela escolha a peça perfeita!</p>
      
      <p>Na <strong>Fio & Alma Studio</strong>, cada peça é feita à mão com dedicação. Surpreenda a sua mãe com um presente que conta uma história.</p>
    `,
  },
  'artesanato-sustentavel': {
    title: 'Porquê Escolher Artesanato Sustentável?',
    excerpt: 'O artesanato feito à mão é uma escolha consciente para um consumo mais sustentável.',
    category: 'Sustentabilidade',
    readTime: '6 min',
    date: '2026-02-05',
    image: '🌿',
    keywords: ['artesanato sustentável', 'consumo consciente', 'produtos ecológicos'],
    content: `
      <p>Num mundo cada vez mais dominado pela produção em massa, escolher artesanato é muito mais do que uma compra — é um ato de consciência ambiental e social.</p>
      
      <h2>Menos Desperdício</h2>
      <p>Os produtos artesanais são feitos com a quantidade exata de material necessária. Não há sobras de produção industrial nem toneladas de stock não vendido a acabar em aterros. Cada peça é feita por encomenda ou em pequenas quantidades.</p>
      
      <h2>Materiais Naturais</h2>
      <p>No artesanato, privilegiam-se materiais naturais, reciclados e de origem local. Na Fio & Alma Studio, utilizamos fios de algodão orgânico, tintas não tóxicas e materiais sustentáveis sempre que possível.</p>
      
      <h2>Durabilidade</h2>
      <p>Uma peça feita à mão com qualidade dura anos — ao contrário dos produtos de fast fashion ou decoração barata que acabam no lixo em meses. Investir em artesanato é investir em longevidade.</p>
      
      <h2>Economia Local</h2>
      <p>Comprar artesanato apoia diretamente os artesãos e as comunidades locais. O dinheiro fica na economia local em vez de ir para grandes corporações.</p>
      
      <h2>Pegada de Carbono Reduzida</h2>
      <p>Sem fábricas, sem produção em massa, sem transporte intercontinental. O artesanato local tem uma pegada de carbono significativamente menor.</p>
      
      <h2>O Que Pode Fazer</h2>
      <ul>
        <li>Escolha produtos feitos à mão em vez de produzidos em massa</li>
        <li>Valorize a qualidade em vez da quantidade</li>
        <li>Apoie artesãos locais e pequenos negócios</li>
        <li>Ofereça presentes artesanais — com significado e sustentabilidade</li>
      </ul>
      
      <p>Na <strong>Fio & Alma Studio</strong>, acreditamos que cada compra consciente faz a diferença. Escolha artesanato sustentável. O planeta agradece.</p>
    `,
  },
  'tendencias-decoracao-artesanal-2026': {
    title: 'Tendências de Decoração Artesanal para 2026',
    excerpt: 'As tendências para 2026 valorizam o feito à mão. Descubra como integrar peças artesanais na sua casa.',
    category: 'Tendências',
    readTime: '8 min',
    date: '2026-01-28',
    image: '🏠',
    keywords: ['tendências decoração 2026', 'decoração artesanal', 'casa artesanal'],
    content: `
      <p>2026 é o ano do artesanato na decoração. As grandes tendências de design de interiores apontam para peças únicas, feitas à mão, que trazem personalidade e alma a qualquer espaço.</p>
      
      <h2>1. Texturas Naturais</h2>
      <p>Tecidos em crochê, macramé, cerâmica rústica e madeira natural dominam as tendências. O objetivo é criar ambientes acolhedores com materiais que contem uma história.</p>
      
      <h2>2. Cores Terrosas e Suaves</h2>
      <p>Tons de terracota, bege, verde-salva e rosa antigo estão em alta. Estas cores combinam perfeitamente com peças artesanais e criam uma atmosfera serena.</p>
      
      <h2>3. Peças Únicas como Protagonistas</h2>
      <p>Em vez de muitos acessórios iguais, a tendência é ter poucas peças, mas únicas e com significado. Uma cerâmica artesanal como centro de mesa pode ser o destaque de toda a sala.</p>
      
      <h2>4. Handmade é Luxo</h2>
      <p>O conceito de luxo está a mudar. Já não se trata de marcas caras, mas de algo que foi feito com tempo, talento e dedicação. O artesanato é o novo luxo.</p>
      
      <h2>5. Sustentabilidade em Primeiro Lugar</h2>
      <p>O consumidor de 2026 valoriza a origem e o impacto ambiental. Peças artesanais, locais e sustentáveis são a escolha natural para decorar com consciência.</p>
      
      <h2>Como Integrar na Sua Casa</h2>
      <ul>
        <li>Substitua almofadas industriais por capas em crochê feitas à mão</li>
        <li>Adicione um tapete artesanal ao quarto ou sala</li>
        <li>Troque cestos de plástico por cestos de crochê ou vime artesanal</li>
        <li>Coloque peças de cerâmica artesanal nas prateleiras</li>
      </ul>
      
      <p>Na <strong>Fio & Alma Studio</strong>, encontra peças que seguem estas tendências e transformam qualquer espaço.</p>
    `,
  },
  'croche-artesanal-especial': {
    title: 'O Que Torna o Crochê Artesanal Especial?',
    excerpt: 'Cada peça de crochê feita à mão conta uma história.',
    category: 'Artesanato',
    readTime: '5 min',
    date: '2026-01-20',
    image: '✨',
    keywords: ['crochê artesanal', 'crochê feito à mão', 'benefícios crochê'],
    content: `
      <p>O crochê artesanal é uma das formas mais antigas e belas de artesanato têxtil. Mas o que o torna tão especial comparado com produtos feitos por máquinas?</p>
      
      <h2>Cada Peça é Única</h2>
      <p>Mesmo que uma artesã faça duas peças "iguais", cada uma terá a sua personalidade própria. As pequenas variações são a marca do feito à mão — e é nessas diferenças que está a beleza.</p>
      
      <h2>Tempo e Dedicação</h2>
      <p>Uma peça de crochê artesanal pode levar horas, dias ou até semanas a ser concluída. Cada ponto é feito manualmente, com atenção ao detalhe. Quando oferece ou compra crochê artesanal, está a valorizar esse tempo e essa dedicação.</p>
      
      <h2>Qualidade Superior</h2>
      <p>Os artesãos escolhem cuidadosamente os fios e materiais. Não há máquinas a forçar pontos — cada tensão é controlada pela mão. O resultado é uma peça mais resistente, com melhor acabamento e toque mais agradável.</p>
      
      <h2>História e Tradição</h2>
      <p>O crochê é uma técnica com séculos de história. Ao comprar crochê artesanal, está a preservar uma tradição que passa de geração em geração e a apoiar quem a mantém viva.</p>
      
      <h2>Ligação Emocional</h2>
      <p>Há algo profundamente humano numa peça feita à mão. Saber que alguém dedicou horas do seu tempo a criar algo para si cria uma ligação emocional que nenhum produto industrial proporciona.</p>
      
      <p>Na <strong>Fio & Alma Studio</strong>, cada peça de crochê é feita com amor. Descubra a nossa coleção e sinta a diferença.</p>
    `,
  },
  'guia-presentes-artesanais': {
    title: 'Guia de Presentes Artesanais para Cada Ocasião',
    excerpt: 'O guia completo para escolher o presente artesanal perfeito.',
    category: 'Guia',
    readTime: '10 min',
    date: '2026-01-15',
    image: '🎁',
    keywords: ['guia presentes', 'presentes artesanais', 'oferta personalizada'],
    content: `
      <p>Escolher o presente perfeito pode ser um desafio. Mas com artesanato, é quase impossível errar — porque cada peça é única e feita com carinho. Aqui está o nosso guia por ocasião:</p>
      
      <h2>🎂 Aniversários</h2>
      <p>Para aniversários, aposte em peças personalizadas: amigurumis com o animal favorito, cerâmica com iniciais pintadas à mão, ou um cesto decorativo para a casa.</p>
      
      <h2>💐 Dia da Mãe / Dia do Pai</h2>
      <p>Peças decorativas para casa são sempre bem recebidas: almofadas de crochê, porta-retratos artesanais ou uma manta feita com amor.</p>
      
      <h2>💝 São Valentim</h2>
      <p>Amigurumis em forma de coração, jóias artesanais ou um conjunto de velas e cerâmica para um ambiente romântico.</p>
      
      <h2>🎄 Natal</h2>
      <p>Decorações natalícias feitas à mão, meias de Natal em crochê, bonecos de neve amigurumi ou cestos com presentes artesanais variados.</p>
      
      <h2>👶 Nascimento / Batizado</h2>
      <p>Mantas de bebé em crochê, amigurumis macios, sapatinhos e gorros feitos à mão. Presentes que se guardam para sempre.</p>
      
      <h2>🏠 Casa Nova</h2>
      <p>Cestos organizadores, mantas, almofadas ou peças de cerâmica decorativa para dar vida ao novo lar.</p>
      
      <h2>Dica: Não Sabe o Que Escolher?</h2>
      <p>Contacte-nos! Na <strong>Fio & Alma Studio</strong>, ajudamos a encontrar o presente perfeito. Fazemos peças personalizadas e por encomenda.</p>
    `,
  },
  'historia-artesas-fio-alma': {
    title: 'A História por Trás de Cada Peça: Conhece as Nossas Artesãs',
    excerpt: 'Conheça as mãos que criam cada peça do Fio & Alma Studio.',
    category: 'Sobre Nós',
    readTime: '6 min',
    date: '2026-01-10',
    image: '👩‍🎨',
    keywords: ['artesãs portuguesas', 'história artesanato', 'fio e alma studio'],
    content: `
      <p>Por trás de cada peça da Fio & Alma Studio estão mãos dedicadas, criativas e apaixonadas. Conheça a história das nossas artesãs.</p>
      
      <h2>Como Tudo Começou</h2>
      <p>A Fio & Alma nasceu do encontro de duas amigas com uma paixão em comum: o artesanato. O que começou como um hobby partilhado durante tardes de inverno rapidamente se transformou em algo maior.</p>
      
      <h2>A Paixão pelo Detalhe</h2>
      <p>Cada peça que sai das nossas mãos passa por um processo cuidadoso. Desde a escolha dos materiais até ao último acabamento, nada é deixado ao acaso. Trabalhamos com fios de qualidade, cores pensadas e padrões originais.</p>
      
      <h2>Tradição e Modernidade</h2>
      <p>Respeitamos as técnicas tradicionais do crochê e da cerâmica portuguesa, mas não temos medo de inovar. Misturamos o clássico com o contemporâneo para criar peças que fazem sentido nos dias de hoje.</p>
      
      <h2>O Nosso Compromisso</h2>
      <p>Cada peça é feita com alma. Queremos que, ao segurar uma peça Fio & Alma, sinta o carinho e a dedicação que colocamos nela. É essa a nossa promessa.</p>
      
      <p>Obrigada por nos acompanhar nesta jornada. Cada compra é um incentivo para continuarmos a fazer o que amamos. 💛</p>
    `,
  },
  'ceramica-artesanal-argila-peca-unica': {
    title: 'Cerâmica Artesanal: Da Argila à Peça Única',
    excerpt: 'Descubra o fascinante processo de criação de cerâmica artesanal.',
    category: 'Processo',
    readTime: '7 min',
    date: '2026-01-05',
    image: '🏺',
    keywords: ['cerâmica artesanal', 'processo cerâmica', 'peça única cerâmica'],
    content: `
      <p>A cerâmica artesanal é uma das artes mais antigas da humanidade. Transformar argila numa peça funcional e bonita é um processo fascinante que combina técnica, paciência e criatividade.</p>
      
      <h2>1. A Escolha da Argila</h2>
      <p>Tudo começa com a seleção da argila certa. Existem diferentes tipos com propriedades distintas: grés, faiança, porcelana. Cada uma tem a sua cor, textura e comportamento na cozedura.</p>
      
      <h2>2. Moldagem</h2>
      <p>A argila é trabalhada à mão ou no torno. No caso artesanal, muitas peças são moldadas manualmente, o que garante uma forma orgânica e única. O artesão sente a argila e vai moldando com sensibilidade.</p>
      
      <h2>3. Secagem</h2>
      <p>Após a moldagem, a peça precisa de secar lentamente ao ar. Este processo pode levar dias e é crucial — uma secagem apressada pode causar fissuras.</p>
      
      <h2>4. Primeira Cozedura (Biscoito)</h2>
      <p>A peça seca vai ao forno a temperaturas que podem chegar aos 1000°C. Esta cozedura endurece a argila e prepara-a para receber a vidração.</p>
      
      <h2>5. Vidração e Pintura</h2>
      <p>É aqui que a magia acontece. As cores e padrões são aplicados à mão com pincéis e técnicas tradicionais. Cada pincelada é única.</p>
      
      <h2>6. Segunda Cozedura</h2>
      <p>Uma nova ida ao forno fixa as cores e cria o acabamento brilhante ou mate. A peça está finalmente pronta — única e irrepetível.</p>
      
      <p>Na <strong>Fio & Alma Studio</strong>, cada peça de cerâmica passa por este processo artesanal completo. Descubra a nossa coleção.</p>
    `,
  },
  'bonecos-artesanais-presentes': {
    title: 'Bonecos Artesanais: Presentes que Ficam para Sempre',
    excerpt: 'Os bonecos feitos à mão são presentes únicos e cheios de carinho.',
    category: 'Produtos',
    readTime: '5 min',
    date: '2025-12-28',
    image: '🧸',
    keywords: ['bonecos artesanais', 'amigurumi', 'bonecos feitos à mão'],
    content: `
      <p>Os bonecos artesanais — especialmente os amigurumis (técnica japonesa de crochê) — são muito mais do que brinquedos. São peças de arte que carregam emoção e significado.</p>
      
      <h2>O Que São Amigurumis?</h2>
      <p>Amigurumi é a arte japonesa de criar bonecos em crochê ou tricot. O nome vem de "ami" (crochê/tricot) + "nuigurumi" (boneco de peluche). São peças pequenas, fofas e incrivelmente detalhadas.</p>
      
      <h2>Porquê Oferecer um Boneco Artesanal?</h2>
      <ul>
        <li><strong>Único:</strong> Não há dois iguais</li>
        <li><strong>Seguro:</strong> Feito com materiais seguros, sem peças pequenas coladas</li>
        <li><strong>Durável:</strong> Resiste a muitas brincadeiras e lavagens</li>
        <li><strong>Personalizável:</strong> Cores, tamanho e personagem à escolha</li>
        <li><strong>Emocional:</strong> Um presente com alma que se guarda para sempre</li>
      </ul>
      
      <h2>Ideias de Bonecos</h2>
      <p>Animais (ursos, coelhos, gatos), personagens de contos, bonecos inspirados em pessoas reais, ou mascotes temáticas para datas especiais como o Natal ou a Páscoa.</p>
      
      <p>Na <strong>Fio & Alma Studio</strong>, cada boneco é crochê à mão com amor. Faça um pedido personalizado!</p>
    `,
  },
  'artesanato-portugues-tradicao': {
    title: 'Artesanato Português: Tradição que se Reinventa',
    excerpt: 'O artesanato português tem raízes profundas e reinventa-se com modernidade.',
    category: 'Cultura',
    readTime: '8 min',
    date: '2025-12-20',
    image: '🇵🇹',
    keywords: ['artesanato português', 'tradição artesanal', 'cultura portuguesa'],
    content: `
      <p>Portugal tem uma das tradições artesanais mais ricas da Europa. Desde os bordados de Viana do Castelo à cerâmica de Barcelos, passando pelo crochê alentejano, o artesanato faz parte da identidade nacional.</p>
      
      <h2>Raízes Profundas</h2>
      <p>O artesanato português tem séculos de história. Cada região desenvolveu as suas técnicas e estilos, usando os materiais disponíveis localmente: lã, linho, barro, cortiça, vime.</p>
      
      <h2>Desafios Modernos</h2>
      <p>Com a industrialização, muitas técnicas artesanais correram o risco de desaparecer. Mas nos últimos anos, uma nova geração de artesãos está a reinventar o artesanato, adaptando técnicas tradicionais ao gosto contemporâneo.</p>
      
      <h2>O Renascimento do Handmade</h2>
      <p>O movimento "handmade" e "slow living" trouxe o artesanato de volta. Os consumidores procuram produtos com história, feitos com intenção e sustentabilidade — e o artesanato português responde a esta procura.</p>
      
      <h2>Fio & Alma: Tradição com Alma</h2>
      <p>Na Fio & Alma Studio, combinamos técnicas tradicionais de crochê e cerâmica com design contemporâneo. Cada peça respeita a tradição mas fala a linguagem de hoje.</p>
      
      <h2>Como Apoiar o Artesanato Português</h2>
      <ul>
        <li>Compre artesanato em vez de produtos industriais</li>
        <li>Visite feiras e mercados de artesanato</li>
        <li>Ofereça presentes artesanais portugueses</li>
        <li>Partilhe nas redes sociais o trabalho dos artesãos que admira</li>
      </ul>
      
      <p>Cada compra artesanal é um voto a favor da tradição, da qualidade e da alma portuguesa. 🇵🇹</p>
    `,
  },
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? blogPostContent[slug] : undefined;

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const shareUrl = `https://fioealma.pt/blog/${slug}`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: post.title, text: post.excerpt, url: shareUrl });
    } else {
      navigator.clipboard.writeText(shareUrl);
      import('sonner').then(({ toast }) => toast.success('Link copiado!'));
    }
  };

  return (
    <Layout>
      <SEOHead
        title={`${post.title} | Blog - Fio & Alma Studio`}
        description={post.excerpt}
        canonical={shareUrl}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          datePublished: post.date,
          keywords: post.keywords.join(', '),
          image: `https://fioealma.pt/icons/icon-512.png`,
          author: { "@type": "Organization", name: "Fio & Alma Studio" },
          publisher: { "@type": "Organization", name: "Fio & Alma Studio" },
          url: shareUrl,
        }}
      />
      <div className="container py-10 max-w-3xl mx-auto">
        {/* Back link */}
        <Link to="/blog">
          <Button variant="ghost" size="sm" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Blog
          </Button>
        </Link>

        {/* Hero */}
        <div className="text-center mb-10">
          <span className="text-7xl block mb-6">{post.image}</span>
          <Badge variant="outline" className="mb-3">{post.category}</Badge>
          <h1 className="font-serif text-3xl md:text-4xl font-bold leading-tight mb-4">
            {post.title}
          </h1>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(post.date).toLocaleDateString('pt-PT')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {post.readTime} de leitura
            </span>
          </div>
        </div>

        {/* Content */}
        <article
          className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-serif prose-headings:font-bold prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-p:leading-relaxed prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Share & CTA */}
        <div className="mt-12 pt-8 border-t">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
              <Share2 className="h-4 w-4" />
              Partilhar Artigo
            </Button>
            <div className="flex gap-3">
              <Link to="/products">
                <Button size="sm">Ver Produtos</Button>
              </Link>
              <Link to="/blog">
                <Button variant="outline" size="sm">Mais Artigos</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Keywords for SEO */}
        <div className="mt-8 flex flex-wrap gap-2">
          {post.keywords.map((kw) => (
            <Badge key={kw} variant="secondary" className="text-xs">
              {kw}
            </Badge>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default BlogPost;
