
import React, { useMemo } from 'react';
import { ViewState, User, Inspection } from '../types';
import { 
  FilePlus, FileSearch, Users, Settings, TrendingUp, 
  AlertCircle, Database, CheckCircle2, Wallet, BarChart3 
} from 'lucide-react';

interface HomeProps {
  changeView: (view: ViewState) => void;
  startNewInspection: () => void;
  currentUser?: User;
  inspections: Inspection[];
}

export const Home: React.FC<HomeProps> = ({ changeView, startNewInspection, currentUser, inspections }) => {
  const isVistoriador = currentUser?.role === 'vistoriador';
  const isAdmin = currentUser?.role === 'admin';
  const isFinanceiro = currentUser?.role === 'financeiro';

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysInspections = inspections.filter(i => i.date === today);
    const pendingInspections = inspections.filter(i => i.status_pagamento === 'A pagar');
    
    const completedCount = inspections.filter(i => i.status === 'Concluída').length;
    const cashierCount = inspections.filter(i => i.status === 'No Caixa').length;
    
    const totalDatabase = inspections.length;
    const totalToday = todaysInspections.length;
    const revenueToday = todaysInspections.reduce((acc, curr) => acc + (curr.totalValue || 0), 0);
    const globalRevenue = inspections.reduce((acc, curr) => acc + (curr.totalValue || 0), 0);
    const totalPendingValue = pendingInspections.reduce((acc, curr) => acc + (curr.totalValue || 0), 0);

    return { 
      totalToday, 
      totalPending: pendingInspections.length, 
      revenueToday, 
      totalDatabase,
      completedCount,
      cashierCount,
      globalRevenue,
      totalPendingValue
    };
  }, [inspections]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                Olá, <span className="text-brand-blue">{currentUser?.name.split(' ')[0]}</span>
            </h1>
            <p className="text-gray-500 mt-1 font-medium">Painel de controle de vistorias eletrônicas.</p>
        </div>
        <div className="mt-4 md:mt-0 text-right hidden md:block">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Data de Operação</p>
            <p className="text-lg font-bold text-gray-700 capitalize">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Concluídas</p>
            <p className="text-2xl font-black text-gray-800">{stats.completedCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
            <Wallet size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No Caixa</p>
            <p className="text-2xl font-black text-gray-800">{stats.cashierCount}</p>
          </div>
        </div>

        {/* Dashboard Financeiro Oculto para Vistoriador */}
        {!isVistoriador && (
          <>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5">
              <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                <AlertCircle size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">A Receber</p>
                <p className="text-xl font-black text-brand-red">{formatCurrency(stats.totalPendingValue)}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-brand-blue">
                <BarChart3 size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Faturamento Global</p>
                <p className="text-xl font-black text-brand-blue">{formatCurrency(stats.globalRevenue)}</p>
              </div>
            </div>
          </>
        )}
        
        {isVistoriador && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5 lg:col-span-2">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-brand-blue">
              <Database size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Minhas Vistorias (Total)</p>
              <p className="text-2xl font-black text-gray-800">{stats.totalDatabase}</p>
            </div>
          </div>
        )}
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 ${isVistoriador ? '' : 'lg:grid-cols-4'} gap-6`}>
        <div onClick={startNewInspection} className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all cursor-pointer border border-gray-100 hover:border-brand-red">
          <div className="w-12 h-12 bg-brand-red rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-red-200">
            <FilePlus size={24} />
          </div>
          <h3 className="text-lg font-bold text-gray-800">Nova Ficha</h3>
          <p className="text-sm text-gray-500 mt-1">Iniciar nova vistoria</p>
        </div>
        <div onClick={() => changeView(ViewState.INSPECTION_LIST)} className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all cursor-pointer border border-gray-100 hover:border-brand-blue">
          <div className="w-12 h-12 bg-brand-blue rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-200">
            <FileSearch size={24} />
          </div>
          <h3 className="text-lg font-bold text-gray-800">Consultar</h3>
          <p className="text-sm text-gray-500 mt-1">Histórico de fichas</p>
        </div>
        {!isVistoriador && (
            <>
                <div onClick={() => changeView(ViewState.MANAGEMENT)} className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all cursor-pointer border border-gray-100 hover:border-brand-mauve">
                    <div className="w-12 h-12 bg-brand-mauve rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-pink-200">
                    <Users size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Parceiros</h3>
                    <p className="text-sm text-gray-500 mt-1">Gerenciar origens</p>
                </div>
                <div onClick={() => changeView(ViewState.MANAGEMENT)} className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all cursor-pointer border border-gray-100 hover:border-brand-yellow">
                    <div className="w-12 h-12 bg-brand-yellow rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-yellow-200">
                    <Settings size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Serviços</h3>
                    <p className="text-sm text-gray-500 mt-1">Tabela de Preços</p>
                </div>
            </>
        )}
      </div>

      {!isVistoriador && (
        <div className="bg-gradient-to-br from-brand-blue to-[#2a3d66] text-white p-8 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-center">
            <div>
                <p className="text-blue-200 text-xs font-black uppercase tracking-widest mb-1">Movimentação Hoje</p>
                <p className="text-4xl font-black">{formatCurrency(stats.revenueToday)}</p>
            </div>
            <button 
                onClick={() => changeView(ViewState.INSPECTION_LIST)}
                className="mt-6 md:mt-0 bg-white text-brand-blue px-8 py-3 rounded-xl font-bold hover:bg-brand-yellow hover:text-white transition-all shadow-lg uppercase text-xs tracking-widest"
            >
                Relatórios Detalhados
            </button>
        </div>
      )}
    </div>
  );
};
