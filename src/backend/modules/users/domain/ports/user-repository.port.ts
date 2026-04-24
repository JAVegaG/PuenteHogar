import { UserEntity } from '@modules/users/domain/entities/user.entity';

export interface CreateUserData {
  mail: string;
  hashedPassword: string;
  userType: string;
  documentTypeId: string;
  documentNumber: string; // already encrypted
  phoneNumber: string;    // already encrypted
  roleId: string;
  personType: 'natural' | 'legal';
  naturalDetails?: {
    firstName: string;
    lastName: string;
    preferredName?: string;
  };
  legalDetails?: {
    businessName: string;
  };
}

export interface IUserRepository {
  findByMail(mail: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  findDisplayName(userId: string): Promise<string | null>;
  create(data: CreateUserData): Promise<UserEntity>;
  findRoleByName(name: string): Promise<{ id: string; name: string } | null>;
  findDocumentTypeByCode(code: string): Promise<{ id: string; code: string } | null>;
  findAllDocumentTypes(): Promise<{ id: string; code: string; description: string }[]>;

  // Role management methods
  addRoleToUser(userId: string, roleId: string, autoAssigned: boolean): Promise<void>;
  removeRoleFromUser(userId: string, roleId: string): Promise<void>;
  updateUserType(userId: string, userType: string): Promise<void>;
  findUserRoles(userId: string): Promise<{ id: string; name: string; autoAssigned: boolean }[]>;
  findUserRoleRecord(userId: string, roleName: string): Promise<{ id: string; roleId: string; autoAssigned: boolean } | null>;
  hasActiveLeases(userId: string): Promise<boolean>;
  hasActiveContractsAsRole(userId: string, role: string): Promise<boolean>;
  hasPendingPayments(userId: string): Promise<boolean>;
  hasPortfoliosWithUnits(userId: string): Promise<boolean>;
  hasActiveLeasesInPortfolios(userId: string): Promise<boolean>;
  countUserRoles(userId: string): Promise<number>;
}
