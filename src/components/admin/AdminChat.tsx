import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  Loader2, Send, MessageCircle, ImagePlus, Trash2, Ban,
  XCircle, AlertTriangle, MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { processImageForUpload } from '@/lib/imageUtils';
import { parseFirebaseUploadError, UploadDiagnostic } from '@/lib/firebaseUploadDiagnostics';

const IMAGE_PREFIX = '[image:';
const IMAGE_SUFFIX = ']';
const MAX_INLINE_IMAGE_BYTES = 2 * 1024 * 1024;

function isImageMessage(content: string): boolean {
  return content.startsWith(IMAGE_PREFIX) && content.endsWith(IMAGE_SUFFIX);
}

function extractImageUrl(content: string): string {
  return content.slice(IMAGE_PREFIX.length, -IMAGE_SUFFIX.length);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao converter imagem.'));
    reader.readAsDataURL(file);
  });
}

function triggerBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !("Notification" in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
    return;
  }
  if (Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    });
  }
}

interface Conversation {
  id: string;
  customer_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_email?: string;
  last_message?: string;
  unread_count?: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export function AdminChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDiagnostic, setUploadDiagnostic] = useState<UploadDiagnostic | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedConvRef = useRef<Conversation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Moderation dialogs
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [clearConvId, setClearConvId] = useState<string | null>(null);
  const [closeConvId, setCloseConvId] = useState<string | null>(null);
  const [blockUserId, setBlockUserId] = useState<string | null>(null);

  // Keep ref in sync
  useEffect(() => {
    selectedConvRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    fetchConversations();
    
    // Subscribe to new messages (once, not on every conversation change)
    const channel = supabase
      .channel('admin-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          const currentConv = selectedConvRef.current;
          if (currentConv && newMsg.conversation_id === currentConv.id) {
            setMessages(prev => (prev.some((msg) => msg.id === newMsg.id) ? prev : [...prev, newMsg]));
          }

          if (newMsg.sender_role === 'customer') {
            if (!currentConv || newMsg.conversation_id !== currentConv.id) {
              toast.info('Nova mensagem de cliente no chat.');
            }
            if (document.hidden || !currentConv || newMsg.conversation_id !== currentConv.id) {
              triggerBrowserNotification('Nova mensagem de cliente', 'Abra o painel de chat para responder.');
            }
          }

          // Refresh conversation list for unread counts
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_conversations' },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchConversations();
      if (selectedConvRef.current?.id) {
        fetchMessages(selectedConvRef.current.id);
      }
    }, 4000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      setLoadError(null);
      const { data: convData, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .in('status', ['open', 'active'])
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Fetch customer names and last messages
      const conversationsWithDetails = await Promise.all(
        (convData || []).map(async (conv) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', conv.customer_id)
            .maybeSingle();

          // Get last message
          const { data: lastMsg } = await supabase
            .from('chat_messages')
            .select('content')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get unread count
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .eq('sender_role', 'customer');

          return {
            ...conv,
            customer_name: profile?.full_name || 'Cliente',
            customer_email: (profile as any)?.email || '',
            last_message: lastMsg?.content || '',
            unread_count: count || 0,
          };
        })
      );

      setConversations(conversationsWithDetails);
      setTotalUnread(conversationsWithDetails.reduce((sum, conv) => sum + (conv.unread_count || 0), 0));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setLoadError('Falha ao carregar conversas. Verifique permissões ou ligação.');
      toast.error('Erro ao carregar chat. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('sender_role', 'customer')
        .eq('is_read', false);

    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation || !user) return;

    setIsSending(true);
    try {
      const { data: insertedMessage, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          sender_role: 'admin',
          content: newMessage.trim(),
        })
        .select('*')
        .single();

      if (error) throw error;

      if (insertedMessage) {
        setMessages(prev => (prev.some((msg) => msg.id === insertedMessage.id) ? prev : [...prev, insertedMessage as Message]));
      }

      setNewMessage('');
      
      // Update conversation timestamp
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation || !user) return;

    if (fileInputRef.current) fileInputRef.current.value = '';

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um ficheiro de imagem');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const optimized = await processImageForUpload(file);
      const ext = optimized.name.split('.').pop() || 'webp';
      const path = `admin/${selectedConversation.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

      let imageUrl: string | null = null;
      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(path, optimized, { cacheControl: '3600', upsert: false });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('chat-images')
          .getPublicUrl(path);
        imageUrl = publicUrl;
      } else {
        if (optimized.size > MAX_INLINE_IMAGE_BYTES) {
          throw new Error('Não foi possível enviar por storage e a imagem é grande para modo compatibilidade (máx. 2MB).');
        }
        imageUrl = await fileToDataUrl(optimized);
        toast.info('Storage indisponível. Imagem enviada em modo compatibilidade.');
      }

      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          sender_role: 'admin',
          content: `${IMAGE_PREFIX}${imageUrl}${IMAGE_SUFFIX}`,
        });

      if (msgError) throw msgError;

      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);

      setUploadDiagnostic(null);
      toast.success('Imagem enviada!');
    } catch (error: unknown) {
      console.error('Error uploading image:', error);
      const details = parseFirebaseUploadError(error);
      setUploadDiagnostic(details);
      toast.error(details.summary);
    } finally {
      setIsUploading(false);
    }
  };

  const copyUploadDiagnostic = async () => {
    if (!uploadDiagnostic) return;
    const report = [
      `Codigo: ${uploadDiagnostic.code}`,
      `Resumo: ${uploadDiagnostic.summary}`,
      `Dica: ${uploadDiagnostic.hint}`,
      `Tecnico: ${uploadDiagnostic.technical}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(report);
      toast.success('Diagnostico copiado para a area de transferencia.');
    } catch {
      toast.error('Nao foi possivel copiar o diagnostico.');
    }
  };

  // ── Moderation actions ──────────────────────────────────

  const confirmDeleteMessage = async () => {
    if (!deleteMessageId) return;
    try {
      const { error } = await supabase.rpc('admin_delete_chat_message', { message_id: deleteMessageId });
      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== deleteMessageId));
      toast.success('Mensagem apagada');
    } catch (error: any) {
      console.error('Error deleting message:', error);
      toast.error('Erro ao apagar mensagem: ' + (error.message || ''));
    } finally {
      setDeleteMessageId(null);
    }
  };

  const confirmClearConversation = async () => {
    if (!clearConvId) return;
    try {
      const { error } = await supabase.rpc('admin_clear_conversation', { conv_id: clearConvId });
      if (error) throw error;
      if (selectedConversation?.id === clearConvId) {
        setMessages([]);
      }
      toast.success('Histórico da conversa apagado');
    } catch (error: any) {
      console.error('Error clearing conversation:', error);
      toast.error('Erro ao apagar histórico: ' + (error.message || ''));
    } finally {
      setClearConvId(null);
    }
  };

  const confirmCloseConversation = async () => {
    if (!closeConvId) return;
    try {
      const { error } = await supabase.rpc('admin_close_conversation', { conv_id: closeConvId, new_status: 'closed' });
      if (error) throw error;
      if (selectedConversation?.id === closeConvId) {
        setSelectedConversation(null);
        setMessages([]);
      }
      await fetchConversations();
      toast.success('Conversa encerrada');
    } catch (error: any) {
      console.error('Error closing conversation:', error);
      toast.error('Erro ao encerrar conversa: ' + (error.message || ''));
    } finally {
      setCloseConvId(null);
    }
  };

  const confirmBlockUser = async () => {
    if (!blockUserId) return;
    try {
      const { error } = await supabase.rpc('admin_block_user', { target_user_id: blockUserId, block: true });
      if (error) throw error;
      toast.success('Utilizador bloqueado');
    } catch (error: any) {
      console.error('Error blocking user:', error);
      toast.error('Erro ao bloquear utilizador: ' + (error.message || ''));
    } finally {
      setBlockUserId(null);
    }
  };

  const renderMessageContent = (msg: Message) => {
    if (isImageMessage(msg.content)) {
      const url = extractImageUrl(msg.content);
      return (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt="Imagem enviada"
            className="max-w-full max-h-48 rounded-md object-cover cursor-pointer hover:opacity-90 transition-opacity"
            loading="lazy"
          />
        </a>
      );
    }
    return <p className="text-sm whitespace-pre-line">{msg.content}</p>;
  };

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
        <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
          Chat com Clientes
          {totalUnread > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalUnread > 99 ? '99+' : totalUnread}
            </Badge>
          )}
        </h1>
        <p className="text-muted-foreground">Responda e modere as conversas dos clientes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations list */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {loadError ? (
                    <div className="space-y-2">
                      <p className="text-destructive text-sm">{loadError}</p>
                      <Button size="sm" variant="outline" onClick={fetchConversations}>Tentar novamente</Button>
                    </div>
                  ) : (
                    'Nenhuma conversa ainda'
                  )}
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`w-full p-4 text-left border-b hover:bg-muted/50 transition-colors flex items-start gap-2 ${
                      selectedConversation?.id === conv.id ? 'bg-muted' : ''
                    }`}
                  >
                    <button
                      onClick={() => handleSelectConversation(conv)}
                      className="flex items-start gap-3 flex-1 min-w-0 text-left"
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {conv.customer_name?.charAt(0) || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{conv.customer_name}</span>
                          {conv.unread_count && conv.unread_count > 0 && (
                            <Badge variant="default" className="ml-2 shrink-0">
                              {conv.unread_count}
                            </Badge>
                          )}
                        </div>
                        {conv.customer_email && (
                          <p className="text-xs text-muted-foreground truncate">{conv.customer_email}</p>
                        )}
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.last_message
                            ? isImageMessage(conv.last_message) ? '📷 Imagem' : conv.last_message
                            : 'Sem mensagens'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(conv.updated_at), "d 'de' MMM, HH:mm", { locale: pt })}
                        </p>
                      </div>
                    </button>
                    {/* Conversation context menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setClearConvId(conv.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Apagar histórico
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setCloseConvId(conv.id)}>
                          <XCircle className="h-4 w-4 mr-2" /> Encerrar conversa
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setBlockUserId(conv.customer_id)}
                        >
                          <Ban className="h-4 w-4 mr-2" /> Bloquear utilizador
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat area */}
        <Card className="lg:col-span-2 flex flex-col">
          {selectedConversation ? (
            <>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {selectedConversation.customer_name?.charAt(0) || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{selectedConversation.customer_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedConversation.customer_email ||
                          `Conversa iniciada em ${format(new Date(selectedConversation.created_at), "d 'de' MMMM", { locale: pt })}`
                        }
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setClearConvId(selectedConversation.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Apagar histórico
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setCloseConvId(selectedConversation.id)}>
                        <XCircle className="h-4 w-4 mr-2" /> Encerrar conversa
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setBlockUserId(selectedConversation.customer_id)}
                      >
                        <Ban className="h-4 w-4 mr-2" /> Bloquear utilizador
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 flex flex-col">
                {uploadDiagnostic ? (
                  <div className="mx-4 mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-amber-900">Modo diagnostico de upload</p>
                        <p className="text-xs text-amber-800">{uploadDiagnostic.summary}</p>
                      </div>
                      <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={copyUploadDiagnostic}>
                        Copiar erro
                      </Button>
                    </div>
                    <p className="text-xs text-amber-900"><strong>Codigo:</strong> {uploadDiagnostic.code}</p>
                    <p className="text-xs text-amber-900"><strong>Dica:</strong> {uploadDiagnostic.hint}</p>
                    <p className="text-xs text-amber-900 break-all"><strong>Tecnico:</strong> {uploadDiagnostic.technical}</p>
                  </div>
                ) : null}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`group flex ${
                          msg.sender_role === 'system'
                            ? 'justify-center'
                            : msg.sender_role === 'admin'
                            ? 'justify-end'
                            : 'justify-start'
                        }`}
                      >
                        {msg.sender_role === 'system' ? (
                          <div className="max-w-[85%] rounded-lg px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center relative">
                            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">🔔 Notificação</p>
                            <p className="text-sm whitespace-pre-line text-amber-800 dark:text-amber-200">{msg.content}</p>
                            <p className="text-xs mt-1 text-amber-500 dark:text-amber-400">
                              {format(new Date(msg.created_at), 'HH:mm')}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive/10 hover:bg-destructive/20 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setDeleteMessageId(msg.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <div className="relative max-w-[70%]">
                            <div
                              className={`rounded-lg px-4 py-2 ${
                                msg.sender_role === 'admin'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${
                                msg.sender_role === 'admin' ? 'text-primary-foreground/80' : 'text-muted-foreground'
                              }`}>
                                {msg.sender_role === 'admin' ? 'Admin' : 'Cliente'}
                              </p>
                              {renderMessageContent(msg)}
                              <p className={`text-xs mt-1 ${
                                msg.sender_role === 'admin' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}>
                                {format(new Date(msg.created_at), 'HH:mm')}
                              </p>
                            </div>
                            {/* Delete message button (visible on hover) */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`absolute -top-2 h-6 w-6 rounded-full bg-destructive/10 hover:bg-destructive/20 opacity-0 group-hover:opacity-100 transition-opacity ${
                                msg.sender_role === 'admin' ? '-left-2' : '-right-2'
                              }`}
                              onClick={() => setDeleteMessageId(msg.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    disabled={isSending || isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    title="Enviar imagem"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                  </Button>
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escreva uma mensagem..."
                    disabled={isSending || isUploading}
                  />
                  <Button type="submit" disabled={isSending || isUploading || !newMessage.trim()}>
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione uma conversa para começar</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Confirmation Dialogs ────────────────────────── */}

      {/* Delete single message */}
      <AlertDialog open={!!deleteMessageId} onOpenChange={() => setDeleteMessageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Apagar mensagem
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja apagar esta mensagem? Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMessage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear conversation history */}
      <AlertDialog open={!!clearConvId} onOpenChange={() => setClearConvId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Apagar histórico da conversa
            </AlertDialogTitle>
            <AlertDialogDescription>
              Todas as mensagens desta conversa serão permanentemente apagadas. Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearConversation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Apagar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close conversation */}
      <AlertDialog open={!!closeConvId} onOpenChange={() => setCloseConvId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-amber-500" />
              Encerrar conversa
            </AlertDialogTitle>
            <AlertDialogDescription>
              A conversa será encerrada e deixará de aparecer na lista activa. O cliente poderá iniciar uma nova conversa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCloseConversation}>
              Encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block user */}
      <AlertDialog open={!!blockUserId} onOpenChange={() => setBlockUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Bloquear utilizador
            </AlertDialogTitle>
            <AlertDialogDescription>
              O utilizador será bloqueado e não poderá aceder ao site. Pode desbloquear mais tarde na página de Utilizadores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBlockUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Bloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
