export interface IPIIEncryptor {
  encrypt(value: string): string;
  decrypt(value: string): string;
}
