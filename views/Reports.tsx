
import React, { useState, useMemo } from 'react';
import { Inspection, Indication, User, PaymentMethod } from '../types';
import { 
  BarChart3, TrendingUp, Wallet, ArrowDownRight, ArrowUpRight, 
  Calendar, Filter, Building2, User as UserIcon, Sigma, 
  Download, FileSpreadsheet, FileType, CheckCircle2, Clock,
  CreditCard, Search, DollarSign, RotateCcw, ChevronDown, FileText
} from 'lucide-react';
import { Button } from '../components/ui/Button';

interface ReportsProps {
  inspections: Inspection[];
  indications: Indication[];
  currentUser?: User;
}

export const Reports: React.FC<ReportsProps> = ({ inspections, indications, currentUser }) => {
  // Estados dos Filtros
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Primeiro dia do mês atual
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPartner, setSelectedPartner] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const clearFilters = () => {
    const d = new Date();
    d.setDate(1);
    setStartDate(d.toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setSelectedPartner('');
    setMinPrice('');
    setMaxPrice('');
    setSelectedPayment('');
  };

  const filteredData = useMemo(() => {
    return inspections.filter(i => {
      const dateMatch = i.date >= startDate && i.date <= endDate;
      const partnerMatch = !selectedPartner || 
                          (selectedPartner === 'particular' ? !i.indicationId : i.indicationId === selectedPartner);
      const price = Number(i.totalValue) || 0;
      const minVal = minPrice ? parseFloat(minPrice) : null;
      const maxVal = maxPrice ? parseFloat(maxPrice) : null;
      const minMatch = minVal === null || price >= minVal;
      const maxMatch = maxVal === null || price <= maxVal;
      const paymentMatch = !selectedPayment || i.paymentMethod === selectedPayment;

      return dateMatch && partnerMatch && minMatch && maxMatch && paymentMatch;
    });
  }, [inspections, startDate, endDate, selectedPartner, minPrice, maxPrice, selectedPayment]);

  const financialStats = useMemo(() => {
    const totalRealizado = filteredData.reduce((acc, curr) => acc + (Number(curr.totalValue) || 0), 0);
    const totalPago = filteredData.filter(i => i.status_pagamento === 'Pago').reduce((acc, curr) => acc + (Number(curr.totalValue) || 0), 0);
    const totalPendente = totalRealizado - totalPago;
    const ticketMedio = filteredData.length > 0 ? totalRealizado / filteredData.length : 0;

    const paymentBreakdown = filteredData.reduce((acc: any, curr) => {
      const method = curr.paymentMethod || 'A Definir';
      acc[method] = (acc[method] || 0) + (Number(curr.totalValue) || 0);
      return acc;
    }, {});

    const sortedPartners = Object.entries(filteredData.reduce((acc: any, curr) => {
      const name = curr.indicationName || 'Venda Direta';
      if (!acc[name]) acc[name] = { total: 0, count: 0 };
      acc[name].total += (Number(curr.totalValue) || 0);
      acc[name].count += 1;
      return acc;
    }, {}))
    .map(([name, stats]: any) => ({ name, ...stats }))
    .sort((a, b) => b.total - a.total);

    return { totalRealizado, totalPago, totalPendente, ticketMedio, paymentBreakdown, sortedPartners };
  }, [filteredData]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleExportExcel = () => {
    const data = filteredData.map(i => ({
      'Data': new Date(i.date).toLocaleDateString('pt-BR'),
      'Placa': i.licensePlate,
      'Modelo': i.vehicleModel,
      'Cliente': i.client.name,
      'Parceiro': i.indicationName || 'Venda Direta',
      'Status': i.status,
      'Pagamento': i.paymentMethod || 'A Definir',
      'Situação': i.status_pagamento,
      'Valor (R$)': i.totalValue
    }));

    const ws = (window as any).XLSX.utils.json_to_sheet(data);
    const wb = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "Relatório Financeiro");
    (window as any).XLSX.writeFile(wb, `Prevencar_Financeiro_${startDate}_a_${endDate}.xlsx`);
    setIsExporting(false);
  };

  const handleExportPDF = () => {
    const doc = new (window as any).jspdf.jsPDF();
    
    // Cabeçalho
    doc.setFillColor(53, 77, 129); // Brand Blue
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("PREVENCAR VISTORIAS", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Relatório Financeiro: ${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} até ${new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}`, 14, 28);
    doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, 14, 34);

    // Resumo em Blocos
    doc.setTextColor(53, 77, 129);
    doc.setFontSize(12);
    doc.text("RESUMO DO PERÍODO", 14, 55);
    
    doc.setDrawColor(230, 230, 230);
    doc.line(14, 58, 196, 58);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Faturamento Bruto", 14, 68);
    doc.text("Total Liquidado", 74, 68);
    doc.text("Pendente Recebimento", 134, 68);

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(formatCurrency(financialStats.totalRealizado), 14, 76);
    doc.setTextColor(21, 128, 61); // Verde
    doc.text(formatCurrency(financialStats.totalPago), 74, 76);
    doc.setTextColor(198, 48, 48); // Vermelho Brand
    doc.text(formatCurrency(financialStats.totalPendente), 134, 76);

    // Tabela
    const tableData = filteredData.map(i => [
      new Date(i.date).toLocaleDateString('pt-BR'),
      i.licensePlate,
      i.client.name.substring(0, 25),
      i.indicationName || 'Direta',
      i.paymentMethod || '-',
      i.status_pagamento,
      formatCurrency(i.totalValue)
    ]);

    (doc as any).autoTable({
      startY: 90,
      head: [['Data', 'Placa', 'Cliente', 'Parceiro', 'Pagto', 'Situação', 'Valor']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [53, 77, 129], fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        6: { halign: 'right', fontStyle: 'bold' }
      }
    });

    doc.save(`Prevencar_Relatorio_${startDate}_${endDate}.pdf`);
    setIsExporting(false);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Relatórios Financeiros</h1>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Análise de desempenho e faturamento</p>
        </div>
        
        <div className="relative group">
          <Button 
            onClick={() => setIsExporting(!isExporting)}
            className="h-12 px-6 bg-brand-blue font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2"
          >
            <Download size={16} /> Exportar Dados <ChevronDown size={14} className={`transition-transform ${isExporting ? 'rotate-180' : ''}`} />
          </Button>

          {isExporting && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right">
              <button 
                onClick={handleExportExcel}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors border-b border-gray-50 text-left"
              >
                <div className="p-2 bg-green-50 rounded-lg text-green-600"><FileSpreadsheet size={18} /></div>
                <div>
                  <p>Planilha Excel</p>
                  <p className="text-[9px] text-gray-400 uppercase">Formato .xlsx</p>
                </div>
              </button>
              <button 
                onClick={handleExportPDF}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors text-left"
              >
                <div className="p-2 bg-red-50 rounded-lg text-brand-red"><FileType size={18} /></div>
                <div>
                  <p>Relatório PDF</p>
                  <p className="text-[9px] text-gray-400 uppercase">Documento para impressão</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center justify-between border-b pb-4 border-gray-50">
            <div className="flex items-center gap-2 text-brand-blue">
                <Filter size={18} />
                <h3 className="text-xs font-black uppercase tracking-widest">Parâmetros do Relatório</h3>
            </div>
            <button onClick={clearFilters} className="text-[10px] font-black uppercase text-gray-400 hover:text-brand-red flex items-center gap-1 transition-colors">
                <RotateCcw size={12} /> Limpar
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-4">
            <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">De:</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 text-gray-300" size={14}/>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-xs border-2 border-transparent focus:border-brand-blue outline-none font-bold" />
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Até:</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 text-gray-300" size={14}/>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-xs border-2 border-transparent focus:border-brand-blue outline-none font-bold" />
                </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Origem / Fornecedor</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 text-gray-300" size={14}/>
                  <select value={selectedPartner} onChange={e => setSelectedPartner(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-xs border-2 border-transparent focus:border-brand-blue outline-none font-bold appearance-none">
                      <option value="">Todos</option>
                      <option value="particular">Venda Direta (Particular)</option>
                      {indications.map(ind => <option key={ind.id} value={ind.id}>{ind.name}</option>)}
                  </select>
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Pagamento</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-3 text-gray-300" size={14}/>
                  <select value={selectedPayment} onChange={e => setSelectedPayment(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-xs border-2 border-transparent focus:border-brand-blue outline-none font-bold appearance-none">
                      <option value="">Todas as formas</option>
                      {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Valor Mínimo</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 text-gray-300" size={14}/>
                  <input type="number" placeholder="0,00" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-xs border-2 border-transparent focus:border-brand-blue outline-none font-bold" />
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Valor Máximo</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 text-gray-300" size={14}/>
                  <input type="number" placeholder="9.999" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-xs border-2 border-transparent focus:border-brand-blue outline-none font-bold" />
                </div>
            </div>
          </div>

          <div className="flex flex-col justify-end p-1">
             <div className="bg-brand-blue/5 p-4 rounded-xl border border-brand-blue/10 flex items-center gap-3">
                <div className="p-2 bg-brand-blue text-white rounded-lg"><Sigma size={18}/></div>
                <div>
                  <p className="text-[9px] font-black uppercase text-gray-400">Total Filtrado</p>
                  <p className="text-sm font-black text-brand-blue">{filteredData.length} vistorias</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm border-l-4 border-l-brand-blue">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Faturamento Bruto</p>
            <div className="p-1.5 bg-blue-50 text-brand-blue rounded-lg"><TrendingUp size={14}/></div>
          </div>
          <p className="text-2xl font-black text-gray-800">{formatCurrency(financialStats.totalRealizado)}</p>
          <p className="text-[10px] text-gray-400 mt-1 font-bold italic">Base: {filteredData.length} itens</p>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm border-l-4 border-l-green-500">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Total Liquidado</p>
            <div className="p-1.5 bg-green-50 text-green-600 rounded-lg"><CheckCircle2 size={14}/></div>
          </div>
          <p className="text-2xl font-black text-green-700">{formatCurrency(financialStats.totalPago)}</p>
          <p className="text-[10px] text-green-600/60 mt-1 font-bold">Fichas com pagamento ok</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm border-l-4 border-l-brand-red">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">A Receber</p>
            <div className="p-1.5 bg-red-50 text-brand-red rounded-lg"><Clock size={14}/></div>
          </div>
          <p className="text-2xl font-black text-brand-red">{formatCurrency(financialStats.totalPendente)}</p>
          <p className="text-[10px] text-red-400 mt-1 font-bold uppercase tracking-tighter">Pendência no caixa</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm border-l-4 border-l-brand-yellow">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Ticket Médio</p>
            <div className="p-1.5 bg-yellow-50 text-brand-yellow rounded-lg"><BarChart3 size={14}/></div>
          </div>
          <p className="text-2xl font-black text-gray-800">{formatCurrency(financialStats.ticketMedio)}</p>
          <p className="text-[10px] text-gray-400 mt-1 font-bold italic">Média por vistoria</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico/Lista de Métodos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest border-b pb-3 border-gray-50">Distribuição de Recebimento</h3>
            <div className="space-y-3">
              {Object.entries(financialStats.paymentBreakdown).map(([method, value]: any) => {
                const perc = (value / financialStats.totalRealizado) * 100;
                return (
                  <div key={method} className="space-y-1">
                    <div className="flex justify-between text-xs font-black uppercase tracking-tighter">
                      <span className="text-gray-500">{method}</span>
                      <span className="text-brand-blue">{formatCurrency(value)}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-brand-blue h-full rounded-full" style={{ width: `${perc}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
        </div>

        {/* Ranking de Parceiros */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest">Faturamento por Parceiro / Origem</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100">
                  <th className="px-6 py-4">Parceiro</th>
                  <th className="px-6 py-4 text-center">Volume</th>
                  <th className="px-6 py-4 text-right">Total Gerado</th>
                  <th className="px-6 py-4 text-right pr-8">Ticket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {financialStats.sortedPartners.map((p: any) => (
                  <tr key={p.name} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-700 text-xs uppercase tracking-tight">{p.name}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-blue-50 text-brand-blue px-2 py-1 rounded-lg text-[10px] font-black">{p.count}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-gray-800 text-xs">{formatCurrency(p.total)}</td>
                    <td className="px-6 py-4 text-right pr-8 text-[10px] font-bold text-gray-400">{formatCurrency(p.total / p.count)}</td>
                  </tr>
                ))}
                {financialStats.sortedPartners.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-xs font-bold text-gray-400 uppercase italic">Nenhum dado para o período.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
