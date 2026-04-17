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
}
