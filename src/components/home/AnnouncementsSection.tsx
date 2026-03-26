import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Megaphone, X } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  is_published: boolean;
  created_at: string;
}

export function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(3);

      if (!error && data) {
        setAnnouncements(data as Announcement[]);
      }
    };
    fetchAnnouncements();
  }, []);

  const visible = announcements.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <section className="bg-primary/5 border-b border-primary/10">
      <div className="container py-3">
        <div className="flex flex-col gap-2">
          {visible.map((announcement) => (
            <div
              key={announcement.id}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20 text-sm"
            >
              <Megaphone className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-foreground">{announcement.title}</span>
                {announcement.body && (
                  <span className="text-muted-foreground ml-2">— {announcement.body}</span>
                )}
              </div>
              <button
                onClick={() => setDismissed(prev => new Set([...prev, announcement.id]))}
                className="shrink-0 p-1 rounded-full hover:bg-primary/20 transition-colors"
                aria-label="Fechar"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
