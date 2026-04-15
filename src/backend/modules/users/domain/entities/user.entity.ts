export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly mail: string,
    public readonly hashedPassword: string,
    public readonly roles: string[],
    public readonly isActive: boolean,
    public readonly userType: string,
    public readonly documentTypeId: string,
    public readonly documentNumber: string, // encrypted
    public readonly phoneNumber: string,    // encrypted
  ) {}
}
