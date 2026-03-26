import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, Trash2, Star, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Review {
  id: string;
  product_id: string;
  user_id: string | null;
  user_name: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  product_name?: string;
}

export function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch product names
      const productIds = [...new Set((data || []).map(r => r.product_id))];
      const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds);

      const productMap: Record<string, string> = {};
      (products || []).forEach((p: any) => { productMap[p.id] = p.name; });

      setReviews(
        (data || []).map(r => ({
          ...r,
          product_name: productMap[r.product_id] || 'Produto removido',
        }))
      );
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Erro ao carregar avaliações');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ is_approved: true })
        .eq('id', id);

      if (error) throw error;

      setReviews(prev => prev.map(r => r.id === id ? { ...r, is_approved: true } : r));
      toast.success('Avaliação aprovada!');
    } catch (error) {
      toast.error('Erro ao aprovar avaliação');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ is_approved: false })
        .eq('id', id);

      if (error) throw error;

      setReviews(prev => prev.map(r => r.id === id ? { ...r, is_approved: false } : r));
      toast.success('Avaliação rejeitada');
    } catch (error) {
      toast.error('Erro ao rejeitar avaliação');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja eliminar esta avaliação permanentemente?')) return;

    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setReviews(prev => prev.filter(r => r.id !== id));
      toast.success('Avaliação eliminada!');
    } catch (error) {
      toast.error('Erro ao eliminar avaliação');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredReviews = reviews.filter(r => {
    if (filter === 'pending') return !r.is_approved;
    if (filter === 'approved') return r.is_approved;
    return true;
  });

  const pendingCount = reviews.filter(r => !r.is_approved).length;
  const approvedCount = reviews.filter(r => r.is_approved).length;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">Avaliações</h1>
        <p className="text-muted-foreground">Modere as avaliações dos clientes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{reviews.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Aprovadas</p>
            <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Avaliação Média</p>
            <p className="text-2xl font-bold flex items-center justify-center gap-1">
              {avgRating} <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Todas ({reviews.length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('pending')}
        >
          Pendentes ({pendingCount})
        </Button>
        <Button
          variant={filter === 'approved' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('approved')}
        >
          Aprovadas ({approvedCount})
        </Button>
      </div>

      {/* Reviews Table */}
      <Card>
        <CardContent className="p-0">
          {filteredReviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {filter === 'pending' ? 'Nenhuma avaliação pendente' :
                 filter === 'approved' ? 'Nenhuma avaliação aprovada' :
                 'Nenhuma avaliação encontrada'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Avaliação</TableHead>
                  <TableHead>Comentário</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">{review.user_name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[150px] truncate">
                      {review.product_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {review.comment || '—'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={review.is_approved ? 'default' : 'secondary'}>
                        {review.is_approved ? 'Aprovada' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(review.created_at).toLocaleDateString('pt-PT')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!review.is_approved && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleApprove(review.id)}
                            disabled={updatingId === review.id}
                            title="Aprovar"
                          >
                            {updatingId === review.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                        )}
                        {review.is_approved && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReject(review.id)}
                            disabled={updatingId === review.id}
                            title="Rejeitar"
                          >
                            {updatingId === review.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4 text-yellow-600" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(review.id)}
                          disabled={updatingId === review.id}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
