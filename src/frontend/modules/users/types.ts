export interface AuthUser {
  userId: string;
  displayName: string;
  roles: string[];
  accessToken: string;
}

export interface LoginRequest {
  mail: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  userId: string;
  displayName: string;
  roles: string[];
}

export interface NaturalDetails {
  firstName: string;
  lastName: string;
  preferredName?: string;
}

export interface LegalDetails {
  businessName: string;
}

export interface RegisterRequest {
  fullName: string;
  userType: 'LANDLORD' | 'TENANT';
  documentTypeCode: string;
  documentNumber: string;
  mail: string;
  phoneNumber: string;
  password: string;
  role: 'LANDLORD' | 'TENANT';
  personType: 'natural' | 'legal';
  naturalDetails?: NaturalDetails;
  legalDetails?: LegalDetails;
}

export interface UserProfile {
  id: string;
  mail: string;
  displayName: string;
  roles: string[];
  isActive: boolean;
}

export interface DocumentType {
  id: string;
  code: string;
  description: string;
}

export interface RegistrationFormData {
  // Paso 1
  userType: 'LANDLORD' | 'TENANT' | '';
  personType: 'natural' | 'legal' | '';
  // Paso 2 - Persona Natural
  firstName: string;
  lastName: string;
  preferredName: string;
  // Paso 2 - Persona Jurídica
  businessName: string;
  // Paso 2 - Comunes
  documentTypeCode: string;
  documentNumber: string;
  phoneNumber: string;
  // Paso 3
  mail: string;
  password: string;
  confirmPassword: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, userId: string, displayName: string, roles: string[]) => void;
  logout: () => void;
}
