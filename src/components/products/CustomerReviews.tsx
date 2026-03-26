import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Loader2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Review {
  id: string;
  rating: number;
  comment: string;
  is_approved: boolean | null;
  created_at: string;
  profiles?: { full_name: string | null } | null;
}

interface CustomerReviewsProps {
  productId: string;
}

export function CustomerReviews({ productId }: CustomerReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      // Fetch approved reviews
      const { data } = await supabase
        .from('reviews')
        .select('id, rating, comment, is_approved, created_at, user_id')
        .eq('product_id', productId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (data) {
        // Fetch profile names for reviewers
        const userIds = [...new Set(data.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

        const reviewsWithNames = data.map(r => ({
          ...r,
          profiles: { full_name: profileMap.get(r.user_id) || null },
        }));

        setReviews(reviewsWithNames);
      }

      // Check if current user already reviewed
      if (user) {
        const { data: existing } = await supabase
          .from('reviews')
          .select('id')
          .eq('product_id', productId)
          .eq('user_id', user.id)
          .maybeSingle();
        setHasReviewed(!!existing);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Faça login para deixar uma avaliação.');
      return;
    }
    if (rating === 0) {
      toast.error('Selecione uma classificação (1-5 estrelas).');
      return;
    }
    if (!comment.trim()) {
      toast.error('Escreva um comentário.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        product_id: productId,
        user_id: user.id,
        user_name: user.email || 'Cliente',
        rating,
        comment: comment.trim(),
        is_approved: false,
      });

      if (error) throw error;

      toast.success('Avaliação enviada! Será publicada após moderação.');
      setRating(0);
      setComment('');
      setHasReviewed(true);
    } catch (err: any) {
      console.error('Error submitting review:', err);
      toast.error('Erro ao enviar avaliação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <section className="mt-16 pt-16 border-t">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-serif text-2xl font-bold">Avaliações</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-4 w-4',
                      i <= Math.round(avgRating) ? 'fill-star text-star' : 'text-muted',
                    )}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {avgRating.toFixed(1)} ({reviews.length} avaliação{reviews.length !== 1 ? 'ões' : ''})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Submit form */}
      {user && !hasReviewed && (
        <Card className="mb-8">
          <CardContent className="p-5">
            <h3 className="font-medium mb-3">Deixe a sua avaliação</h3>

            {/* Star rating */}
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  onMouseEnter={() => setHoverRating(i)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none"
                >
                  <Star
                    className={cn(
                      'h-7 w-7 transition-colors cursor-pointer',
                      i <= (hoverRating || rating)
                        ? 'fill-star text-star'
                        : 'text-muted hover:text-star/50',
                    )}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-muted-foreground self-center">
                  {rating}/5
                </span>
              )}
            </div>

            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Partilhe a sua experiência com este produto…"
              rows={3}
              className="mb-3"
            />

            <Button onClick={handleSubmit} disabled={submitting} size="sm">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A enviar…
                </>
              ) : (
                'Enviar Avaliação'
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              A sua avaliação será publicada após moderação.
            </p>
          </CardContent>
        </Card>
      )}

      {!user && (
        <p className="text-sm text-muted-foreground mb-6">
          <a href="/login" className="text-primary hover:underline">Faça login</a> para deixar uma avaliação.
        </p>
      )}

      {hasReviewed && (
        <p className="text-sm text-green-600 mb-6">
          ✓ Já enviou a sua avaliação para este produto. Obrigado!
        </p>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Ainda não há avaliações para este produto.</p>
          <p className="text-sm mt-2">Seja o primeiro a avaliar!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {review.profiles?.full_name || 'Cliente'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                  </div>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={cn(
                          'h-4 w-4',
                          i <= review.rating ? 'fill-star text-star' : 'text-muted',
                        )}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {review.comment}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
