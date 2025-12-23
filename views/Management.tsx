
import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Users, Plus, Trash2, Edit2, Shield, Download, FileSpreadsheet, FileType,
  Building2, Tag, ClipboardList, MapPin, Phone, Mail, FileText, ChevronLeft,
  DollarSign, Settings2, Info, Loader2
} from 'lucide-react';
import { User, Indication, ServiceItem, MonthlyClosure, Inspection, SystemLog, Role } from '../types';

// Funções de Máscara
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

interface ManagementProps {
    currentUser?: User;
    users: User[];
    indications: Indication[];
    services: ServiceItem[];
    closures: MonthlyClosure[];
    inspections: Inspection[];
    logs: SystemLog[];
    onSaveUser: (user: User) => void;
    onDeleteUser: (id: string) => void;
    onSaveIndication: (indication: Indication) => void;
    onDeleteIndication: (id: string) => void;
    onSaveService: (service: ServiceItem) => void;
    onDeleteService: (id: string) => void;
    onProcessClosure: (mes: string) => any;
}

export const Management: React.FC<ManagementProps> = ({ 
    currentUser, users, indications, services, onSaveUser, onDeleteUser,
    onSaveIndication, onDeleteIndication, onSaveService, onDeleteService
}) => {
  const isVistoriador = currentUser?.role === 'vistoriador';
  const isAdmin = currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'users' | 'indications' | 'services' | 'profile'>('profile');
  const [loadingCEP, setLoadingCEP] = useState(false);
  
  // Estados para Usuários
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<Partial<User>>({});

  // Estados para Parceiros
  const [editingIndication, setEditingIndication] = useState<Indication | null>(null);
  const [indicationForm, setIndicationForm] = useState<Partial<Indication>>({});

  // Estados para Serviços
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [serviceForm, setServiceForm] = useState<Partial<ServiceItem>>({});

  const [isExporting, setIsExporting] = useState(false);

  // Busca de CEP para Parceiros
  const handleIndicationCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const cep = maskCEP(e.target.value);
    setIndicationForm({ ...indicationForm, cep });

    if (cep.length === 9) {
      setLoadingCEP(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep.replace("-", "")}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setIndicationForm(prev => ({
            ...prev,
            address: data.logradouro,
            neighborhood: data.bairro,
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      } finally {
        setLoadingCEP(false);
      }
    }
  };

  const exportExcel = (type: 'users' | 'indications' | 'services') => {
    let data = [];
    let filename = `Prevencar_Export_${type}_${new Date().toISOString().slice(0,10)}`;

    if (type === 'users') {
        data = users.map(u => ({ Nome: u.name, Email: u.email, Cargo: u.role }));
    } else if (type === 'indications') {
        data = indications.map(i => ({ Nome: i.name, Documento: i.document, Telefone: i.phone, Email: i.email }));
    } else if (type === 'services') {
        data = services.map(s => ({ Serviço: s.name, Preço_Base: s.price, Descrição: s.description }));
    }

    const ws = (window as any).XLSX.utils.json_to_sheet(data);
    const wb = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "Dados");
    (window as any).XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportPDF = (type: 'users' | 'indications' | 'services') => {
    const doc = new (window as any).jspdf.jsPDF();
    const title = type === 'users' ? 'Relatório de Equipe' : type === 'indications' ? 'Relatório de Parceiros' : 'Relatório de Serviços';
    
    doc.setFontSize(18);
    doc.text(`Prevencar - ${title}`, 14, 22);
    
    let head: string[][] = [];
    let body: any[][] = [];

    if (type === 'users') {
        head = [['Nome', 'Email', 'Cargo']];
        body = users.map(u => [u.name, u.email, u.role]);
    } else if (type === 'indications') {
        head = [['Parceiro', 'Documento', 'Telefone', 'Email']];
        body = indications.map(i => [i.name, i.document, i.phone, i.email]);
    } else if (type === 'services') {
        head = [['Serviço', 'Preço Base', 'Descrição']];
        body = services.map(s => [s.name, `R$ ${s.price.toFixed(2)}`, s.description]);
    }

    (doc as any).autoTable({
        startY: 30,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [53, 77, 129] }
    });

    doc.save(`Prevencar_${type}_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const handleSaveUserLocal = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveUser({ ...userForm, id: userForm.id || Math.random().toString(36).substr(2, 9) } as User);
    setEditingUser(null);
    setUserForm({});
  };

  const handleSaveIndicationLocal = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveIndication({ ...indicationForm, id: indicationForm.id || Math.random().toString(36).substr(2, 9) } as Indication);
    setEditingIndication(null);
    setIndicationForm({});
  };

  const handleSaveServiceLocal = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveService({ ...serviceForm, id: serviceForm.id || Math.random().toString(36).substr(2, 9) } as ServiceItem);
    setEditingService(null);
    setServiceForm({});
  };

  const updateCustomPrice = (serviceId: string, value: string) => {
    const price = value === '' ? undefined : parseFloat(value);
    const currentPrices = { ...(indicationForm.customPrices || {}) };
    
    if (price === undefined) {
        delete currentPrices[serviceId];
    } else {
        currentPrices[serviceId] = price;
    }
    
    setIndicationForm({ ...indicationForm, customPrices: currentPrices });
  };

  const getRoleLabel = (role?: string) => {
    switch(role) {
        case 'admin': return 'Administrador';
        case 'financeiro': return 'Financeiro';
        default: return 'Vistoriador';
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <div className="bg-white p-2 rounded-xl shadow-sm flex overflow-x-auto gap-2 border border-gray-100">
        <button onClick={() => setActiveTab('profile')} className={`whitespace-nowrap py-2 px-6 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-brand-blue text-white' : 'text-gray-400 hover:bg-gray-100'}`}>Meu Perfil</button>
        {!isVistoriador && (
            <>
                <button onClick={() => { setActiveTab('indications'); setIsExporting(false); setEditingIndication(null); }} className={`whitespace-nowrap py-2 px-6 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'indications' ? 'bg-brand-blue text-white' : 'text-gray-400 hover:bg-gray-100'}`}>Parceiros</button>
                <button onClick={() => { setActiveTab('services'); setIsExporting(false); setEditingService(null); }} className={`whitespace-nowrap py-2 px-6 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'services' ? 'bg-brand-blue text-white' : 'text-gray-400 hover:bg-gray-100'}`}>Serviços</button>
            </>
        )}
        {isAdmin && (
            <button onClick={() => { setActiveTab('users'); setIsExporting(false); setEditingUser(null); }} className={`whitespace-nowrap py-2 px-6 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-brand-blue text-white' : 'text-gray-400 hover:bg-gray-100'}`}>Equipe</button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[400px]">
        {/* ABA EQUIPE */}
        {activeTab === 'users' && isAdmin && (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-black text-gray-800 tracking-tight">Equipe Prevencar</h2>
                    <div className="flex gap-2">
                        <div className="relative">
                            <Button onClick={() => setIsExporting(!isExporting)} variant="outline" className="h-10 text-[10px] uppercase font-black border-gray-200 bg-white">
                                <Download size={14} className="mr-1"/> Exportar
                            </Button>
                            {isExporting && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                                    <button onClick={() => { exportExcel('users'); setIsExporting(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors text-left">
                                        <FileSpreadsheet className="text-green-600" size={16} /> Excel (.xlsx)
                                    </button>
                                    <button onClick={() => { exportPDF('users'); setIsExporting(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors border-t border-gray-50 text-left">
                                        <FileType className="text-red-600" size={16} /> PDF (.pdf)
                                    </button>
                                </div>
                            )}
                        </div>
                        {!editingUser && <Button onClick={() => {setEditingUser({} as any); setUserForm({role: 'vistoriador'});}} className="h-10 text-[10px] uppercase tracking-widest font-black"><Plus size={16} className="mr-1"/> Novo</Button>}
                    </div>
                </div>

                {editingUser ? (
                    <form onSubmit={handleSaveUserLocal} className="bg-gray-50 p-6 rounded-2xl border space-y-4 max-w-2xl animate-fade-in">
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="text-brand-blue" size={20}/>
                            <h3 className="text-sm font-black uppercase text-brand-blue tracking-widest">{userForm.id ? 'Editar Acesso' : 'Novo Usuário'}</h3>
                        </div>
                        <Input label="Nome Completo" value={userForm.name || ''} onChange={e => setUserForm({...userForm, name: e.target.value})} required />
                        <Input label="E-mail" type="email" value={userForm.email || ''} onChange={e => setUserForm({...userForm, email: e.target.value})} required />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-brand-blue uppercase">Cargo</label>
                                <select className="w-full h-11 border-2 rounded-lg px-3 bg-white font-bold" value={userForm.role || 'vistoriador'} onChange={e => setUserForm({...userForm, role: e.target.value as Role})}>
                                    <option value="admin">Administrador</option>
                                    <option value="financeiro">Financeiro</option>
                                    <option value="vistoriador">Vistoriador</option>
                                </select>
                            </div>
                            <Input label="Senha" type="password" value={userForm.password || ''} onChange={e => setUserForm({...userForm, password: e.target.value})} required={!userForm.id} />
                        </div>
                        <div className="flex gap-2 justify-end pt-4 border-t">
                            <Button variant="outline" type="button" onClick={() => setEditingUser(null)} className="h-11 px-6">Cancelar</Button>
                            <Button type="submit" className="h-11 px-8 font-black uppercase text-[10px] tracking-widest">Salvar Acesso</Button>
                        </div>
                    </form>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {users.map(u => (
                            <div key={u.id} className="p-5 border-2 border-gray-50 rounded-2xl hover:border-brand-blue transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue font-black uppercase">{u.name.charAt(0)}</div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => {setEditingUser(u); setUserForm(u);}} className="p-2 text-brand-blue hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={14}/></button>
                                        <button onClick={() => onDeleteUser(u.id)} className="p-2 text-brand-red hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                                <p className="font-black text-gray-800 leading-tight">{u.name}</p>
                                <p className="text-xs text-gray-400 font-medium mb-3">{u.email}</p>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-red-100 text-brand-red' : 'bg-blue-100 text-brand-blue'}`}>
                                    {getRoleLabel(u.role)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* ABA PARCEIROS */}
        {activeTab === 'indications' && !isVistoriador && (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-gray-800 tracking-tight">Parceiros e Indicações</h2>
                <div className="flex gap-2">
                    {!editingIndication && (
                        <>
                            <div className="relative">
                                <Button onClick={() => setIsExporting(!isExporting)} variant="outline" className="h-10 text-[10px] uppercase font-black border-gray-200 bg-white">
                                    <Download size={14} className="mr-1"/> Exportar
                                </Button>
                                {isExporting && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                                        <button onClick={() => { exportExcel('indications'); setIsExporting(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors text-left">
                                            <FileSpreadsheet className="text-green-600" size={16} /> Excel (.xlsx)
                                        </button>
                                        <button onClick={() => { exportPDF('indications'); setIsExporting(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors border-t border-gray-50 text-left">
                                            <FileType className="text-red-600" size={16} /> PDF (.pdf)
                                        </button>
                                    </div>
                                )}
                            </div>
                            {isAdmin && <Button onClick={() => {setEditingIndication({} as any); setIndicationForm({ customPrices: {} });}} className="h-10 text-[10px] uppercase tracking-widest font-black"><Plus size={16} className="mr-1"/> Novo Parceiro</Button>}
                        </>
                    )}
                </div>
             </div>

             {editingIndication ? (
                <form onSubmit={handleSaveIndicationLocal} className="bg-gray-50 p-6 md:p-8 rounded-2xl border space-y-8 max-w-4xl animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                        <Building2 className="text-brand-blue" size={20}/>
                        <h3 className="text-sm font-black uppercase text-brand-blue tracking-widest">{indicationForm.id ? 'Editar Parceiro' : 'Cadastrar Novo Parceiro'}</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <Input label="Nome do Parceiro / Razão Social" value={indicationForm.name || ''} onChange={e => setIndicationForm({...indicationForm, name: e.target.value})} required />
                        <Input label="CPF ou CNPJ" value={indicationForm.document || ''} onChange={e => setIndicationForm({...indicationForm, document: maskCPFCNPJ(e.target.value)})} required />
                        <Input label="Telefone / WhatsApp" value={indicationForm.phone || ''} onChange={e => setIndicationForm({...indicationForm, phone: maskPhone(e.target.value)})} required />
                        <Input label="E-mail de Contato" type="email" value={indicationForm.email || ''} onChange={e => setIndicationForm({...indicationForm, email: e.target.value})} />
                    </div>

                    <div className="pt-4 border-t space-y-4">
                        <div className="flex items-center gap-2">
                            <MapPin className="text-gray-400" size={16}/>
                            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Endereço (Opcional)</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="relative">
                                <Input label="CEP" value={indicationForm.cep || ''} onChange={handleIndicationCEPChange} className="pr-10" />
                                {loadingCEP && <Loader2 className="absolute right-3 top-9 animate-spin text-brand-blue" size={16} />}
                            </div>
                            <div className="md:col-span-2">
                                <Input label="Logradouro" value={indicationForm.address || ''} onChange={e => setIndicationForm({...indicationForm, address: e.target.value})} />
                            </div>
                            <Input label="Número" value={indicationForm.number || ''} onChange={e => setIndicationForm({...indicationForm, number: e.target.value})} />
                            <Input label="Bairro" value={indicationForm.neighborhood || ''} onChange={e => setIndicationForm({...indicationForm, neighborhood: e.target.value})} />
                        </div>
                    </div>

                    {/* SEÇÃO DE PREÇOS PERSONALIZADOS */}
                    <div className="pt-8 border-t space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-yellow/20 rounded-lg text-brand-blue">
                                    <Settings2 size={20}/>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase text-brand-blue tracking-widest">Tabela de Preços Personalizada</h4>
                                    <p className="text-[10px] text-gray-500 font-medium">Deixe em branco para usar o preço padrão do sistema.</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {services.map(service => (
                                <div key={service.id} className="bg-white p-4 rounded-xl border-2 border-gray-100 flex items-center justify-between gap-4 hover:border-brand-blue/30 transition-all">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-gray-700 truncate">{service.name}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">Padrão: {formatCurrency(service.price)}</p>
                                    </div>
                                    <div className="w-32 relative">
                                        <span className="absolute left-2 top-2.5 text-[10px] font-black text-brand-blue">R$</span>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            placeholder="Base"
                                            className="w-full pl-6 pr-2 py-2 bg-gray-50 rounded-lg text-xs font-black text-brand-blue border border-transparent focus:border-brand-blue focus:bg-white outline-none"
                                            value={indicationForm.customPrices?.[service.id] || ''}
                                            onChange={(e) => updateCustomPrice(service.id, e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-6 border-t">
                        <Button variant="outline" type="button" onClick={() => setEditingIndication(null)} className="h-11 px-6">Cancelar</Button>
                        <Button type="submit" className="h-11 px-8 font-black uppercase text-[10px] tracking-widest">Salvar Parceiro</Button>
                    </div>
                </form>
             ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {indications.map(ind => (
                        <div key={ind.id} className="p-5 border-2 border-gray-50 rounded-2xl hover:border-brand-blue transition-all group bg-white">
                            <div className="flex justify-between items-start mb-3">
                                <div className="p-3 bg-blue-50 text-brand-blue rounded-xl">
                                    <Building2 size={20} />
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => {setEditingIndication(ind); setIndicationForm(ind);}} className="p-2 text-brand-blue hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={14}/></button>
                                    {isAdmin && <button onClick={() => onDeleteIndication(ind.id)} className="p-2 text-brand-red hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button>}
                                </div>
                            </div>
                            <p className="font-black text-gray-800 leading-tight mb-1">{ind.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-3">{ind.document}</p>
                            
                            <div className="space-y-1.5 border-t pt-3 mb-3">
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Phone size={12}/>
                                    <span className="text-xs font-medium">{ind.phone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Mail size={12}/>
                                    <span className="text-xs font-medium truncate">{ind.email || 'Não informado'}</span>
                                </div>
                            </div>

                            {/* INDICADOR DE PREÇOS CUSTOMIZADOS */}
                            {ind.customPrices && Object.keys(ind.customPrices).length > 0 && (
                                <div className="flex items-center gap-1.5 bg-brand-yellow/10 px-2 py-1 rounded border border-brand-yellow/20 w-fit">
                                    <Info size={10} className="text-brand-blue"/>
                                    <span className="text-[9px] font-black text-brand-blue uppercase tracking-tight">Preços Diferenciados ({Object.keys(ind.customPrices).length})</span>
                                </div>
                            )}
                        </div>
                    ))}
                    {indications.length === 0 && <div className="col-span-full py-12 text-center text-gray-400 font-bold uppercase text-xs">Nenhum parceiro cadastrado.</div>}
                </div>
             )}
          </div>
        )}

        {/* ABA SERVIÇOS */}
        {activeTab === 'services' && !isVistoriador && (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-gray-800 tracking-tight">Catálogo de Serviços</h2>
                <div className="flex gap-2">
                    {!editingService && (
                        <>
                            <div className="relative">
                                <Button onClick={() => setIsExporting(!isExporting)} variant="outline" className="h-10 text-[10px] uppercase font-black border-gray-200 bg-white">
                                    <Download size={14} className="mr-1"/> Exportar
                                </Button>
                                {isExporting && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                                        <button onClick={() => { exportExcel('services'); setIsExporting(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors text-left">
                                            <FileSpreadsheet className="text-green-600" size={16} /> Excel (.xlsx)
                                        </button>
                                        <button onClick={() => { exportPDF('services'); setIsExporting(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors border-t border-gray-50 text-left">
                                            <FileType className="text-red-600" size={16} /> PDF (.pdf)
                                        </button>
                                    </div>
                                )}
                            </div>
                            {isAdmin && <Button onClick={() => {setEditingService({} as any); setServiceForm({price: 0});}} className="h-10 text-[10px] uppercase tracking-widest font-black"><Plus size={16} className="mr-1"/> Novo Serviço</Button>}
                        </>
                    )}
                </div>
             </div>

             {editingService ? (
                <form onSubmit={handleSaveServiceLocal} className="bg-gray-50 p-6 md:p-8 rounded-2xl border space-y-6 max-w-2xl animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                        <Tag className="text-brand-blue" size={20}/>
                        <h3 className="text-sm font-black uppercase text-brand-blue tracking-widest">{serviceForm.id ? 'Editar Serviço' : 'Cadastrar Novo Serviço'}</h3>
                    </div>

                    <Input label="Nome do Serviço" value={serviceForm.name || ''} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} required />
                    
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-brand-blue uppercase">Preço Base (R$)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3.5 text-gray-400 font-bold text-sm">R$</span>
                            <input 
                                type="number" 
                                step="0.01"
                                className="w-full h-12 border-2 rounded-xl pl-10 pr-4 font-black text-brand-blue outline-none focus:ring-2 focus:ring-brand-blue bg-white" 
                                value={serviceForm.price || 0} 
                                onChange={e => setServiceForm({...serviceForm, price: parseFloat(e.target.value) || 0})} 
                                required 
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-brand-blue uppercase">Descrição do Serviço</label>
                        <textarea 
                            className="w-full h-24 border-2 rounded-xl p-4 font-medium outline-none focus:ring-2 focus:ring-brand-blue bg-white resize-none" 
                            value={serviceForm.description || ''} 
                            onChange={e => setServiceForm({...serviceForm, description: e.target.value})}
                        />
                    </div>

                    <div className="flex gap-2 justify-end pt-6 border-t">
                        <Button variant="outline" type="button" onClick={() => setEditingService(null)} className="h-11 px-6">Cancelar</Button>
                        <Button type="submit" className="h-11 px-8 font-black uppercase text-[10px] tracking-widest">Salvar Serviço</Button>
                    </div>
                </form>
             ) : (
                <div className="space-y-3">
                    {services.map(s => (
                        <div key={s.id} className="p-5 bg-white border border-gray-100 rounded-2xl hover:border-brand-blue transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-brand-bg rounded-xl text-brand-blue">
                                    <ClipboardList size={20} />
                                </div>
                                <div>
                                    <p className="font-black text-gray-800 leading-tight">{s.name}</p>
                                    <p className="text-xs text-gray-400 font-medium">{s.description || 'Sem descrição'}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0">
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-0.5">Preço Sugerido</p>
                                    <p className="text-lg font-black text-brand-blue">{formatCurrency(s.price)}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => {setEditingService(s); setServiceForm(s);}} className="p-2 text-brand-blue hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16}/></button>
                                    {isAdmin && <button onClick={() => onDeleteService(s.id)} className="p-2 text-brand-red hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>}
                                </div>
                            </div>
                        </div>
                    ))}
                    {services.length === 0 && <div className="py-12 text-center text-gray-400 font-bold uppercase text-xs">Nenhum serviço cadastrado.</div>}
                </div>
             )}
          </div>
        )}

        {/* ABA MEU PERFIL */}
        {activeTab === 'profile' && (
            <div className="max-w-md space-y-6 animate-fade-in">
                <h2 className="text-xl font-black text-gray-800 tracking-tight">Meus Dados</h2>
                <div className="p-6 bg-brand-blue rounded-2xl text-white shadow-xl shadow-blue-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Nome de Usuário</p>
                        <p className="text-lg font-bold mb-4">{currentUser?.name}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">E-mail Corporativo</p>
                        <p className="text-lg font-bold mb-4">{currentUser?.email}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Nível de Acesso</p>
                        <p className="text-lg font-bold flex items-center gap-2">
                            <Shield size={18}/> {getRoleLabel(currentUser?.role)}
                        </p>
                    </div>
                </div>
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 flex gap-4 items-start">
                    <div className="bg-white p-2 rounded-lg text-brand-blue shadow-sm">
                        <FileText size={20}/>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-brand-blue tracking-widest mb-1">Informação de Segurança</p>
                        <p className="text-xs text-gray-500 font-medium leading-relaxed italic">Sua função permite acesso exclusivo às ferramentas da Prevencar. Mantenha suas credenciais em sigilo conforme as normas de auditoria eletrônica.</p>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
