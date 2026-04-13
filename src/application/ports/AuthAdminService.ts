export interface AuthAdminService {
  deleteUser(userId: string): Promise<void>;
}
