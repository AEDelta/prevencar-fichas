
import React, { useState, useMemo } from 'react';
import { Inspection, ViewState, User, PaymentMethod, Indication, ServiceItem, MonthlyClosure } from '../types';
import { Button } from '../components/ui/Button';
import { 
  Edit2, Trash2, Search, Plus, Filter, RotateCcw, 
  Calendar, Landmark, CreditCard, DollarSign, ListFilter,
  CheckSquare, Square, CircleDollarSign, CheckCircle2, Eye,
  Wallet, Clock, BarChart3, Download, FileSpreadsheet, FileType,
  User as UserIcon, Building2, FileCheck, FileWarning, Sigma, X, ChevronDown
} from 'lucide-react';

interface InspectionListProps {
  inspections: Inspection[];
  onEdit: (inspection: Inspection, step?: number) => void;
  onView: (inspection: Inspection) => void;
  onDelete: (id: string) => void;
  onBulkUpdate: (data: { ids: string[], updates: Partial<Inspection> }) => void;
  changeView: (view: ViewState) => void;
  onCreate: () => void;
  currentUser?: User;
  indications: Indication[];
  services: ServiceItem[];
  closures: MonthlyClosure[];
}

export const InspectionList: React.FC<InspectionListProps> = ({ 
    inspections, onEdit, onView, onDelete, onCreate, currentUser,
    indications, onBulkUpdate
}) => {
  // Estados dos Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [indicationFilter, setIndicationFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Estado de Seleção
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isVistoriador = currentUser?.role === 'vistoriador';
  const isFinanceiro = currentUser?.role === 'financeiro' || currentUser?.role === 'admin';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setIndicationFilter('');
    setPaymentMethodFilter('');
    setStartDate('');
    setEndDate('');
    setMinPrice('');
    setMaxPrice('');
    setSelectedIds([]);
  };

  const filtered = useMemo(() => {
    return inspections.filter(i => {
        const term = searchTerm.toLowerCase().trim();
        const matchesSearch = !term || 
                             i.licensePlate.toLowerCase().includes(term) || 
                             i.client.name.toLowerCase().includes(term) ||
                             (i.indicationName || '').toLowerCase().includes(term);
        
        const matchesStart = !startDate || i.date >= startDate;
        const matchesEnd = !endDate || i.date <= endDate;
        const matchesStatus = !statusFilter || i.status === statusFilter;
        const matchesIndication = !indicationFilter || 
                                 (indicationFilter === 'particular' ? !i.indicationId : i.indicationId === indicationFilter);
        const matchesPayment = !paymentMethodFilter || i.paymentMethod === paymentMethodFilter;
        
        const price = Number(i.totalValue) || 0;
        const minVal = minPrice ? parseFloat(minPrice) : null;
        const maxVal = maxPrice ? parseFloat(maxPrice) : null;
        const matchesMinPrice = minVal === null || price >= minVal;
        const matchesMaxPrice = maxVal === null || price <= maxVal;
        
        return matchesSearch && matchesStart && matchesEnd && matchesStatus && 
               matchesIndication && matchesPayment && matchesMinPrice && matchesMaxPrice;
    });
  }, [inspections, searchTerm, startDate, endDate, statusFilter, indicationFilter, paymentMethodFilter, minPrice, maxPrice]);

  const stats = useMemo(() => {
    const completed = filtered.filter(i => i.status === 'Concluída');
    const inCashier = filtered.filter(i => i.status === 'No Caixa');
    const unpaid = filtered.filter(i => i.status_pagamento === 'A pagar');

    return {
      totalValue: filtered.reduce((acc, curr) => acc + (curr.totalValue || 0), 0),
      pendingValue: unpaid.reduce((acc, curr) => acc + (curr.totalValue || 0), 0),
      count: filtered.length,
      completedCount: completed.length,
      cashierCount: inCashier.length,
      unpaidCount: unpaid.length
    };
  }, [filtered]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleExportExcel = () => {
    const data = filtered.map(i => ({
      'ID Ficha': i.id,
      'Data Vistoria': new Date(i.date).toLocaleDateString('pt-BR'),
      'Mês Referência': i.mes_referencia,
      'Placa': i.licensePlate,
      'Modelo Veículo': i.vehicleModel,
      'Inspetor': i.inspector || 'Não informado',
      'Nome Cliente': i.client.name,
      'CPF/CNPJ Cliente': i.client.cpf,
      'Telefone Cliente': i.client.phone,
      'CEP': i.client.cep,
      'Endereço': i.client.address,
      'Número': i.client.number,
      'Bairro': i.client.neighborhood || '',
      'Complemento': i.client.complement || '',
      'Parceiro/Origem': i.indicationName || 'Venda Direta (Particular)',
      'Serviços Realizados': (i.selectedServices || []).join(', '),
      'Serviço Extra Descrição': i.otherServiceDescription || '',
      'Serviço Extra Valor': i.otherServicePrice || 0,
      'Status Sistema': i.status,
      'Status Ficha': i.status_ficha,
      'Forma de Pagamento': i.paymentMethod || 'A Definir',
      'Situação Financeira': i.status_pagamento,
      'Data Pagamento': i.data_pagamento ? new Date(i.data_pagamento).toLocaleDateString('pt-BR') : '-',
      'NF-e': i.nfe || 'Não emitida',
      'Valor Total (R$)': Number(i.totalValue) || 0,
      'Observações': i.observations || ''
    }));

    const ws = (window as any).XLSX.utils.json_to_sheet(data);
    
    // Ajuste automático de largura das colunas (aproximado)
    const wscols = [
      {wch: 12}, {wch: 12}, {wch: 15}, {wch: 10}, {wch: 20}, {wch: 20},
      {wch: 30}, {wch: 18}, {wch: 15}, {wch: 10}, {wch: 30}, {wch: 8},
      {wch: 20}, {wch: 20}, {wch: 25}, {wch: 40}, {wch: 30}, {wch: 15},
      {wch: 15}, {wch: 15}, {wch: 20}, {wch: 18}, {wch: 15}, {wch: 12}, 
      {wch: 15}, {wch: 50}
    ];
    ws['!cols'] = wscols;

    const wb = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "Banco de Dados Prevencar");
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    (window as any).XLSX.writeFile(wb, `Prevencar_Auditoria_Completa_${timestamp}.xlsx`);
    setIsExporting(false);
  };

  const handleExportPDF = () => {
    const doc = new (window as any).jspdf.jsPDF('l', 'mm', 'a4'); // Paisagem para caber mais dados
    doc.setFontSize(18);
    doc.setTextColor(53, 77, 129);
    doc.text("PREVENCAR VISTORIAS - RELATÓRIO OPERACIONAL", 14, 20);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Emissão: ${new Date().toLocaleString('pt-BR')}`, 14, 28);
    doc.text(`Filtros: ${startDate || 'Início'} até ${endDate || 'Hoje'} | Registros: ${filtered.length}`, 14, 33);

    const tableData = filtered.map(i => [
      new Date(i.date).toLocaleDateString('pt-BR'),
      i.licensePlate,
      i.client.name.substring(0, 20),
      i.indicationName || 'Particular',
      i.inspector?.split(' ')[0] || '-',
      i.status,
      i.status_pagamento,
      formatCurrency(i.totalValue)
    ]);

    (doc as any).autoTable({
      startY: 40,
      head: [['Data', 'Placa', 'Cliente', 'Origem', 'Inspetor', 'Status', 'Financeiro', 'Valor']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [53, 77, 129], fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2 },
    });

    if (!isVistoriador) {
        const finalY = (doc as any).lastAutoTable.finalY || 150;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(53, 77, 129);
        doc.text(`VALOR TOTAL ACUMULADO NO FILTRO: ${formatCurrency(stats.totalValue)}`, 14, finalY + 10);
    }

    doc.save(`Prevencar_Relatorio_PDF_${new Date().toISOString().slice(0,10)}.pdf`);
    setIsExporting(false);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(f => f.id));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleQuickPaymentUpdate = (id: string, method: PaymentMethod) => {
    onBulkUpdate({
        ids: [id],
        updates: { 
            paymentMethod: method, 
            status_pagamento: method === PaymentMethod.A_PAGAR ? 'A pagar' : 'Pago',
            status: method === PaymentMethod.A_PAGAR ? 'No Caixa' : 'Concluída'
        }
    });
  };

  const handleBulkPaymentUpdate = (method: PaymentMethod) => {
      if (selectedIds.length === 0) return;
      onBulkUpdate({
          ids: selectedIds,
          updates: { 
              paymentMethod: method, 
              status_pagamento: method === PaymentMethod.A_PAGAR ? 'A pagar' : 'Pago',
              status: method === PaymentMethod.A_PAGAR ? 'No Caixa' : 'Concluída'
          }
      });
      setSelectedIds([]);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                 <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">Gestão de Fichas</h1>
                 <p className="text-sm text-gray-500 font-medium">Histórico e faturamento de vistorias.</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                {/* Botão de Exportar */}
                <div className="relative">
                  <Button 
                    variant="outline"
                    onClick={() => setIsExporting(!isExporting)}
                    className="h-12 px-6 rounded-xl font-black flex items-center gap-2 border-brand-blue/30 text-brand-blue hover:bg-brand-blue/5 transition-all"
                  >
                    <Download size={18} /> Exportar <ChevronDown size={14} className={`transition-transform duration-200 ${isExporting ? 'rotate-180' : ''}`}/>
                  </Button>
                  {isExporting && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right">
                      <div className="p-3 bg-gray-50 border-b border-gray-100">
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Selecione o Formato</p>
                      </div>
                      <button onClick={handleExportExcel} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors text-left border-b border-gray-50 group">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg group-hover:scale-110 transition-transform"><FileSpreadsheet size={20} /></div>
                        <div>
                            <p>Planilha de Dados</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase">Todas as Informações (.xlsx)</p>
                        </div>
                      </button>
                      <button onClick={handleExportPDF} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors text-left group">
                        <div className="p-2 bg-red-50 text-brand-red rounded-lg group-hover:scale-110 transition-transform"><FileType size={20} /></div>
                        <div>
                            <p>Relatório de Listagem</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase">Resumo para Impressão (.pdf)</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <Button onClick={onCreate} className="h-12 px-6 rounded-xl font-black bg-brand-blue shadow-lg shadow-blue-100 flex-1 md:flex-none">
                    <Plus size={20} className="mr-2" /> Nova Vistoria
                </Button>
            </div>
        </div>

        {/* Dashboards Dinâmicos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 border-l-4 border-l-brand-blue">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-brand-blue">
                    <BarChart3 size={24} />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-0.5">Total Selecionado</p>
                    <p className="text-lg font-black text-gray-800 leading-tight">
                        {isVistoriador ? `${stats.count} itens` : formatCurrency(stats.totalValue)}
                    </p>
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 border-l-4 border-l-green-500">
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                    <CheckCircle2 size={24} />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-0.5">Finalizadas</p>
                    <p className="text-lg font-black text-green-700 leading-tight">{stats.completedCount}</p>
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 border-l-4 border-l-orange-500">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                    <Wallet size={24} />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-0.5">No Caixa</p>
                    <p className="text-lg font-black text-orange-700 leading-tight">{stats.cashierCount}</p>
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 border-l-4 border-l-red-500">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-brand-red">
                    <Clock size={24} />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-0.5">Pendência Financeira</p>
                    <p className="text-lg font-black text-brand-red leading-tight">
                        {isVistoriador ? `${stats.unpaidCount} fichas` : formatCurrency(stats.pendingValue)}
                    </p>
                </div>
            </div>
        </div>

        {/* Área de Filtros Refinada */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center justify-between border-b pb-4 border-gray-50">
                <div className="flex items-center gap-2 text-brand-blue">
                    <Filter size={18} />
                    <h3 className="text-xs font-black uppercase tracking-widest">Filtros de Pesquisa</h3>
                </div>
                <button 
                    onClick={clearFilters}
                    className="text-[10px] font-black uppercase text-gray-400 hover:text-brand-red flex items-center gap-1 transition-colors"
                >
                    <RotateCcw size={12} /> Resetar Filtros
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Pesquisa Geral</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-gray-300" size={16}/>
                        <input className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm border-2 border-transparent focus:border-brand-blue outline-none font-bold" placeholder="Placa ou Cliente" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Fornecedor / Origem</label>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-3 text-gray-300" size={16}/>
                        <select className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm border-2 border-transparent focus:border-brand-blue outline-none font-bold appearance-none" value={indicationFilter} onChange={e => setIndicationFilter(e.target.value)}>
                            <option value="">Todos os Parceiros</option>
                            <option value="particular">Venda Direta (Particular)</option>
                            {indications.map(ind => <option key={ind.id} value={ind.id}>{ind.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Data Inicial</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-3 text-gray-300" size={16}/>
                        <input type="date" className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl text-sm border-2 border-transparent focus:border-brand-blue outline-none font-bold" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Data Final</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-3 text-gray-300" size={16}/>
                        <input type="date" className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl text-sm border-2 border-transparent focus:border-brand-blue outline-none font-bold" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Forma de Pagamento</label>
                    <div className="relative">
                        <CreditCard className="absolute left-3 top-3 text-gray-300" size={16}/>
                        <select className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm border-2 border-transparent focus:border-brand-blue outline-none font-bold appearance-none" value={paymentMethodFilter} onChange={e => setPaymentMethodFilter(e.target.value)}>
                            <option value="">Todas as Formas</option>
                            {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Status</label>
                    <div className="relative">
                        <ListFilter className="absolute left-3 top-3 text-gray-300" size={16}/>
                        <select className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm border-2 border-transparent focus:border-brand-blue outline-none font-bold appearance-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                            <option value="">Todos os Status</option>
                            <option value="Iniciada">Iniciada</option>
                            <option value="No Caixa">No Caixa</option>
                            <option value="Concluída">Concluída</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Valor Mínimo</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-3 text-gray-300" size={16}/>
                        <input type="number" className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl text-sm border-2 border-transparent focus:border-brand-blue outline-none font-bold" placeholder="0,00" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Valor Máximo</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-3 text-gray-300" size={16}/>
                        <input type="number" className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl text-sm border-2 border-transparent focus:border-brand-blue outline-none font-bold" placeholder="9.999" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
                    </div>
                </div>
            </div>
        </div>

        {/* Tabela de Resultados */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[1200px]">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400 font-black">
                            <th className="p-4 w-12 text-center">
                                <button onClick={handleSelectAll} className="text-brand-blue">
                                    {selectedIds.length === filtered.length && filtered.length > 0 ? <CheckSquare size={18}/> : <Square size={18}/>}
                                </button>
                            </th>
                            <th className="p-4">Dados da Vistoria</th>
                            <th className="p-4">Origem / Fornecedor</th>
                            <th className="p-4">Cliente Final</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">NF-e</th>
                            {!isVistoriador && <th className="p-4">Pagamento</th>}
                            {!isVistoriador && <th className="p-4 text-right pr-6">Valor</th>}
                            <th className="p-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.map(item => (
                            <tr key={item.id} className={`hover:bg-gray-50/50 transition-colors ${selectedIds.includes(item.id) ? 'bg-blue-50/30' : ''}`}>
                                <td className="p-4 text-center">
                                    <button onClick={() => handleSelectOne(item.id)} className={`${selectedIds.includes(item.id) ? 'text-brand-blue' : 'text-gray-200'}`}>
                                        {selectedIds.includes(item.id) ? <CheckSquare size={18}/> : <Square size={18}/>}
                                    </button>
                                </td>
                                <td className="p-4">
                                    <p className="text-[10px] text-gray-400 mb-0.5">{new Date(item.date).toLocaleDateString('pt-BR')}</p>
                                    <span className="font-black text-gray-800 tracking-wider uppercase">{item.licensePlate}</span>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${item.indicationName ? 'bg-blue-50 text-brand-blue' : 'bg-gray-50 text-gray-400'}`}>
                                            <Building2 size={14} />
                                        </div>
                                        <span className={`text-xs font-bold ${item.indicationName ? 'text-brand-blue' : 'text-gray-400 uppercase tracking-tighter'}`}>
                                            {item.indicationName || 'Venda Direta'}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <p className="text-xs font-bold text-gray-700 truncate max-w-[180px]">{item.client.name}</p>
                                </td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 ${
                                        item.status === 'Concluída' ? 'bg-green-100 text-green-700' :
                                        item.status === 'No Caixa' ? 'bg-orange-100 text-orange-700' :
                                        'bg-blue-100 text-brand-blue'
                                    }`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {item.nfe ? (
                                        <div className="flex flex-col gap-0.5">
                                            <span className="flex items-center gap-1.5 text-green-600 font-black text-[10px] uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded border border-green-100 w-fit">
                                                <CheckCircle2 size={12} /> Emitida
                                            </span>
                                            <span className="text-[9px] font-bold text-gray-400 ml-1">Nº {item.nfe}</span>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => onEdit(item, 2)}
                                            className="group flex items-center gap-1.5 text-orange-600 font-black text-[10px] uppercase tracking-widest bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded transition-all border border-orange-200 hover:border-orange-300 shadow-sm"
                                        >
                                            <FileWarning size={12} className="group-hover:scale-110 transition-transform" /> 
                                            Não emitida
                                        </button>
                                    )}
                                </td>
                                {!isVistoriador && (
                                  <td className="p-4">
                                      {item.status_pagamento === 'A pagar' && isFinanceiro ? (
                                          <div className="relative group/pay">
                                              <select 
                                                className="bg-orange-50 text-orange-700 border border-orange-200 rounded-lg px-2 py-1.5 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-orange-500 appearance-none pr-8 cursor-pointer hover:bg-orange-100 transition-all w-full"
                                                value={PaymentMethod.A_PAGAR}
                                                onChange={(e) => handleQuickPaymentUpdate(item.id, e.target.value as PaymentMethod)}
                                              >
                                                  <option value={PaymentMethod.A_PAGAR}>A PAGAR</option>
                                                  <option value={PaymentMethod.PIX}>PIX</option>
                                                  <option value={PaymentMethod.CREDITO}>CRÉDITO</option>
                                                  <option value={PaymentMethod.DEBITO}>DÉBITO</option>
                                                  <option value={PaymentMethod.DINHEIRO}>DINHEIRO</option>
                                              </select>
                                              <CircleDollarSign size={12} className="absolute right-2 top-2.5 text-orange-500 pointer-events-none" />
                                          </div>
                                      ) : (
                                          <div className="flex flex-col">
                                              <span className="text-[10px] font-bold text-gray-500">
                                                {item.paymentMethod || 'A Definir'}
                                              </span>
                                              <span className={`text-[9px] font-black uppercase ${item.status_pagamento === 'Pago' ? 'text-green-600' : 'text-brand-red'}`}>
                                                  {item.status_pagamento}
                                              </span>
                                          </div>
                                      )}
                                  </td>
                                )}
                                {!isVistoriador && (
                                  <td className="p-4 font-black text-gray-800 text-right pr-6">{formatCurrency(item.totalValue)}</td>
                                )}
                                <td className="p-4 text-center">
                                    <div className="flex justify-center gap-1">
                                        <button onClick={() => onView(item)} className="p-2 text-gray-400 hover:text-brand-blue"><Eye size={16}/></button>
                                        <button onClick={() => onEdit(item)} className="p-2 text-gray-400 hover:text-brand-blue"><Edit2 size={16}/></button>
                                        {!isVistoriador && (
                                          <button onClick={() => onDelete(item.id)} className="p-2 text-gray-400 hover:text-brand-red"><Trash2 size={16}/></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    {!isVistoriador && filtered.length > 0 && (
                      <tfoot>
                        <tr className="bg-gray-50 border-t-2 border-gray-100">
                          <td colSpan={7} className="p-4 text-right font-black text-xs uppercase text-gray-400 tracking-widest">Soma dos Itens Filtrados:</td>
                          <td className="p-4 text-right pr-6 font-black text-brand-blue text-lg">{formatCurrency(stats.totalValue)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                </table>
            </div>
            {filtered.length === 0 && <div className="p-12 text-center text-gray-400 text-xs font-black uppercase">Nenhum registro encontrado para os critérios selecionados.</div>}
        </div>

        {/* Barra de Ações em Lote */}
        {selectedIds.length > 0 && isFinanceiro && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300 w-[90%] max-w-2xl">
                <div className="bg-brand-blue text-white rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20 backdrop-blur-md bg-opacity-95 flex flex-col md:flex-row items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="bg-brand-yellow text-brand-blue w-10 h-10 rounded-full flex items-center justify-center font-black shadow-lg">
                            {selectedIds.length}
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest">Itens Selecionados</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <select 
                            onChange={(e) => handleBulkPaymentUpdate(e.target.value as PaymentMethod)}
                            className="w-full sm:w-48 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-brand-yellow cursor-pointer"
                            defaultValue=""
                        >
                            <option value="" disabled className="text-gray-800">Baixa de Pagamento...</option>
                            {Object.values(PaymentMethod).map(m => <option key={m} value={m} className="text-gray-800">{m}</option>)}
                        </select>
                        <button onClick={() => setSelectedIds([])} className="p-2 text-white/60 hover:text-white transition-colors"><X size={20}/></button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
