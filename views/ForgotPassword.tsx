
import React, { useState } from 'react';
import { ViewState, User } from '../types';
import { KeyRound, Check, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface ForgotPasswordProps {
  changeView: (view: ViewState) => void;
  users: User[];
  onResetPassword: (email: string, newPass: string) => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ changeView, users, onResetPassword }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const userExists = users.find(u => u.email === email);
    if (!userExists) { setError('E-mail não encontrado no sistema.'); return; }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    alert(`[PREVENCAR] Código de recuperação: ${code}`);
    setStep(2);
  };

  const handleVerifyCode = (e: React.FormEvent) => {
      e.preventDefault();
      if (inputCode === generatedCode) setStep(3);
      else setError('Código inválido.');
  };

  const handleResetPassword = (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword.length < 6) { setError('Mínimo 6 caracteres.'); return; }
      if (newPassword !== confirmPassword) { setError('Senhas não conferem.'); return; }
      onResetPassword(email, newPassword);
      setStep(4);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4 relative overflow-hidden">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-10 border-t-8 border-brand-mauve animate-fade-in relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-brand-mauve p-4 rounded-2xl mb-4 shadow-lg shadow-pink-100">
             <KeyRound className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Nova Senha</h2>
        </div>

        {step === 1 && (
          <form onSubmit={handleSendEmail} className="space-y-6">
            <p className="text-gray-500 text-center text-sm">Informe seu e-mail para validar sua identidade.</p>
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold flex items-center gap-2"><AlertTriangle size={16}/> {error}</div>}
            <Input label="E-mail Corporativo" type="email" placeholder="nome@prevencar.com.br" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <div className="space-y-2">
              <Button type="submit" className="w-full h-14 font-black">Enviar Código</Button>
              <Button type="button" variant="outline" className="w-full h-14" onClick={() => changeView(ViewState.LOGIN)}>Voltar</Button>
            </div>
          </form>
        )}

        {step === 2 && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
                <p className="text-gray-500 text-center text-sm">Código enviado para: <br/><span className="font-bold text-brand-blue">{email}</span></p>
                {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold flex items-center gap-2"><AlertTriangle size={16}/> {error}</div>}
                <Input label="Código de 6 dígitos" type="text" placeholder="000000" value={inputCode} onChange={(e) => setInputCode(e.target.value)} required maxLength={6} className="text-center text-2xl font-black tracking-widest" />
                <Button type="submit" className="w-full h-14 font-black">Verificar</Button>
            </form>
        )}

        {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-6">
                {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold flex items-center gap-2"><AlertTriangle size={16}/> {error}</div>}
                <Input label="Nova Senha" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                <Input label="Confirmar Senha" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                <Button type="submit" className="w-full h-14 font-black bg-green-600 hover:bg-green-700">Redefinir Agora</Button>
            </form>
        )}

        {step === 4 && (
          <div className="text-center space-y-8">
            <div className="bg-green-50 p-8 rounded-3xl border border-green-100 flex flex-col items-center">
                <Shield size={64} className="text-green-600 mb-4 animate-bounce"/>
              <p className="font-black text-xl text-green-800">Sucesso!</p>
              <p className="text-sm text-green-600 mt-2">Sua senha foi redefinida com segurança.</p>
            </div>
            <Button className="w-full h-14 font-black" onClick={() => changeView(ViewState.LOGIN)}>Fazer Login</Button>
          </div>
        )}
      </div>
    </div>
  );
};
