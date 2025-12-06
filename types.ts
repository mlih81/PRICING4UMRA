export enum RoomType {
  SINGLE = 'Single',
  DOUBLE = 'Double',
  TRIPLE = 'Triple',
  QUAD = 'Quadruple'
}

export type Language = 'en' | 'fr' | 'ar';

export interface RoomConfig {
  id: string; // Unique ID for UI rendering
  type: RoomType;
  count: number; // Number of rooms of this specific configuration
  paxPerRoom: number; // 1, 2, 3, 4

  // Madinah - Specific to this room config
  hasMadinah: boolean;
  madinahHotel: string;
  madinahNights: number;
  madinahPricePerPersonSAR: number; // User input: Price per person per night

  // Makkah - Specific to this room config
  hasMakkah: boolean;
  makkahHotel: string;
  makkahNights: number;
  makkahPricePerPersonSAR: number; // User input: Price per person per night
}

export interface ServiceItem {
  id: string;
  description: string;
  priceSAR: number;
}

export interface Quotation {
  id: string;
  reference: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  paxCount: number;
  createdAt: string;
  status: 'Draft' | 'Confirmed';
  language: Language; // Stored language preference for this quote
  
  // Settings snapshot
  exchangeRate: number; // SAR to MAD
  
  // Configuration
  rooms: RoomConfig[];
  
  // Flight (Global)
  hasFlight: boolean;
  airline?: string;
  flightDateOut?: string;
  flightDateRet?: string;
  flightPriceMAD: number; // Per person

  // Other Services (Global)
  hasTransfer: boolean;
  transferPriceSAR: number; // Per person
  transferDetails?: string; // Optional details for transfer
  
  hasVisa: boolean;
  visaPriceSAR: number; // Per person
  
  // Extra Services Configuration (Booleans for Description)
  hasMazarat: boolean;
  hasFaqih: boolean;
  
  otherServices: ServiceItem[];

  // Financials (ALL PER PERSON)
  extraServicesMADPerPerson: number; // Input for Mazarat+Faqih combined
  commissionMADPerPerson: number;    // Input for Agent Commission
  agencyMarginMADPerPerson: number;  // Input for Agency Margin
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Agent' | 'Admin';
  logoUrl?: string;
  password?: string;
}

export interface AppState {
  user: User | null;
  quotations: Quotation[];
  exchangeRate: number;
  agencyLogo: string | null;
  language: Language;
}