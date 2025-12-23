
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { ViewState, Inspection, User, Role, Indication, ServiceItem, MonthlyClosure, SystemLog, PaymentMethod } from './types';
import { Layout } from './components/Layout';
import { Login } from './views/Login';
import { ForgotPassword } from './views/ForgotPassword';
import { Home } from './views/Home';
import { InspectionList } from './views/InspectionList';
import { InspectionForm } from './views/InspectionForm';
import { Management } from './views/Management';
import { Reports } from './views/Reports';

const INITIAL_USERS: User[] = [
    { id: '1', name: 'Admin Principal', email: 'admin@prevencar.com.br', role: 'admin' }
];

const INITIAL_INDICATIONS: Indication[] = [];

const INITIAL_SERVICES: ServiceItem[] = [
    { id: '1', name: 'Laudo de Transferência', price: 100.00, description: 'Laudo obrigatório para transferência.', allowManualClientEdit: true },
    { id: '2', name: 'Laudo Cautelar', price: 250.00, description: 'Análise completa da estrutura.', allowManualClientEdit: true },
    { id: '3', name: 'Laudo de Revistoria', price: 80.00, description: 'Reavaliação de itens apontados em laudo anterior.', allowManualClientEdit: true },
    { id: '4', name: 'Vistoria Prévia', price: 150.00, description: 'Para seguradoras.', allowManualClientEdit: false },
    { id: '5', name: 'Pesquisa', price: 50.00, description: 'Pesquisa de débitos e restrições.', allowManualClientEdit: false },
    { id: '6', name: 'Prevenscan', price: 300.00, description: 'Scanner completo.', allowManualClientEdit: false }
];

const TODAY = new Date().toISOString().split('T')[0];
const CURRENT_MONTH = TODAY.substring(0, 7);

const DEMO_INSPECTIONS: Inspection[] = [];

function useFirestoreCollection<T>(collectionName: string, initialData: T[] = []) {
  const [data, setData] = useState<T[]>(initialData);
  
  useEffect(() => {
    const q = query(collection(db, collectionName));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => doc.data() as T);
      setData(items.length > 0 ? items : initialData);
    });
    return () => unsubscribe();
  }, [collectionName]);

  return data;
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.LOGIN);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  
  const inspections = useFirestoreCollection<Inspection>('inspections', DEMO_INSPECTIONS);
  const users = useFirestoreCollection<User>('users', INITIAL_USERS);
  const indications = useFirestoreCollection<Indication>('indications', INITIAL_INDICATIONS);
  const services = useFirestoreCollection<ServiceItem>('services', INITIAL_SERVICES);
  const monthlyClosures = useFirestoreCollection<MonthlyClosure>('closures', []);
  const logs = useFirestoreCollection<SystemLog>('logs', []);

  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [initialFormStep, setInitialFormStep] = useState<number>(1);
  const [isViewOnly, setIsViewOnly] = useState<boolean>(false);

  const currentUser = users.find(u => u.id === currentUserId);

  useEffect(() => {
    const savedUser = localStorage.getItem('prevencar_remembered_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUserId(user.id);
      setCurrentView(ViewState.HOME);
    }
  }, []);

  const addLog = async (type: SystemLog['type'], description: string, details?: string) => {
      const newLog: SystemLog = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
          userId: currentUser?.id || 'anonymous',
          userName: currentUser?.name || 'Sistema',
          type,
          description,
          details
      };
      await setDoc(doc(db, 'logs', newLog.id), newLog);
  };

  const isMonthClosed = (mes?: string) => {
    if (!mes) return false;
    return monthlyClosures.some(c => c.mes === mes && c.fechado);
  };

  const handleLogin = (email: string, rememberMe: boolean) => {
    const existingUser = users.find(u => u.email === email);
    if (!existingUser) {
        alert("Usuário não cadastrado.");
        return;
    }

    setCurrentUserId(existingUser.id);
    addLog('operacional', `Usuário ${existingUser.name} realizou login.`);
    if (rememberMe) {
      localStorage.setItem('prevencar_remembered_user', JSON.stringify(existingUser));
    }
    setCurrentView(ViewState.HOME);
  };

  const handleLogout = () => {
    addLog('operacional', `Usuário ${currentUser?.name} realizou logout.`);
    setCurrentUserId(undefined);
    localStorage.removeItem('prevencar_remembered_user');
    setCurrentView(ViewState.LOGIN);
  };

  const handleStartNewInspection = () => {
    setEditingInspection(null);
    setInitialFormStep(1);
    setIsViewOnly(false);
    setCurrentView(ViewState.INSPECTION_FORM);
  };

  const handleEditInspection = (inspection: Inspection, step: number = 1) => {
    setEditingInspection(inspection);
    setInitialFormStep(step);
    setIsViewOnly(false);
    setCurrentView(ViewState.INSPECTION_FORM);
  };

  const handleViewInspection = (inspection: Inspection) => {
    setEditingInspection(inspection);
    setInitialFormStep(1);
    setIsViewOnly(true);
    setCurrentView(ViewState.INSPECTION_FORM);
  };

  const handleSaveInspection = async (newInspection: Inspection) => {
    if (isMonthClosed(newInspection.mes_referencia)) {
        addLog('seguranca', `Tentativa de salvar ficha em mês fechado (${newInspection.mes_referencia})`, `ID Ficha: ${newInspection.id}`);
        alert("Erro de Segurança: O período está fechado.");
        return;
    }

    if (newInspection.status_pagamento === 'Pago' && newInspection.status_ficha === 'Incompleta') {
        addLog('seguranca', `Tentativa de registrar pagamento em ficha incompleta`, `Placa: ${newInspection.licensePlate}`);
        alert("Erro de Segurança: Ficha incompleta não permite faturamento.");
        return;
    }

    await setDoc(doc(db, 'inspections', newInspection.id), newInspection);
    setIsViewOnly(false);
    setCurrentView(ViewState.INSPECTION_LIST);
  };

  const handleBulkUpdateInspections = async (data: { ids: string[], updates: Partial<Inspection> }) => {
    const now = new Date().toISOString().split('T')[0];
    const targetInspections = inspections.filter(i => data.ids.includes(i.id));
    
    const hasClosedMonth = targetInspections.some(i => isMonthClosed(i.mes_referencia));
    if (hasClosedMonth) {
        alert("Acesso negado: Período encerrado.");
        return;
    }

    const batch = writeBatch(db);
    targetInspections.forEach(i => {
        if (data.ids.includes(i.id)) { // Redundant check but safe
            const updated = { ...i, ...data.updates };
            // Se o status geral for Concluída, marcar como pago
            if (data.updates.status === 'Concluída') {
                updated.status_pagamento = 'Pago';
                updated.data_pagamento = now;
            }
            // Se estiver atualizando a forma de pagamento em lote para algo que não seja "A Pagar"
            if (data.updates.paymentMethod && data.updates.paymentMethod !== PaymentMethod.A_PAGAR) {
                updated.status_pagamento = 'Pago';
                updated.data_pagamento = now;
            }
            batch.set(doc(db, 'inspections', i.id), updated);
        }
    });
    
    await batch.commit();
    addLog('financeiro', `Atualização em lote realizada para ${data.ids.length} fichas.`, `Fichas: ${data.ids.join(', ')}`);
  };

  const processMonthlyClosure = async (mes: string) => {
      if (currentUser?.role !== 'admin' && currentUser?.role !== 'financeiro') {
          alert("Acesso Negado.");
          return;
      }

      const monthInspections = inspections.filter(i => i.mes_referencia === mes);
      const totalValor = monthInspections.reduce((acc, curr) => acc + (curr.totalValue || 0), 0);

      const newClosure: MonthlyClosure = {
          id: Math.random().toString(36).substr(2, 9),
          mes: mes,
          fechado: true,
          data_fechamento: new Date().toISOString().split('T')[0],
          usuario_fechou: currentUser.name,
          total_valor: totalValor
      };

      await setDoc(doc(db, 'closures', newClosure.id), newClosure);
      return { success: true, message: `Mês ${mes} fechado.` };
  };

  const handleSaveUser = async (user: User) => {
      const userId = user.id || Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'users', userId), { ...user, id: userId });
  };

  const onDeleteUser = async (id: string) => {
      await deleteDoc(doc(db, 'users', id));
  };

  const handleSaveIndication = async (ind: Indication) => {
      await setDoc(doc(db, 'indications', ind.id), ind);
  };

  const handleSaveService = async (service: ServiceItem) => {
      await setDoc(doc(db, 'services', service.id), service);
  };

  const onDeleteService = async (id: string) => {
      await deleteDoc(doc(db, 'services', id));
  };

  const renderView = () => {
    switch (currentView) {
      case ViewState.LOGIN:
        return <Login onLogin={handleLogin} changeView={setCurrentView} />;
      case ViewState.FORGOT_PASSWORD:
        return <ForgotPassword changeView={setCurrentView} users={users} onResetPassword={async (e, n) => {
            const user = users.find(u => u.email === e);
            if (user) {
                await handleSaveUser({ ...user, password: n });
                await addLog('seguranca', `Senha alterada para o usuário ${user.name || user.email}`);
                alert('Senha alterada com sucesso! Por favor, faça login com a nova senha.');
                setCurrentView(ViewState.LOGIN);
            } else {
                alert('Email não encontrado no sistema.');
            }
        }} />;
      case ViewState.HOME:
        return (
          <Layout currentView={currentView} changeView={setCurrentView} logout={handleLogout} currentUser={currentUser}>
            <Home changeView={setCurrentView} startNewInspection={handleStartNewInspection} currentUser={currentUser} inspections={inspections} />
          </Layout>
        );
      case ViewState.INSPECTION_LIST:
        return (
          <Layout currentView={currentView} changeView={setCurrentView} logout={handleLogout} currentUser={currentUser}>
            <InspectionList 
              inspections={inspections} 
              onEdit={handleEditInspection} 
              onView={handleViewInspection}
              onDelete={async (id) => {
                  const ins = inspections.find(x => x.id === id);
                  if (isMonthClosed(ins?.mes_referencia)) return;
                  await deleteDoc(doc(db, 'inspections', id));
              }} 
              onBulkUpdate={handleBulkUpdateInspections} 
              changeView={setCurrentView} 
              onCreate={handleStartNewInspection} 
              currentUser={currentUser}
              indications={indications}
              services={services}
              closures={monthlyClosures}
            />
          </Layout>
        );
      case ViewState.INSPECTION_FORM:
        return (
          <Layout currentView={currentView} changeView={setCurrentView} logout={handleLogout} currentUser={currentUser}>
            <InspectionForm 
                inspectionToEdit={editingInspection} 
                onSave={handleSaveInspection} 
                onCancel={() => {
                    setIsViewOnly(false);
                    setCurrentView(ViewState.INSPECTION_LIST);
                }} 
                onDelete={async (id) => {
                    const ins = inspections.find(x => x.id === id);
                    if (isMonthClosed(ins?.mes_referencia)) return;
                    await deleteDoc(doc(db, 'inspections', id));
                }} 
                currentUser={currentUser} 
                indications={indications} 
                services={services} 
                closures={monthlyClosures} 
                initialStep={initialFormStep}
                readOnly={isViewOnly}
            />
          </Layout>
        );
      case ViewState.REPORTS:
        return (
          <Layout currentView={currentView} changeView={setCurrentView} logout={handleLogout} currentUser={currentUser}>
            <Reports inspections={inspections} indications={indications} currentUser={currentUser} />
          </Layout>
        );
      case ViewState.MANAGEMENT:
        return (
          <Layout currentView={currentView} changeView={setCurrentView} logout={handleLogout} currentUser={currentUser}>
            <Management 
                currentUser={currentUser} 
                users={users} 
                indications={indications} 
                services={services} 
                closures={monthlyClosures} 
                inspections={inspections}
                logs={logs}
                onSaveUser={handleSaveUser} 
                onDeleteUser={onDeleteUser} 
                onSaveIndication={handleSaveIndication} 
                onDeleteIndication={async (id) => await deleteDoc(doc(db, 'indications', id))} 
                onSaveService={handleSaveService} 
                onDeleteService={onDeleteService} 
                onProcessClosure={processMonthlyClosure} 
            />
          </Layout>
        );
      default:
        return <Login onLogin={handleLogin} changeView={setCurrentView} />;
    }
  };

  return <>{renderView()}</>;
};

export default App;
