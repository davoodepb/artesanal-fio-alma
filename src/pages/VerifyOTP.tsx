import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Mail, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const VerifyOTP = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const redirect = searchParams.get('redirect') || '/';
  const navigate = useNavigate();
  const { user, isEmailVerified } = useAuth();

  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  // If user is already logged in and verified, redirect
  useEffect(() => {
    if (user && isEmailVerified) {
      navigate(redirect, { replace: true });
    }
  }, [user, isEmailVerified, redirect, navigate]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResendEmail = async () => {
    if (cooldown > 0) return;

    setIsResending(true);
    try {
      // Try to sign in temporarily to resend verification
      // (Firebase requires an authenticated user to resend verification)
      toast.info('Para reenviar o email de verificação, faça login primeiro na página de login.');
      navigate('/login');
    } catch (err) {
      console.error('Resend email error:', err);
      toast.error('Erro ao reenviar email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Layout>
      <div className="container py-16 flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Mail className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Verifique o seu email</CardTitle>
            <CardDescription className="text-base mt-2">
              Enviámos um <strong>link de verificação</strong> para{' '}
              <span className="font-semibold text-foreground">{email || 'o seu email'}</span>.
              <br />
              Clique no link no email para ativar a sua conta.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Instructions */}
            <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Como ativar a sua conta:</p>
              <p>1. Abra o email que enviámos</p>
              <p>2. Clique no <strong>link de verificação</strong></p>
              <p>3. Volte aqui e faça <strong>login</strong></p>
            </div>

            {/* Help text */}
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 text-sm space-y-1">
              <p className="font-medium text-amber-800 dark:text-amber-200">Não recebeu o email?</p>
              <p className="text-amber-700 dark:text-amber-300">• Verifique a pasta de <strong>spam</strong> ou <strong>lixo</strong></p>
              <p className="text-amber-700 dark:text-amber-300">• O email pode demorar alguns minutos</p>
              <p className="text-amber-700 dark:text-amber-300">• Se o problema persistir, tente criar conta novamente</p>
            </div>

            {/* Go to Login */}
            <Button
              className="w-full h-12"
              onClick={() => navigate(`/login?redirect=${encodeURIComponent(redirect)}`)}
            >
              Ir para o Login
            </Button>

            {/* Back button */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar à loja
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default VerifyOTP;
