import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { firebaseAuth } from '@/integrations/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { signIn, signOut, isAdmin, user, isLoading } = useAuth();
  const ADMIN_UID = import.meta.env.VITE_FIREBASE_ADMIN_UID || '5efzvBMxHXOBkQMU8VcVLXBX8QS2';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  // If arriving with an active Firebase session but no sessionStorage flag,
  // sign out first so the admin MUST re-enter email & password every time
  useEffect(() => {
    if (isLoading) return;

    if (user && sessionStorage.getItem('admin_authenticated')) {
      // Already authenticated via this form in the same browser session → go to admin
      navigate('/admin');
    } else if (user) {
      // Has Supabase session but no sessionStorage flag → force sign out
      signOut().finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, [isLoading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(email, password);

    if (error) {
      setIsSubmitting(false);
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('network-request-failed')) {
        toast.error('Falha de rede com Firebase. Abra no Chrome/Edge externo e confirme internet, VPN/AdBlock e Firebase Auth ativo.');
      } else
      if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) {
        toast.error('Credenciais invalidas');
      } else if (msg.includes('too-many-requests')) {
        toast.error('Muitas tentativas. Aguarde e tente novamente.');
      } else {
        toast.error('Falha no login: ' + error.message);
      }
      return;
    }

    try {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        throw new Error('Sessão não iniciada corretamente.');
      }

      const tokenResult = await currentUser.getIdTokenResult(true);
      const hasAdminAccess = tokenResult.claims.admin === true || currentUser.uid === ADMIN_UID;

      if (!hasAdminAccess) {
        await signOut();
        toast.error('Esta conta não tem permissões de administrador');
        setIsSubmitting(false);
        return;
      }

      sessionStorage.setItem('admin_authenticated', 'true');
      toast.success('Bem-vindo(a), Admin!');
      navigate('/admin');
    } catch (authCheckError: any) {
      toast.error('Falha ao validar permissões de admin: ' + (authCheckError?.message || 'erro desconhecido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loader while clearing old session
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-serif text-2xl">Painel Admin</CardTitle>
          <CardDescription>
            Acesso restrito a administradores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Palavra-passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A verificar...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-muted-foreground"
            >
              Voltar à loja
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
