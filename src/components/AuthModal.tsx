import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { API_URLS, setAuthToken } from '@/config/api';
import { useToast } from '@/hooks/use-toast';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal = ({ open, onClose, onSuccess }: AuthModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  
  const [registerData, setRegisterData] = useState({
    email: '',
    code: '',
    username: '',
    display_name: '',
    password: ''
  });
  
  const [codeStep, setCodeStep] = useState(false);
  const [debugCode, setDebugCode] = useState('');

  const handleLogin = async () => {
    if (!loginData.username || !loginData.password) {
      toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URLS.AUTH}?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка входа');
      }

      setAuthToken(data.token);
      toast({ title: 'Успешно', description: 'Вы вошли в систему' });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!registerData.email) {
      toast({ title: 'Ошибка', description: 'Введите email', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URLS.AUTH}?action=send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registerData.email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка отправки кода');
      }

      setCodeStep(true);
      if (data.code) {
        setDebugCode(data.code);
        toast({ 
          title: 'Код отправлен', 
          description: `Код для теста: ${data.code}. В продакшене придёт на email.`
        });
      } else {
        toast({ title: 'Код отправлен', description: 'Проверьте почту' });
      }
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerData.code || !registerData.username || !registerData.display_name || !registerData.password) {
      toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    if (registerData.password.length < 6) {
      toast({ title: 'Ошибка', description: 'Пароль минимум 6 символов', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URLS.AUTH}?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка регистрации');
      }

      setAuthToken(data.token);
      toast({ title: 'Успешно', description: 'Вы зарегистрированы!' });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Talk Chat</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Вход</TabsTrigger>
            <TabsTrigger value="register">Регистрация</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="login-username">Username</Label>
              <Input
                id="login-username"
                placeholder="@username"
                value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="login-password">Пароль</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="mt-1"
              />
            </div>
            <Button
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? 'Загрузка...' : 'Войти'}
            </Button>
          </TabsContent>

          <TabsContent value="register" className="space-y-4 mt-4">
            {!codeStep ? (
              <>
                <div>
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="example@mail.com"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <Button
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                  onClick={handleSendCode}
                  disabled={loading}
                >
                  {loading ? 'Отправка...' : 'Отправить код'}
                </Button>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="register-code">Код из письма {debugCode && `(${debugCode})`}</Label>
                  <Input
                    id="register-code"
                    placeholder="123456"
                    value={registerData.code}
                    onChange={(e) => setRegisterData({ ...registerData, code: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="register-username">Username (без @)</Label>
                  <Input
                    id="register-username"
                    placeholder="username"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value.toLowerCase() })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="register-name">Имя</Label>
                  <Input
                    id="register-name"
                    placeholder="Ваше имя"
                    value={registerData.display_name}
                    onChange={(e) => setRegisterData({ ...registerData, display_name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="register-password">Пароль</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <Button
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                  onClick={handleRegister}
                  disabled={loading}
                >
                  {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setCodeStep(false)}
                >
                  Назад
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
