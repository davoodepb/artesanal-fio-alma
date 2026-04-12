import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';

const Login = () => {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, user, isEmailVerified } = useAuth();

  // If already logged in and verified, redirect
  useEffect(() => {
    if (user && isEmailVerified) {
      navigate(redirect, { replace: true });
    }
  }, [user, isEmailVerified, redirect, navigate]);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Signup state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupConsent, setSignupConsent] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Google login state
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error('Erro ao entrar com Google: ' + error.message);
      }
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('Erro ao entrar com Google');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginEmail || !loginPassword) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    setIsLoggingIn(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoggingIn(false);

    if (error) {
      if (error.message?.includes('Email not confirmed')) {
        toast.error('Email não verificado. Verifique o seu email para ativar a conta.');
        navigate(`/verify-otp?email=${encodeURIComponent(loginEmail)}&redirect=${encodeURIComponent(redirect)}`);
        return;
      }
      toast.error('Credenciais inválidas. Verifique o email e a palavra-passe.');
    } else {
      toast.success('Login efetuado com sucesso!');
      navigate(redirect);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupName || !signupEmail || !signupPassword) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    if (!signupConsent) {
      toast.error('Aceite os termos e política de privacidade para criar conta');
      return;
    }

    if (signupPassword.length < 6) {
      toast.error('A palavra-passe deve ter pelo menos 6 caracteres');
      return;
    }

    setIsSigningUp(true);
    const { error, needsVerification } = await signUp(signupEmail, signupPassword, signupName);
    setIsSigningUp(false);

    if (error) {
      if (error.message?.includes('already registered') || error.message?.includes('already been registered')) {
        toast.error('Este email já está registado. Tente fazer login.');
      } else {
        toast.error('Erro ao criar conta: ' + error.message);
      }
    } else if (needsVerification) {
      toast.success('Conta criada! Verifique o seu email para ativar a conta.', {
        duration: 5000,
        icon: '📧',
      });
      navigate(`/verify-otp?email=${encodeURIComponent(signupEmail)}&redirect=${encodeURIComponent(redirect)}`);
    } else {
      toast.success('Conta criada com sucesso!');
      navigate(redirect);
    }
  };

  return (
    <Layout>
      <div className="container py-16 flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="font-script text-3xl text-primary">Bem-vindo(a)</CardTitle>
            <CardDescription>
              Entre na sua conta ou crie uma nova
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Google Login Button */}
            <Button
              variant="outline"
              className="w-full mb-6 h-12 gap-3"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Continuar com Google
            </Button>

            <div className="relative mb-6">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-4 text-sm text-muted-foreground">
                ou
              </span>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Palavra-passe</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                      >
                        {showLoginPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isLoggingIn}>
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        A entrar...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="O seu nome"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Palavra-passe</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                      >
                        {showSignupPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Password Strength Indicator */}
                  {signupPassword.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((level) => {
                          const strength = 
                            (signupPassword.length >= 6 ? 1 : 0) +
                            (/[A-Z]/.test(signupPassword) ? 1 : 0) +
                            (/[0-9]/.test(signupPassword) ? 1 : 0) +
                            (/[^A-Za-z0-9]/.test(signupPassword) ? 1 : 0);
                          const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
                          return (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                level <= strength ? colors[strength - 1] : 'bg-muted'
                              }`}
                            />
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const s =
                            (signupPassword.length >= 6 ? 1 : 0) +
                            (/[A-Z]/.test(signupPassword) ? 1 : 0) +
                            (/[0-9]/.test(signupPassword) ? 1 : 0) +
                            (/[^A-Za-z0-9]/.test(signupPassword) ? 1 : 0);
                          const labels = ['Fraca', 'Razoável', 'Boa', 'Forte'];
                          return s > 0 ? `Força: ${labels[s - 1]}` : 'Muito curta';
                        })()}
                      </p>
                    </div>
                  )}
                  
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={signupConsent}
                      onChange={(e) => setSignupConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[hsl(var(--primary))]"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      Li e aceito os{' '}
                      <a href="/terms" target="_blank" className="text-primary hover:underline">Termos e Condições</a>{' '}e a{' '}
                      <a href="/privacy" target="_blank" className="text-primary hover:underline">Política de Privacidade</a>.
                    </span>
                  </label>
                  
                  <Button type="submit" className="w-full" disabled={isSigningUp || !signupConsent}>
                    {isSigningUp ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        A criar conta...
                      </>
                    ) : (
                      'Criar Conta'
                    )}
                  </Button>

                  <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                    <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Após criar conta, receberá um <strong>código de verificação</strong> no seu email para ativar a conta.
                    </p>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Login;
