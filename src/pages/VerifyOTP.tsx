import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Mail, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const VerifyOTP = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const redirect = searchParams.get('redirect') || '/';
  const navigate = useNavigate();
  const { user } = useAuth();
  const authRedirectTo = import.meta.env.VITE_SITE_URL || window.location.origin;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // If user is already logged in and verified, redirect
  useEffect(() => {
    if (user?.email_confirmed_at) {
      navigate(redirect, { replace: true });
    }
  }, [user, redirect, navigate]);

  // Cooldown timer for resend button
  useEffect(() => {
    // Start with 60s cooldown on mount (email was just sent)
    setCooldown(60);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Auto-focus first OTP input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are filled
    if (digit && index === 5) {
      const fullCode = newOtp.join('');
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pastedData[i] || '';
      }
      setOtp(newOtp);
      // Focus the next empty input or the last one
      const focusIndex = Math.min(pastedData.length, 5);
      inputRefs.current[focusIndex]?.focus();

      // Auto-submit if all 6 digits pasted
      if (pastedData.length === 6) {
        handleVerify(pastedData);
      }
    }
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code || otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Por favor, insira o código completo de 6 dígitos.');
      return;
    }

    if (!email) {
      toast.error('Email não encontrado. Por favor, tente registar-se novamente.');
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'signup',
      });

      if (error) {
        if (error.message?.includes('expired')) {
          toast.error('O código expirou. Por favor, peça um novo código.');
        } else if (error.message?.includes('invalid') || error.message?.includes('Invalid')) {
          toast.error('Código de verificação inválido. Verifique e tente novamente.');
        } else {
          toast.error('Erro na verificação: ' + error.message);
        }
        // Clear OTP inputs on error
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }

      if (data?.session) {
        setIsVerified(true);
        toast.success('Conta verificada com sucesso! Bem-vindo(a)!');
        // Brief delay to show success state
        setTimeout(() => {
          navigate(redirect, { replace: true });
        }, 1500);
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      toast.error('Erro inesperado na verificação. Tente novamente.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!email || cooldown > 0) return;

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: authRedirectTo,
        },
      });

      if (error) {
        if (error.message?.includes('rate') || error.message?.includes('limit')) {
          toast.error('Muitos pedidos. Aguarde alguns minutos antes de tentar novamente.');
        } else {
          toast.error('Erro ao reenviar código: ' + error.message);
        }
      } else {
        toast.success('Novo código enviado para o seu email!');
        setCooldown(60);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      console.error('Resend OTP error:', err);
      toast.error('Erro ao reenviar código.');
    } finally {
      setIsResending(false);
    }
  };

  // Success state
  if (isVerified) {
    return (
      <Layout>
        <div className="container py-16 flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-12 pb-8">
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-green-100 p-4">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-green-700 mb-2">
                Conta verificada com sucesso!
              </h2>
              <p className="text-muted-foreground mb-6">
                A sua conta foi ativada. Está a ser redirecionado...
              </p>
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

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
              Enviámos um código de verificação de 6 dígitos para{' '}
              <span className="font-semibold text-foreground">{email || 'o seu email'}</span>.
              <br />
              Verifique a sua caixa de entrada (e spam).
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* OTP Input Grid */}
            <div className="flex justify-center gap-2 sm:gap-3">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="h-14 w-12 text-center text-xl font-bold border-2 focus:border-primary focus:ring-primary"
                  disabled={isVerifying}
                  aria-label={`Dígito ${index + 1} do código de verificação`}
                />
              ))}
            </div>

            {/* Verify Button */}
            <Button
              onClick={() => handleVerify()}
              className="w-full h-12"
              disabled={isVerifying || otp.join('').length < 6}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A verificar...
                </>
              ) : (
                'Verificar conta'
              )}
            </Button>

            {/* Resend Section */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Não recebeu o código?
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResendCode}
                disabled={isResending || cooldown > 0}
                className="gap-2"
              >
                {isResending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {cooldown > 0
                  ? `Reenviar código (${cooldown}s)`
                  : 'Reenviar código'}
              </Button>
            </div>

            {/* Help text */}
            <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground space-y-1">
              <p>• O código expira em <strong>60 minutos</strong>.</p>
              <p>• Verifique a pasta de <strong>spam</strong> ou <strong>lixo</strong>.</p>
              <p>• Se o problema persistir, tente registar-se novamente.</p>
            </div>

            {/* Back to Login */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => navigate('/login')}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default VerifyOTP;
