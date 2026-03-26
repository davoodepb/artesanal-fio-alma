import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Newspaper, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  image_url: string;
  is_published: boolean;
  created_at: string;
}

interface NewsData {
  items: NewsItem[];
}

export function NewsSection() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'news')
          .maybeSingle();

        if (!error && data?.value) {
          const newsData = data.value as unknown as NewsData;
          const published = (newsData.items || []).filter(item => item.is_published);
          setNewsItems(published.slice(0, 6));
        }
      } catch (err) {
        console.error('Error fetching news:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNews();
  }, []);

  if (isLoading || newsItems.length === 0) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <section className="py-20 bg-secondary/30">
      <div className="container">
        <div className="text-center mb-14">
          <p className="text-craft font-medium mb-2">✿ Fique por dentro ✿</p>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground">
            Novidades
          </h2>
          <div className="stitch-divider w-24 mx-auto mt-4" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {newsItems.map((item) => (
            <Card
              key={item.id}
              className="group overflow-hidden border-craft/20 hover:shadow-lg hover:border-primary/30 transition-all duration-500"
            >
              {item.image_url && (
                <div className="aspect-[4/3] overflow-hidden bg-white flex items-center justify-center">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Newspaper className="h-3.5 w-3.5" />
                  <span>{formatDate(item.created_at)}</span>
                </div>
                <h3 className="font-serif font-semibold text-lg text-foreground mb-2 line-clamp-2">
                  {item.title}
                </h3>
                {item.content && (
                  <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                    {item.content}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
