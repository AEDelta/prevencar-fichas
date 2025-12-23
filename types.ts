
export enum ViewState {
  LOGIN = 'LOGIN',
  FORGOT_PASSWORD = 'FORGOT_PASSWORD',
  HOME = 'HOME',
  INSPECTION_LIST = 'INSPECTION_LIST',
  INSPECTION_FORM = 'INSPECTION_FORM',
  MANAGEMENT = 'MANAGEMENT',
  REPORTS = 'REPORTS'
}

export type Role = 'admin' | 'financeiro' | 'vistoriador';

export enum PaymentMethod {
  CREDITO = 'Crédito',
  DEBITO = 'Débito',
  DINHEIRO = 'Dinheiro',
  PIX = 'Pix',
  A_PAGAR = 'A Pagar'
}

export interface Client {
  name: string;
  cpf: string;
  phone: string; 
  address: string;
  cep: string;
  neighborhood?: string; // Bairro
  number: string;
  complement?: string;
}

export interface Inspection {
  id: string;
  date: string; // ISO String
  vehicleModel: string;
  licensePlate: string;
  selectedServices: string[];
  servicePriceOverrides?: Record<string, number>; // Nome do Serviço -> Preço final na ficha
  otherServiceDescription?: string; // Descrição de serviço extra
  otherServicePrice?: number; // Valor de serviço extra
  client: Client;
  inspector?: string; 
  indicationId?: string; 
  indicationName?: string;
  observations?: string;
  paymentMethod?: PaymentMethod;
  nfe?: string;
  totalValue: number;
  mes_referencia: string; // AAAA-MM
  status_ficha: 'Incompleta' | 'Completa';
  status_pagamento: 'A pagar' | 'Pago';
  data_pagamento?: string;
  status: 'Iniciada' | 'No Caixa' | 'Concluída';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  password?: string;
}

export interface Indication {
  id: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  address?: string;
  cep?: string;
  neighborhood?: string; // Bairro
  number?: string;
  customPrices?: Record<string, number>; // ID do Serviço -> Preço customizado
}

export interface ServiceItem {
  id: string;
  name: string;
  price: number;
  description: string;
  allowManualClientEdit?: boolean;
}

export interface MonthlyClosure {
  id: string;
  mes: string; // AAAA-MM
  fechado: boolean;
  data_fechamento: string;
  usuario_fechou: string;
  total_valor: number;
}

export interface SystemLog {
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    type: 'financeiro' | 'seguranca' | 'gerencial' | 'operacional';
    description: string;
    details?: string;
}

export interface NavProps {
  currentView: ViewState;
  changeView: (view: ViewState) => void;
  logout: () => void;
  currentUser?: User;
}
