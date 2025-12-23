
import React, { useState, useEffect, useMemo } from 'react';
import { Inspection, PaymentMethod, Indication, User, ServiceItem, MonthlyClosure } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  ArrowLeft, ArrowRight, Send, CheckCircle, Landmark, 
  CreditCard, FileText, EyeOff, MapPin, Phone, Calculator, 
  Tag, ArrowDownRight, ArrowUpRight, Minus, FileEdit, User as UserIcon, Sigma, Wallet,
  PlusCircle, Download, FileType, Loader2
} from 'lucide-react';

// Funções de Máscara e Formatação
const maskCPFCNPJ = (value: string) => {
    const v = value.replace(/\D/g, "");
    if (v.length <= 11) {
        return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/g, "$1.$2.$3-$4").substring(0, 14);
    }
    return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/g, "$1.$2.$3/$4-$5").substring(0, 18);
};

const maskPhone = (value: string) => {
    const v = value.replace(/\D/g, "");
    if (v.length <= 10) {
        return v.replace(/(\d{2})(\d{4})(\d{4})/g, "($1) $2-$3").substring(0, 14);
    }
    return v.replace(/(\d{2})(\d{5})(\d{4})/g, "($1) $2-$3").substring(0, 15);
};

const maskCEP = (value: string) => {
    return value.replace(/\D/g, "").replace(/(\d{5})(\d{3})/g, "$1-$2").substring(0, 9);
};

interface InspectionFormProps {
  inspectionToEdit?: Inspection | null;
  onSave: (inspection: Inspection) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
  currentUser?: User;
  indications: Indication[];
  services: ServiceItem[];
  closures: MonthlyClosure[];
  initialStep?: number;
}

export const InspectionForm: React.FC<InspectionFormProps> = ({ 
    inspectionToEdit, onSave, onCancel,
    currentUser, indications, services, initialStep = 1, readOnly = false
}) => {
  const [step, setStep] = useState(initialStep);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [formData, setFormData] = useState<Partial<Inspection>>({
    date: new Date().toISOString().split('T')[0],
    status: 'Iniciada',
    status_ficha: 'Incompleta',
    status_pagamento: 'A pagar',
    selectedServices: [],
    servicePriceOverrides: {},
    otherServiceDescription: '',
    otherServicePrice: 0,
    inspector: currentUser?.name || '', 
    client: { name: '', cpf: '', phone: '', address: '', cep: '', neighborhood: '', number: '', complement: '' },
    observations: ''
  });

  const isVistoriador = currentUser?.role === 'vistoriador';
  const isFinanceiro = currentUser?.role === 'financeiro';
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (inspectionToEdit) setFormData(inspectionToEdit);
  }, [inspectionToEdit]);

  const selectedIndication = useMemo(() => 
    indications.find(i => i.id === formData.indicationId), 
  [formData.indicationId, indications]);

  // Busca Automática de CEP
  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const cep = maskCEP(e.target.value);
    setFormData({ ...formData, client: { ...formData.client!, cep } });

    if (cep.length === 9) {
      setLoadingCEP(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep.replace("-", "")}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            client: {
              ...prev.client!,
              address: data.logradouro,
              neighborhood: data.bairro,
              complement: data.complemento,
            }
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      } finally {
        setLoadingCEP(false);
      }
    }
  };

  const getServicePrice = (service: ServiceItem, indication?: Indication) => {
    if (indication?.customPrices && indication.customPrices[service.id]) {
      return indication.customPrices[service.id];
    }
    return service.price;
  };

  const handleIndicationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (readOnly) return;
    const id = e.target.value;
    const ind = indications.find(i => i.id === id);
    
    const newOverrides = { ...(formData.servicePriceOverrides || {}) };
    formData.selectedServices?.forEach(sName => {
        const service = services.find(s => s.name === sName);
        if (service) {
            newOverrides[sName] = getServicePrice(service, ind);
        }
    });

    setFormData(prev => ({
        ...prev,
        indicationId: ind?.id,
        indicationName: ind?.name,
        servicePriceOverrides: newOverrides,
        client: {
            ...prev.client!,
            name: ind ? ind.name : '',
            cpf: ind ? ind.document : '',
            phone: ind ? ind.phone : '',
            address: ind ? ind.address || '' : '',
            cep: ind ? ind.cep || '' : '',
            neighborhood: ind ? ind.neighborhood || '' : '',
            number: ind ? ind.number || '' : '',
            complement: ''
        }
    }));
  };

  const toggleService = (service: ServiceItem) => {
    if (readOnly) return;
    const current = formData.selectedServices || [];
    const overrides = { ...(formData.servicePriceOverrides || {}) };
    
    if (current.includes(service.name)) {
        delete overrides[service.name];
        setFormData({ ...formData, selectedServices: current.filter(s => s !== service.name), servicePriceOverrides: overrides });
    } else {
        overrides[service.name] = getServicePrice(service, selectedIndication);
        setFormData({ ...formData, selectedServices: [...current, service.name], servicePriceOverrides: overrides });
    }
  };

  const updateManualPrice = (sName: string, val: string) => {
    if (readOnly) return;
    setFormData(prev => ({
        ...prev,
        servicePriceOverrides: { ...prev.servicePriceOverrides, [sName]: parseFloat(val) || 0 }
    }));
  };

  const calculateTotal = () => {
    const fixedTotal = (formData.selectedServices || []).reduce((acc, sName) => {
        return acc + (formData.servicePriceOverrides?.[sName] || 0);
    }, 0);
    return fixedTotal + (Number(formData.otherServicePrice) || 0);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const canEditTechnical = !readOnly && (isAdmin || (isVistoriador && (!formData.id || formData.status === 'Iniciada')));
  
  const isStep1Complete = useMemo(() => {
    return (
        formData.licensePlate && 
        formData.vehicleModel && 
        formData.client?.name && 
        formData.client?.cpf &&
        ((formData.selectedServices?.length || 0) > 0 || (formData.otherServicePrice || 0) > 0)
    );
  }, [formData]);

  const exportInspectionPDF = () => {
    const doc = new (window as any).jspdf.jsPDF();
    const plate = formData.licensePlate || 'VISTORIA';
    
    // Configurações Visuais
    const primaryColor = [53, 77, 129];
    const secondaryColor = [198, 48, 48];
    const grayColor = [100, 100, 100];

    // Cabeçalho institucional
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("PREVENCAR VISTORIAS", 14, 18);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Comprovante Eletrônico de Vistoria - Ficha ID: ${formData.id}`, 14, 26);
    doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, 14, 31);

    // Dados do Veículo
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("1. DADOS DO VEÍCULO E ATENDIMENTO", 14, 45);
    doc.line(14, 47, 196, 47);

    doc.setFontSize(9);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text("DATA:", 14, 54);
    doc.text("PLACA:", 60, 54);
    doc.text("MODELO:", 110, 54);
    doc.text("INSPETOR:", 14, 62);
    doc.text("PARCEIRO:", 110, 62);

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(new Date(formData.date!).toLocaleDateString('pt-BR'), 14, 58);
    doc.text(formData.licensePlate!, 60, 58);
    doc.text(formData.vehicleModel!, 110, 58);
    doc.text(formData.inspector || 'N/I', 14, 66);
    doc.text(formData.indicationName || 'Venda Direta / Particular', 110, 66);

    // Dados do Cliente
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("2. DADOS DO CLIENTE", 14, 78);
    doc.line(14, 80, 196, 80);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text("NOME/RAZÃO SOCIAL:", 14, 87);
    doc.text("CPF/CNPJ:", 110, 87);
    doc.text("CONTATO:", 14, 95);
    doc.text("ENDEREÇO:", 14, 103);

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(formData.client!.name, 14, 91);
    doc.text(formData.client!.cpf, 110, 91);
    doc.text(formData.client!.phone, 14, 99);
    const addressLine = `${formData.client!.address}, ${formData.client!.number}${formData.client!.complement ? ' - ' + formData.client!.complement : ''} | ${formData.client!.neighborhood || ''} | CEP: ${formData.client!.cep}`;
    doc.text(addressLine.substring(0, 110), 14, 107);

    // Serviços
    doc.setFontSize(12);
    doc.text("3. SERVIÇOS E VALORES", 14, 118);
    doc.line(14, 120, 196, 120);

    const serviceRows = (formData.selectedServices || []).map(s => [
        s,
        formatCurrency(formData.servicePriceOverrides?.[s] || 0)
    ]);
    
    if (formData.otherServicePrice) {
        serviceRows.push([
            `OUTRO: ${formData.otherServiceDescription || 'Serviço Avulso'}`,
            formatCurrency(formData.otherServicePrice)
        ]);
    }

    (doc as any).autoTable({
        startY: 125,
        head: [['Descrição do Serviço', 'Valor Cobrado']],
        body: serviceRows,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, fontSize: 9 },
        styles: { fontSize: 8 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Resumo Financeiro
    doc.setFillColor(245, 245, 245);
    doc.rect(14, finalY, 182, 30, 'F');
    
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(10);
    doc.text("RESUMO FINANCEIRO", 18, finalY + 8);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(`FORMA DE PAGAMENTO: ${formData.paymentMethod || 'NÃO DEFINIDO'}`, 18, finalY + 16);
    doc.text(`SITUAÇÃO: ${formData.status_pagamento?.toUpperCase() || 'PENDENTE'}`, 18, finalY + 22);
    doc.text(`NF-e: ${formData.nfe || 'NÃO EMITIDA'}`, 110, finalY + 16);

    doc.setFontSize(14);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`VALOR TOTAL: ${formatCurrency(calculateTotal())}`, 110, finalY + 24);

    // Observações
    if (formData.observations) {
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("OBSERVAÇÕES:", 14, finalY + 45);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const splitObs = doc.splitTextToSize(formData.observations, 180);
        doc.text(splitObs, 14, finalY + 50);
    }

    // Rodapé de segurança
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("Este documento é um registro eletrônico gerado pelo Sistema Prevencar. Válido para simples conferência operacional.", 105, pageHeight - 10, { align: 'center' });

    doc.save(`FICHA_PREVENCAR_${plate}_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl mx-auto border border-gray-100 mb-8">
        {readOnly && (
            <div className="bg-brand-yellow/10 p-3 px-6 border-b border-brand-yellow/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <EyeOff size={14} className="text-brand-yellow" />
                    <span className="text-[10px] font-black uppercase text-brand-blue tracking-widest">Modo Visualização</span>
                </div>
                <button 
                    onClick={exportInspectionPDF}
                    className="flex items-center gap-2 bg-brand-blue text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-800 transition-colors shadow-sm"
                >
                    <Download size={12} /> Baixar Ficha (PDF)
                </button>
            </div>
        )}
        
        <div className="bg-brand-blue p-6 md:p-8 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => step === 1 ? onCancel() : setStep(1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-xl md:text-2xl font-black">{step === 1 ? '01. Identificação' : '02. Fechamento'}</h2>
                        <p className="text-xs text-blue-200 uppercase font-bold tracking-widest">{formData.licensePlate || 'Nova Vistoria'}</p>
                    </div>
                </div>
                <div className="bg-white/10 px-6 py-2 rounded-xl border border-white/10 text-right w-full md:w-auto">
                    <p className="text-[10px] font-black uppercase opacity-60">Total do Serviço Realizado</p>
                    <p className="text-xl font-black text-brand-yellow">{formatCurrency(calculateTotal())}</p>
                </div>
            </div>
        </div>

        <div className="p-6 md:p-10 space-y-8">
            {step === 1 ? (
                <div className="space-y-8 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Placa" disabled={!canEditTechnical} value={formData.licensePlate || ''} onChange={e => setFormData({...formData, licensePlate: e.target.value.toUpperCase()})} className="h-12 font-black text-center text-xl tracking-widest" />
                        <Input label="Modelo do Veículo" disabled={!canEditTechnical} value={formData.vehicleModel || ''} onChange={e => setFormData({...formData, vehicleModel: e.target.value})} className="h-12 font-bold" />
                    </div>

                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Landmark size={18} className="text-brand-blue"/>
                            <h3 className="text-xs font-black uppercase text-brand-blue tracking-widest">Origem do Atendimento</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-brand-blue uppercase ml-1">Parceiro / Fornecedor</label>
                                <select disabled={!canEditTechnical} className="w-full h-12 border-2 rounded-xl px-4 font-bold outline-none focus:ring-2 focus:ring-brand-blue bg-white" value={formData.indicationId || ''} onChange={handleIndicationChange}>
                                    <option value="">Particular / Venda Direta</option>
                                    {indications.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                </select>
                            </div>
                            <Input label="CPF ou CNPJ do Cliente" disabled={!canEditTechnical} value={formData.client?.cpf || ''} onChange={e => setFormData({...formData, client: {...formData.client!, cpf: maskCPFCNPJ(e.target.value)}})} className="h-12 font-bold" />
                        </div>
                        
                        <Input label="Nome Completo / Razão Social" disabled={!canEditTechnical} value={formData.client?.name || ''} onChange={e => setFormData({...formData, client: {...formData.client!, name: e.target.value}})} className="h-12 font-bold" />
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase text-brand-blue tracking-widest flex items-center gap-2">
                            <CheckCircle size={18}/> Serviços Realizados
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {services.map(s => {
                                const isSelected = (formData.selectedServices || []).includes(s.name);
                                const basePrice = getServicePrice(s, selectedIndication);
                                return (
                                    <div key={s.id} className={`p-4 rounded-xl border-2 transition-all space-y-3 ${isSelected ? 'border-brand-blue bg-blue-50/50 shadow-md' : 'border-gray-100 bg-white'}`}>
                                        <div onClick={() => toggleService(s)} className={`flex items-center gap-3 ${canEditTechnical ? 'cursor-pointer' : 'cursor-default'}`}>
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-brand-blue border-brand-blue text-white' : 'border-gray-300'}`}>
                                                {isSelected && <CheckCircle size={12}/>}
                                            </div>
                                            <span className="text-sm font-bold text-gray-700 flex-1">{s.name}</span>
                                        </div>
                                        
                                        {isSelected && (
                                            <div className="pt-2 border-t border-blue-100">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Base: {formatCurrency(basePrice)}</span>
                                                    <span className="text-[10px] font-black uppercase text-brand-blue tracking-tighter">Valor Aplicado (R$)</span>
                                                </div>
                                                <input 
                                                    type="number" 
                                                    disabled={readOnly}
                                                    className="w-full h-10 px-3 font-black text-brand-blue border-2 border-blue-200 rounded-lg outline-none focus:border-brand-blue bg-white" 
                                                    value={formData.servicePriceOverrides?.[s.name] || 0} 
                                                    onChange={e => updateManualPrice(s.name, e.target.value)} 
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* CAMPO OUTROS SERVIÇOS */}
                    <div className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200 space-y-4">
                        <div className="flex items-center gap-2">
                            <PlusCircle size={18} className="text-brand-blue"/>
                            <h3 className="text-xs font-black uppercase text-brand-blue tracking-widest">Outros Serviços / Avulsos</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Descrição do Serviço Extra</label>
                                <input 
                                    disabled={readOnly}
                                    type="text"
                                    placeholder="Ex: Cópia de documento, taxas extras..."
                                    className="w-full h-11 border-2 border-gray-100 rounded-xl px-4 text-sm font-bold outline-none focus:border-brand-blue bg-white"
                                    value={formData.otherServiceDescription || ''}
                                    onChange={e => setFormData({...formData, otherServiceDescription: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Valor (R$)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-[10px] font-black text-brand-blue">R$</span>
                                    <input 
                                        disabled={readOnly}
                                        type="number"
                                        placeholder="0,00"
                                        className="w-full h-11 border-2 border-gray-100 rounded-xl pl-8 pr-4 text-sm font-black outline-none focus:border-brand-blue bg-white"
                                        value={formData.otherServicePrice || 0}
                                        onChange={e => setFormData({...formData, otherServicePrice: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-black uppercase text-brand-blue ml-1 flex items-center gap-2">
                            <FileEdit size={14}/> Observações e Notas Técnicas
                        </label>
                        <textarea 
                            disabled={readOnly}
                            className="w-full border-2 border-gray-100 rounded-xl p-4 text-sm font-medium outline-none focus:border-brand-blue min-h-[100px] bg-gray-50/50"
                            placeholder="Anote detalhes relevantes da vistoria..."
                            value={formData.observations || ''}
                            onChange={e => setFormData({...formData, observations: e.target.value})}
                        />
                    </div>

                    <div className="pt-6 border-t flex flex-col gap-6">
                        <div className="bg-gray-100 p-4 rounded-xl flex items-center justify-between">
                           <div className="flex items-center gap-3 text-gray-500">
                              <Sigma size={20} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Prévia do Serviço Realizado</span>
                           </div>
                           <span className="text-lg font-black text-brand-blue">{formatCurrency(calculateTotal())}</span>
                        </div>

                        <div className="flex flex-col md:flex-row justify-end gap-3">
                            <Button variant="outline" onClick={onCancel} className="h-12 font-black uppercase text-[10px] tracking-widest order-2 md:order-1">Sair</Button>
                            {!readOnly && (
                                <div className="flex flex-col sm:flex-row gap-2 order-1 md:order-2">
                                    <Button 
                                        disabled={!isStep1Complete}
                                        onClick={() => onSave({
                                            ...formData,
                                            id: formData.id || Math.random().toString(36).substr(2, 9),
                                            totalValue: calculateTotal(),
                                            status: 'No Caixa',
                                            status_ficha: 'Completa'
                                        } as Inspection)} 
                                        className="h-12 px-6 bg-orange-500 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-100 disabled:opacity-30"
                                    >
                                        <Send size={16} className="mr-2"/> Enviar p/ Caixa
                                    </Button>
                                    
                                    <Button 
                                        disabled={!isStep1Complete}
                                        onClick={() => setStep(2)} 
                                        className="h-12 px-8 bg-brand-blue text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-100 disabled:opacity-30"
                                    >
                                        Faturamento <ArrowRight size={16} className="ml-2"/>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 animate-fade-in">
                    <div className="bg-blue-50/30 p-5 rounded-2xl border border-blue-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-[9px] font-black uppercase text-gray-400">Placa / Veículo</p>
                            <p className="text-xs font-black text-brand-blue">{formData.licensePlate} - {formData.vehicleModel}</p>
                        </div>
                        <div className="md:col-span-2">
                            <p className="text-[9px] font-black uppercase text-gray-400">Titular da Ficha</p>
                            <p className="text-xs font-black text-brand-blue">{formData.client?.name}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black uppercase text-gray-400">Total Realizado</p>
                            <span className="text-sm font-black text-brand-blue">{formatCurrency(calculateTotal())}</span>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin size={18} className="text-brand-blue"/>
                            <h3 className="text-xs font-black uppercase text-brand-blue tracking-widest">Endereço e Contato</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2">
                            <Input label="Celular / WhatsApp" disabled={readOnly} placeholder="(00) 00000-0000" value={formData.client?.phone || ''} onChange={e => setFormData({...formData, client: {...formData.client!, phone: maskPhone(e.target.value)}})} className="h-11 font-bold" />
                            <div className="md:col-span-2 relative">
                                <Input label="CEP" disabled={readOnly || loadingCEP} placeholder="00000-000" value={formData.client?.cep || ''} onChange={handleCEPChange} className="h-11 font-bold pr-10" />
                                {loadingCEP && <Loader2 className="absolute right-3 top-9 animate-spin text-brand-blue" size={20} />}
                            </div>
                        </div>

                        <Input label="Logradouro" disabled={readOnly} value={formData.client?.address || ''} onChange={e => setFormData({...formData, client: {...formData.client!, address: e.target.value}})} className="h-11 font-bold" />

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                            <Input label="Número" disabled={readOnly} value={formData.client?.number || ''} onChange={e => setFormData({...formData, client: {...formData.client!, number: e.target.value}})} className="h-11 font-bold" />
                            <div className="md:col-span-2">
                                <Input label="Bairro" disabled={readOnly} value={formData.client?.neighborhood || ''} onChange={e => setFormData({...formData, client: {...formData.client!, neighborhood: e.target.value}})} className="h-11 font-bold" />
                            </div>
                            <Input label="Complemento" disabled={readOnly} value={formData.client?.complement || ''} onChange={e => setFormData({...formData, client: {...formData.client!, complement: e.target.value}})} className="h-11 font-bold" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-black uppercase text-brand-blue flex items-center gap-2 tracking-widest ml-1"><CreditCard size={14}/> Forma de Recebimento</h3>
                            <select disabled={readOnly} className="w-full h-12 border-2 rounded-xl px-4 font-black bg-white focus:ring-2 focus:ring-brand-blue text-sm" value={formData.paymentMethod || ''} onChange={e => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})}>
                                <option value="">Defina o pagamento...</option>
                                {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-black uppercase text-brand-blue flex items-center gap-2 tracking-widest ml-1"><FileText size={14}/> Nota Fiscal (NF-e)</h3>
                            <Input disabled={readOnly} placeholder="Nº da Nota Fiscal" value={formData.nfe || ''} onChange={e => setFormData({...formData, nfe: e.target.value})} className="h-12 font-bold" />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden shadow-sm">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sigma size={18} className="text-brand-blue" />
                                <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Resumo Financeiro de Serviços</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[9px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-50">
                                            <th className="pb-4">Serviço Realizado</th>
                                            <th className="pb-4 text-right">Preço Sugerido</th>
                                            <th className="pb-4 text-right">Preço Aplicado</th>
                                            <th className="pb-4 text-right">Variação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {(formData.selectedServices || []).map(sName => {
                                            const service = services.find(s => s.name === sName);
                                            const basePrice = service ? getServicePrice(service, selectedIndication) : 0;
                                            const finalPrice = formData.servicePriceOverrides?.[sName] || 0;
                                            const diff = finalPrice - basePrice;

                                            return (
                                                <tr key={sName} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="py-4 font-bold text-gray-700 text-sm">{sName}</td>
                                                    <td className="py-4 text-right font-medium text-gray-400 text-sm">{formatCurrency(basePrice)}</td>
                                                    <td className="py-4 text-right font-black text-brand-blue text-sm">{formatCurrency(finalPrice)}</td>
                                                    <td className="py-4 text-right">
                                                        {diff === 0 ? (
                                                            <span className="text-[10px] font-black text-gray-300 flex items-center justify-end gap-1"><Minus size={10}/> Inalterado</span>
                                                        ) : diff < 0 ? (
                                                            <span className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1 rounded-full inline-flex items-center gap-1">
                                                                <ArrowDownRight size={12}/> -{formatCurrency(Math.abs(diff))}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-black text-brand-red bg-red-50 px-3 py-1 rounded-full inline-flex items-center gap-1">
                                                                <ArrowUpRight size={12}/> +{formatCurrency(diff)}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {formData.otherServicePrice && formData.otherServicePrice > 0 ? (
                                             <tr className="bg-gray-50/50">
                                                <td className="py-4 font-bold text-brand-blue text-sm italic">Extra: {formData.otherServiceDescription || 'Serviço Avulso'}</td>
                                                <td className="py-4 text-right font-medium text-gray-400 text-sm">-</td>
                                                <td className="py-4 text-right font-black text-brand-blue text-sm">{formatCurrency(formData.otherServicePrice)}</td>
                                                <td className="py-4 text-right">
                                                    <span className="text-[10px] font-black text-brand-blue bg-blue-50 px-3 py-1 rounded-full inline-flex items-center gap-1">
                                                        <PlusCircle size={12}/> Valor Avulso
                                                    </span>
                                                </td>
                                             </tr>
                                        ) : null}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="text-center md:text-left flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                                        <UserIcon size={24}/>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Inspector Responsável</p>
                                        <p className="font-bold text-gray-700 text-sm">{formData.inspector || currentUser?.name}</p>
                                    </div>
                                </div>
                                <div className="bg-brand-blue px-10 py-5 rounded-2xl text-white text-center shadow-2xl shadow-blue-100 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Total do Serviço Realizado</p>
                                    <p className="text-3xl font-black tracking-tight">{formatCurrency(calculateTotal())}</p>
                                    {formData.paymentMethod === PaymentMethod.A_PAGAR && (
                                        <p className="text-[9px] font-black uppercase mt-1 text-brand-yellow flex items-center justify-center gap-1">
                                           <Wallet size={10} /> Pendente de Pagamento
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between gap-3 pt-6 border-t">
                        <Button variant="outline" onClick={() => setStep(1)} className="h-12 font-black uppercase text-[10px] tracking-widest">Revisar Etapa Técnica</Button>
                        {!readOnly && (
                            <Button 
                                onClick={() => onSave({
                                    ...formData,
                                    id: formData.id || Math.random().toString(36).substr(2, 9),
                                    totalValue: calculateTotal(),
                                    status: formData.paymentMethod === PaymentMethod.A_PAGAR ? 'No Caixa' : 'Concluída',
                                    status_pagamento: formData.paymentMethod === PaymentMethod.A_PAGAR ? 'A pagar' : 'Pago',
                                    status_ficha: 'Completa',
                                    mes_referencia: formData.date?.substring(0, 7) || ''
                                } as Inspection)} 
                                className="h-16 px-12 bg-green-600 text-white font-black uppercase text-sm tracking-widest rounded-2xl shadow-2xl shadow-green-100 flex items-center gap-3 hover:bg-green-700 transition-all"
                            >
                                <CheckCircle size={28} /> Finalizar Ficha de Vistoria
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
